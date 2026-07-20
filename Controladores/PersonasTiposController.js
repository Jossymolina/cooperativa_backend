const PersonasTiposService = require('../Services/PersonasTiposService');

const asignarTipo = async (req, res) => {

    try {

        const respuesta = await PersonasTiposService.asignarTipo(req.body);

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok: false,
            msg: error.message
        });
    }
};

const obtenerTiposPersona = async (req, res) => {

    try {

        const respuesta = await PersonasTiposService.obtenerTiposPersona(
            req.params.idpersona
        );

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok: false,
            msg: error.message
        });
    }
};


const eliminarTipoPersona = async (req, res) => {

    try {

        const respuesta = await PersonasTiposService.eliminarTipoPersona(
            req.params.idpersona_tipo
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
    asignarTipo,
    obtenerTiposPersona,
    eliminarTipoPersona
};