const RolesService = require('../Services/RolesService');

const crearRol = async (req, res) => {

    try {

        const respuesta = await RolesService.crearRol(req.body);

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok:false,
            msg:error.message
        });
    }
};

const obtenerRoles = async (req, res) => {

    try {

        const respuesta = await RolesService.obtenerRoles();

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok:false,
            msg:error.message
        });
    }
};

const obtenerRol = async (req, res) => {

    try {

        const respuesta = await RolesService.obtenerRol(
            req.params.idrol
        );

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok:false,
            msg:error.message
        });
    }
};

const actualizarRol = async (req, res) => {

    try {

        const respuesta = await RolesService.actualizarRol(
            req.params.idrol,
            req.body
        );

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok:false,
            msg:error.message
        });
    }
};

const eliminarRol = async (req, res) => {

    try {

        const respuesta = await RolesService.eliminarRol(
            req.params.idrol
        );

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok:false,
            msg:error.message
        });
    }
};

const asignarRolUsuario = async (req, res) => {

    try {

        const respuesta = await RolesService.asignarRolUsuario(req.body);

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok:false,
            msg:error.message
        });
    }
};

const obtenerRolesUsuario = async (req, res) => {

    try {

        const respuesta = await RolesService.obtenerRolesUsuario(
            req.params.idusuario
        );

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok:false,
            msg:error.message
        });
    }
};

const quitarRolUsuario = async (req, res) => {

    try {

        const respuesta = await RolesService.quitarRolUsuario(
            req.params.idusuario_rol
        );

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok:false,
            msg:error.message
        });
    }
};

module.exports = {
    crearRol,
    obtenerRoles,
    obtenerRol,
    actualizarRol,
    eliminarRol,
    asignarRolUsuario,
    obtenerRolesUsuario,
    quitarRolUsuario
};