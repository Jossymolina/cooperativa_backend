const PersonasService = require('../Services/PersonasService');

const crearPersona = async (req, res) => {

    try {
console.log("creando persona")
        const respuesta = await PersonasService.crearPersona(req.body);

        res.json(respuesta);

    } catch (error) {

        res.status(200).json({
            ok: false,
            msg: error.message
        });
    }
};

const obtenerPersonas = async (req, res) => {

    try {

        const respuesta = await PersonasService.obtenerPersonas();

        res.json(respuesta);

    } catch (error) {

        res.status(500).json({
            ok: false,
            msg: error.message
        });
    }
};

const obtenerPersona = async (req, res) => {

    try {

        const respuesta = await PersonasService.obtenerPersona(
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

const actualizarPersona = async (req, res) => {

    try {

        const respuesta = await PersonasService.actualizarPersona(
            req.params.idpersona,
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


const eliminarPersona = async (req, res) => {

    try {

        const respuesta = await PersonasService.eliminarPersona(
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

const obtenerPersonaIdentidad = async (req, res) => {
console.log(req.body)
    try {
        const respuesta = await PersonasService.obtenerPersonaIdentidad(
            req.body.identidad
        );
        res.json(respuesta);
    } catch (error) {
        res.status(200).json({
            ok: false,
            msg: error.message
        });
    }
};


const sacar_tipos_persona = async (req, res) => {
    try {
        console.log("Entrando")
        const respuesta = await PersonasService.sacar_tipos_persona( );
        res.json(respuesta);
            } catch (error) {
        res.status(200).json({
            ok: false,
            msg: error.message
        });
    }
};



module.exports = {
    crearPersona,
    obtenerPersonas,
    obtenerPersona,
    actualizarPersona,
    eliminarPersona,
    obtenerPersonaIdentidad,
    sacar_tipos_persona
};