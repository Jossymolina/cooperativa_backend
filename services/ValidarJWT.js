const jwt = require('jsonwebtoken');

const validarJWT = (req, res, next) => {

    try {

        const token = req.header('x-token');

        if(!token){

            return res.status(401).json({
                ok:false,
                msg:'Token requerido'
            });
        }

        const payload = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.usuario = payload;

        next();

    } catch (error) {

        return res.status(401).json({
            ok:false,
            msg:'Token inválido'
        });
    }
};

module.exports = validarJWT;