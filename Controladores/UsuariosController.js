const UsuariosService = require('../Services/UsuariosService');

const crearUsuario = async (req, res) => {

    try {

        const respuesta = await UsuariosService.crearUsuario(req.body);

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok: false,
            msg: error.message
        });
    }
};

const obtenerUsuarios = async (req, res) => {

    try {

        const respuesta = await UsuariosService.obtenerUsuarios();

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok: false,
            msg: error.message
        });
    }
};


const obtenerUsuario = async (req, res) => {

    try {

        const respuesta = await UsuariosService.obtenerUsuario(
            req.params.idusuario
        );

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok: false,
            msg: error.message
        });
    }
};

const actualizarUsuario = async (req, res) => {

    try {

        const respuesta = await UsuariosService.actualizarUsuario(
            req.params.idusuario,
            req.body
        );

        res.json(respuesta);

    } catch (error) {


        res.status(500).json({
            ok: false,
            msg: error.message
        });
    }
};

const eliminarUsuario = async (req, res) => {

    try {

        const respuesta = await UsuariosService.eliminarUsuario(
            req.params.idusuario
        );

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok: false,
            msg: error.message
        });
    }
};

module.exports = {
    crearUsuario,
    obtenerUsuarios,
    obtenerUsuario,
    actualizarUsuario,
    eliminarUsuario
};