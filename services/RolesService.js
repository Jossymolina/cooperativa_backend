const pool = require('../Configuraciones/ConexionDb/db');

const crearRol = async (body) => {

    const {
        codigo,
        nombre_rol,
        descripcion
    } = body;

    // VALIDAR CODIGO

    const [codigoExiste] = await pool.query(`
        SELECT idrol
        FROM roles
        WHERE codigo = ?
    `, [codigo]);

    if(codigoExiste.length > 0){
        throw new Error('El código ya existe');
    }

    // VALIDAR NOMBRE

    const [nombreExiste] = await pool.query(`
        SELECT idrol
        FROM roles
        WHERE nombre_rol = ?
    `, [nombre_rol]);

    if(nombreExiste.length > 0){
        throw new Error('El nombre del rol ya existe');
    }

    // INSERTAR

    const [result] = await pool.query(`
        INSERT INTO roles(
            codigo,
            nombre_rol,
            descripcion
        )
        VALUES(?,?,?)
    `, [
        codigo,
        nombre_rol,
        descripcion
    ]);

    return {
        ok: true,
        msg: 'Rol creado correctamente',
        idrol: result.insertId
    };
};

const obtenerRoles = async () => {

    const [rows] = await pool.query(`
        SELECT *
        FROM roles
        ORDER BY idrol DESC
    `);

    return {
        ok: true,
        data: rows
    };
};

const obtenerRol = async (idrol) => {

    const [rows] = await pool.query(`
        SELECT *
        FROM roles
        WHERE idrol = ?
    `, [idrol]);

    if(rows.length === 0){
        throw new Error('Rol no encontrado');
    }

    return {
        ok: true,
        data: rows[0]
    };
};

const actualizarRol = async (idrol, body) => {

    const {
        codigo,
        nombre_rol,
        descripcion,
        estado
    } = body;

    await pool.query(`
        UPDATE roles
        SET
            codigo = ?,
            nombre_rol = ?,
            descripcion = ?,
            estado = ?
        WHERE idrol = ?
    `, [
        codigo,
        nombre_rol,
        descripcion,
        estado,
        idrol
    ]);

    return {
        ok: true,
        msg: 'Rol actualizado correctamente'
    };
};

const eliminarRol = async (idrol) => {

    await pool.query(`
        UPDATE roles
        SET estado = 'INACTIVO'
        WHERE idrol = ?
    `, [idrol]);

    return {
        ok: true,
        msg: 'Rol eliminado correctamente'
    };
};

const asignarRolUsuario = async (body) => {

    const {
        idusuario,
        idrol
    } = body;

    // VALIDAR DUPLICADO

    const [existe] = await pool.query(`
        SELECT idusuario_rol
        FROM usuario_roles
        WHERE idusuario = ?
        AND idrol = ?
        AND estado = 'ACTIVO'
    `, [
        idusuario,
        idrol
    ]);

    if(existe.length > 0){
        throw new Error('El usuario ya tiene asignado este rol');
    }

    // INSERT

    const [result] = await pool.query(`
        INSERT INTO usuario_roles(
            idusuario,
            idrol
        )
        VALUES(?,?)
    `, [
        idusuario,
        idrol
    ]);

    return {
        ok: true,
        msg: 'Rol asignado correctamente',
        idusuario_rol: result.insertId
    };
};

const obtenerRolesUsuario = async (idusuario) => {

    const [rows] = await pool.query(`
        SELECT
            ur.idusuario_rol,

            r.idrol,
            r.codigo,
            r.nombre_rol,
            r.descripcion

        FROM usuario_roles ur

        INNER JOIN roles r
            ON ur.idrol = r.idrol

        WHERE ur.idusuario = ?
        AND ur.estado = 'ACTIVO'
    `, [idusuario]);

    return {
        ok: true,
        data: rows
    };
};

const quitarRolUsuario = async (idusuario_rol) => {

    await pool.query(`
        UPDATE usuario_roles
        SET estado = 'INACTIVO'
        WHERE idusuario_rol = ?
    `, [idusuario_rol]);

    return {
        ok: true,
        msg: 'Rol removido correctamente'
    };
};

module.exports = {
    crearRol,
    obtenerRoles,
    obtenerRol,
    actualizarRol,
    eliminarRol,
    asignarRolUsuario,
    obtenerRolesUsuario,
    quitarRolUsuario
};