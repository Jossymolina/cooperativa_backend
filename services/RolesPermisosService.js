const pool = require('../Configuraciones/ConexionDb/db');

const asignarPermiso = async (body) => {

    const {
        idrol,
        idmodulo,
        idaccion
    } = body;

    // VALIDAR DUPLICADO

    const [existe] = await pool.query(`
        SELECT idrol_permiso
        FROM roles_permisos
        WHERE idrol = ?
        AND idmodulo = ?
        AND idaccion = ?
        AND estado = 'ACTIVO'
    `, [
        idrol,
        idmodulo,
        idaccion
    ]);

    if(existe.length > 0){
        throw new Error('El permiso ya existe');
    }

    // INSERTAR

    const [result] = await pool.query(`
        INSERT INTO roles_permisos(
            idrol,
            idmodulo,
            idaccion
        )
        VALUES(?,?,?)
    `, [
        idrol,
        idmodulo,
        idaccion
    ]);

    return {
        ok: true,
        msg: 'Permiso asignado correctamente',
        idrol_permiso: result.insertId
    };
};

const obtenerPermisosRol = async (idrol) => {

    const [rows] = await pool.query(`
        SELECT

            rp.idrol_permiso,

            m.idmodulo,
            m.codigo AS codigo_modulo,
            m.nombre_modulo,

            a.idaccion,
            a.codigo AS codigo_accion,
            a.nombre_accion

        FROM roles_permisos rp

        INNER JOIN modulos m
            ON rp.idmodulo = m.idmodulo

        INNER JOIN acciones a
            ON rp.idaccion = a.idaccion

        WHERE rp.idrol = ?
        AND rp.estado = 'ACTIVO'

        ORDER BY
            m.nombre_modulo ASC,
            a.nombre_accion ASC
    `, [idrol]);

    return {
        ok: true,
        data: rows
    };
};

const eliminarPermiso = async (idrol_permiso) => {

    await pool.query(`
        UPDATE roles_permisos
        SET estado = 'INACTIVO'
        WHERE idrol_permiso = ?
    `, [idrol_permiso]);

    return {
        ok: true,
        msg: 'Permiso eliminado correctamente'
    };
};

module.exports = {
    asignarPermiso,
    obtenerPermisosRol,
    eliminarPermiso
};