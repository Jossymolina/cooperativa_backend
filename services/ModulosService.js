const pool = require('../Configuraciones/ConexionDb/db');

const crearModulo = async (body) => {

    const {
        codigo,
        nombre_modulo,
        descripcion,
        ruta,
        icono,
        modulo_padre,
        orden_menu,
        visible_menu
    } = body;

    // VALIDAR CODIGO

    const [codigoExiste] = await pool.query(`
        SELECT idmodulo
        FROM modulos
        WHERE codigo = ?
    `, [codigo]);

    if(codigoExiste.length > 0){
        throw new Error('El código ya existe');
    }

    // INSERTAR

    const [result] = await pool.query(`
        INSERT INTO modulos(
            codigo,
            nombre_modulo,
            descripcion,
            ruta,
            icono,
            modulo_padre,
            orden_menu,
            visible_menu
        )
        VALUES(?,?,?,?,?,?,?,?)
    `, [
        codigo,
        nombre_modulo,
        descripcion,
        ruta,
        icono,
        modulo_padre || null,
        orden_menu || 0,
        visible_menu
    ]);

    return {
        ok: true,
        msg: 'Módulo creado correctamente',
        idmodulo: result.insertId
    };
};

const obtenerModulos = async () => {

    const [rows] = await pool.query(`
        SELECT
            m.*,

            mp.nombre_modulo AS modulo_padre_nombre

        FROM modulos m

        LEFT JOIN modulos mp
            ON m.modulo_padre = mp.idmodulo

        ORDER BY
            m.orden_menu ASC,
            m.idmodulo ASC
    `);

    return {
        ok: true,
        data: rows
    };
};

const obtenerModulo = async (idmodulo) => {

    const [rows] = await pool.query(`
        SELECT *
        FROM modulos
        WHERE idmodulo = ?
    `, [idmodulo]);

    if(rows.length === 0){
        throw new Error('Módulo no encontrado');
    }

    return {
        ok: true,
        data: rows[0]
    };
};

const actualizarModulo = async (idmodulo, body) => {

    const {
        codigo,
        nombre_modulo,
        descripcion,
        ruta,
        icono,
        modulo_padre,
        orden_menu,
        visible_menu,
        estado
    } = body;

    await pool.query(`
        UPDATE modulos
        SET
            codigo = ?,
            nombre_modulo = ?,
            descripcion = ?,
            ruta = ?,
            icono = ?,
            modulo_padre = ?,
            orden_menu = ?,
            visible_menu = ?,
            estado = ?
        WHERE idmodulo = ?
    `, [
        codigo,
        nombre_modulo,
        descripcion,
        ruta,
        icono,
        modulo_padre || null,
        orden_menu,
        visible_menu,
        estado,
        idmodulo
    ]);

    return {
        ok: true,
        msg: 'Módulo actualizado correctamente'
    };
};

const eliminarModulo = async (idmodulo) => {

    // VALIDAR HIJOS

    const [hijos] = await pool.query(`
        SELECT idmodulo
        FROM modulos
        WHERE modulo_padre = ?
        AND estado = 'ACTIVO'
    `, [idmodulo]);

    if(hijos.length > 0){
        throw new Error('El módulo tiene submódulos asociados');
    }

    await pool.query(`
        UPDATE modulos
        SET estado = 'INACTIVO'
        WHERE idmodulo = ?
    `, [idmodulo]);

    return {
        ok: true,
        msg: 'Módulo eliminado correctamente'
    };
};

module.exports = {
    crearModulo,
    obtenerModulos,
    obtenerModulo,
    actualizarModulo,
    eliminarModulo
};