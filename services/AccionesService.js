const pool = require('../Configuraciones/ConexionDb/db');

const crearAccion = async (body) => {

    const {
        codigo,
        nombre_accion,
        descripcion
    } = body;

    // VALIDAR CODIGO

    const [codigoExiste] = await pool.query(`
        SELECT idaccion
        FROM acciones
        WHERE codigo = ?
    `, [codigo]);

    if(codigoExiste.length > 0){
        throw new Error('El código ya existe');
    }

    // VALIDAR NOMBRE

    const [nombreExiste] = await pool.query(`
        SELECT idaccion
        FROM acciones
        WHERE nombre_accion = ?
    `, [nombre_accion]);

    if(nombreExiste.length > 0){
        throw new Error('El nombre ya existe');
    }

    // INSERTAR

    const [result] = await pool.query(`
        INSERT INTO acciones(
            codigo,
            nombre_accion,
            descripcion
        )
        VALUES(?,?,?)
    `, [
        codigo,
        nombre_accion,
        descripcion
    ]);

    return {
        ok: true,
        msg: 'Acción creada correctamente',
        idaccion: result.insertId
    };
};

const obtenerAcciones = async () => {

    const [rows] = await pool.query(`
        SELECT *
        FROM acciones
        ORDER BY idaccion ASC
    `);

    return {
        ok: true,
        data: rows
    };
};

const obtenerAccion = async (idaccion) => {

    const [rows] = await pool.query(`
        SELECT *
        FROM acciones
        WHERE idaccion = ?
    `, [idaccion]);

    if(rows.length === 0){
        throw new Error('Acción no encontrada');
    }

    return {
        ok: true,
        data: rows[0]
    };
};

const actualizarAccion = async (idaccion, body) => {

    const {
        codigo,
        nombre_accion,
        descripcion,
        estado
    } = body;

    await pool.query(`
        UPDATE acciones
        SET
            codigo = ?,
            nombre_accion = ?,
            descripcion = ?,
            estado = ?
        WHERE idaccion = ?
    `, [
        codigo,
        nombre_accion,
        descripcion,
        estado,
        idaccion
    ]);

    return {
        ok: true,
        msg: 'Acción actualizada correctamente'
    };
};

const eliminarAccion = async (idaccion) => {

    await pool.query(`
        UPDATE acciones
        SET estado = 'INACTIVO'
        WHERE idaccion = ?
    `, [idaccion]);

    return {
        ok: true,
        msg: 'Acción eliminada correctamente'
    };
};

module.exports = {
    crearAccion,
    obtenerAcciones,
    obtenerAccion,
    actualizarAccion,
    eliminarAccion
};