const excel_servise = require('../services/excel_carga_Service');
const pool = require('../Configuraciones/ConexionDb/db');


exports.cargarPlanilla = async (req, res) => {
    try {
        const usuario = JSON.parse(req.body.usuario)
        const generales = JSON.parse(req.body.generales) ;
        const respuesta = await excel_servise.cargarPlanilla(
            req.file,
            usuario,
            generales
        );
         if(!respuesta.ok) return res.status(200).send({respuesta})
        res.json(respuesta);
    } catch (error) {
        res.status(200).json({
            ok: false,
            msg: error.message
        });

    }

};



exports.sacarPlanillaGuardada = async (req, res) => {

    let connection;

    try {
         connection = await pool.getConnection();
        const respuesta = await excel_servise.sacarPlanillaGuardada(
            connection,
            req.body.fecha
        );
        res.json({
            ok: true,
            data: respuesta
        });

    } catch (error) {
        res.status(200).json({
            ok: false,
            msg: error.message
        });

    } finally {
        if (connection) {
            connection.release();
        }

    }

};



exports.procesarplanillaCargado = async (req, res) => {
    try {
        const respuesta = await excel_servise.procesarPlanilla(
            req.body.idplanilla,
            req.body.idusuario
        );
        res.json({
            ok: true,
            data: respuesta
        });

    } catch (error) {
        res.status(200).json({
            ok: false,
            msg: error.message
        });

    } 

};
