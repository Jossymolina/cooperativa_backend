const ModulosService = require('../Services/ModulosService');

const crearModulo = async (req, res) => {

    try {

        const respuesta = await ModulosService.crearModulo(req.body);

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok:false,
            msg:error.message
        });
    }
};

const obtenerModulos = async (req, res) => {

    try {

        const respuesta = await ModulosService.obtenerModulos();

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok:false,
            msg:error.message
        });
    }
};

const obtenerModulo = async (req, res) => {

    try {

        const respuesta = await ModulosService.obtenerModulo(
            req.params.idmodulo
        );

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok:false,
            msg:error.message
        });
    }
};

const actualizarModulo = async (req, res) => {

    try {

        const respuesta = await ModulosService.actualizarModulo(
            req.params.idmodulo,
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

const eliminarModulo = async (req, res) => {

    try {

        const respuesta = await ModulosService.eliminarModulo(
            req.params.idmodulo
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
    crearModulo,
    obtenerModulos,
    obtenerModulo,
    actualizarModulo,
    eliminarModulo
};