const pool = require('../Configuraciones/ConexionDb/db');

const asignarTipo = async (body) => {

    const {
        idpersona,
        idtipo_persona
    } = body;

    const [existe] = await pool.query(`
        SELECT idpersona_tipo
        FROM personas_tipos
        WHERE idpersona = ?
        AND idtipo_persona = ?
        AND estado = 'ACTIVO'
    `, [
        idpersona,
        idtipo_persona
    ]);

    if(existe.length > 0){
        throw new Error('La persona ya tiene asignado este tipo');
    }
    const [result] = await pool.query(`
        INSERT INTO personas_tipos(
            idpersona,
            idtipo_persona
        )
        VALUES(?,?)
    `, [
        idpersona,
        idtipo_persona
    ]);

    return {
        ok: true,
        msg: 'Tipo asignado correctamente',
        idpersona_tipo: result.insertId
    };
};

const obtenerTiposPersona = async (idpersona) => {

    const [rows] = await pool.query(`
        SELECT
            pt.idpersona_tipo,
            tp.idtipo_persona,
            tp.codigo,
            tp.nombre_tipo
        FROM personas_tipos pt
        INNER JOIN tipos_persona tp
            ON pt.idtipo_persona = tp.idtipo_persona
        WHERE pt.idpersona = ?
        AND pt.estado = 'ACTIVO'
    `, [idpersona]);

    return {

        ok: true,
        data: rows
    };
};

const eliminarTipoPersona = async (idpersona_tipo) => {

    await pool.query(`
        UPDATE personas_tipos
        SET estado = 'INACTIVO'
        WHERE idpersona_tipo = ?
    `, [idpersona_tipo]);

    return {
        ok: true,
        msg: 'Tipo eliminado correctamente'
    };
};

module.exports = {
    asignarTipo,
    obtenerTiposPersona,
    eliminarTipoPersona
};