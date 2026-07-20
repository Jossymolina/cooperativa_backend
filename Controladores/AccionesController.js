const AccionesService = require('../Services/AccionesService');

const crearAccion = async (req, res) => {

    try {

        const respuesta = await AccionesService.crearAccion(req.body);

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok:false,
            msg:error.message
        });
    }
};

const obtenerAcciones = async (req, res) => {

    try {

        const respuesta = await AccionesService.obtenerAcciones();

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok:false,
            msg:error.message
        });
    }
};

const obtenerAccion = async (req, res) => {

    try {

        const respuesta = await AccionesService.obtenerAccion(
            req.params.idaccion
        );

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok:false,
            msg:error.message
        });
    }
};

const actualizarAccion = async (req, res) => {

    try {

        const respuesta = await AccionesService.actualizarAccion(
            req.params.idaccion,
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

const eliminarAccion = async (req, res) => {

    try {

        const respuesta = await AccionesService.eliminarAccion(
            req.params.idaccion
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
    crearAccion,
    obtenerAcciones,
    obtenerAccion,
    actualizarAccion,
    eliminarAccion
};