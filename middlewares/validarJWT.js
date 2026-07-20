const jwt = require('jsonwebtoken');
const pool = require('../Configuraciones/ConexionDb/db');  

const validarJWT = async (req, res, next) => {

    try {

        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(200).json({
                ok: false,
                msg: 'No se envió el token.'
            });
        }

        if (!authHeader.startsWith('Bearer ')) {
            return res.status(200).json({
                ok: false,
                msg: 'Formato del token inválido.'
            });
        }

        const token = authHeader.split(' ')[1];

        let payload;

        try {
            payload = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            return res.status(200).json({
                ok: false,
                msg: 'Token inválido o expirado.'
            });
        }

        // Verificar que la sesión siga activa
        const [sesion] = await pool.query(`
            SELECT
                s.idsesion,
                s.idusuario,
                u.estado
            FROM sesiones s
            INNER JOIN usuarios u
                ON u.idusuario = s.idusuario
            WHERE s.token = ?
            LIMIT 1
        `, [token]);
 
        if (sesion.length === 0) {
            return res.status(200).json({
                ok: false,
                msg: 'Sesión no encontrada.'
            });
        }

        if (sesion[0].estado !== 'ACTIVO') {
            return res.status(200).json({
                ok: false,
                msg: 'Usuario inactivo.'
            });
        }

        req.usuario = {
            idusuario: payload.idusuario
        };

        req.token = token;

        next();

    } catch (error) {
        console.error(error);
        return res.status(200).json({
            ok: false,
            msg: 'Error al validar el token.'
        });
    }

};

module.exports = validarJWT;