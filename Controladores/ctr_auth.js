const authService = require('../services/auth.service');
const login = async (req, res) => {

    try {
        console.log("entrando al login")

        const respuesta = await authService.login(
            req.body,
            req
        );

        res.json(respuesta);

    } catch (error) {

        res.status(200).json({
            ok:false,
            msg:error.message
        });
    }
};

const crearUsuario = async (req, res) => {

    try {
console.log("Creando usuario 11")
        const respuesta = await authService.crearUsuario(req.body);

        res.json(respuesta);

    } catch (error) {

        res.status(200).json({
            ok: false,
            msg: error.message
        });
    }
};

const sacarUsuariosDB = async (req, res) => {

    try {

        const respuesta = await authService.listarUsuarios();

        res.json(respuesta);

    } catch (error) {

        res.status(200).json({
            ok: false,
            msg: error.message
        });
    }
};

module.exports = {
    login,
    crearUsuario,
    sacarUsuariosDB
};