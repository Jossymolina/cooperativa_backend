const RolesPermisosService = require('../Services/RolesPermisosService');

const asignarPermiso = async (req, res) => {

    try {

        const respuesta = await RolesPermisosService.asignarPermiso(req.body);

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok:false,
            msg:error.message
        });
    }
};

const obtenerPermisosRol = async (req, res) => {

    try {

        const respuesta = await RolesPermisosService.obtenerPermisosRol(
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

const eliminarPermiso = async (req, res) => {

    try {

        const respuesta = await RolesPermisosService.eliminarPermiso(
            req.params.idrol_permiso
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
    asignarPermiso,
    obtenerPermisosRol,
    eliminarPermiso
};