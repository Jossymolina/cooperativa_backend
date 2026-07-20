const pool = require('../Configuraciones/ConexionDb/db');

const validarPermiso = (
    modulo,
    accion
) => {

    return async (req, res, next) => {

        try {

            const idusuario = req.usuario.idusuario;

            // VALIDAR POR ROLES

            const [rows] = await pool.query(`
                SELECT rp.idrol_permiso

                FROM usuario_roles ur

                INNER JOIN roles_permisos rp
                    ON ur.idrol = rp.idrol

                INNER JOIN modulos m
                    ON rp.idmodulo = m.idmodulo

                INNER JOIN acciones a
                    ON rp.idaccion = a.idaccion

                WHERE ur.idusuario = ?
                AND m.codigo = ?
                AND a.codigo = ?
                AND rp.estado = 'ACTIVO'
                AND ur.estado = 'ACTIVO'
            `, [
                idusuario,
                modulo,
                accion
            ]);

            // VALIDAR PERMISO DIRECTO USUARIO

            const [permisosUsuario] = await pool.query(`
                SELECT up.idusuario_permiso

                FROM usuarios_permisos up

                INNER JOIN modulos m
                    ON up.idmodulo = m.idmodulo

                INNER JOIN acciones a
                    ON up.idaccion = a.idaccion

                WHERE up.idusuario = ?
                AND m.codigo = ?
                AND a.codigo = ?
                AND up.estado = 'ACTIVO'
            `, [
                idusuario,
                modulo,
                accion
            ]);

            // VALIDAR

            if(
                rows.length === 0 &&
                permisosUsuario.length === 0
            ){

                return res.status(200).json({
                    ok:false,
                    msg:'No tiene permisos'
                });
            }

            next();

        } catch (error) {

            return res.status(200).json({
                ok:false,
                msg:error.message
            });
        }
    };
};

module.exports = validarPermiso;