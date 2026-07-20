const bcrypt = require('bcrypt');

const pool = require('../Configuraciones/ConexionDb/db');

const crearUsuario = async (body) => {

    const {
        idpersona,
        usuario,
        password
    } = body;

    // VALIDAR PERSONA

    const [persona] = await pool.query(`
        SELECT idpersona
        FROM personas
        WHERE idpersona = ?
        AND estado = 'ACTIVO'
    `, [idpersona]);

    if(persona.length === 0){
        throw new Error('La persona no existe');
    }

    // VALIDAR TIPO USUARIO_SISTEMA

    const [tipo] = await pool.query(`
        SELECT pt.idpersona_tipo
        FROM personas_tipos pt
        INNER JOIN tipos_persona tp
            ON pt.idtipo_persona = tp.idtipo_persona
        WHERE pt.idpersona = ?
        AND tp.codigo = 'USUARIO_SISTEMA'
        AND pt.estado = 'ACTIVO'
    `, [idpersona]);

    if(tipo.length === 0){
        throw new Error('La persona no tiene tipo USUARIO_SISTEMA');
    }

    // VALIDAR USUARIO REPETIDO

    const [usuarioExiste] = await pool.query(`
        SELECT idusuario
        FROM usuarios
        WHERE usuario = ?
    `, [usuario]);

    if(usuarioExiste.length > 0){
        throw new Error('El usuario ya existe');
    }

    // VALIDAR SI YA TIENE USUARIO

    const [personaUsuario] = await pool.query(`
        SELECT idusuario
        FROM usuarios
        WHERE idpersona = ?
        AND estado = 'ACTIVO'
    `, [idpersona]);

    if(personaUsuario.length > 0){
        throw new Error('La persona ya tiene usuario');
    }

    // HASH PASSWORD

    const passwordHash = await bcrypt.hash(password, 10);

    // INSERT

    const [result] = await pool.query(`
        INSERT INTO usuarios(
            idpersona,
            usuario,
            password
        )
        VALUES(?,?,?)
    `, [
        idpersona,
        usuario,
        passwordHash
    ]);

    return {
        ok: true,
        msg: 'Usuario creado correctamente',
        idusuario: result.insertId
    };
};

const obtenerUsuarios = async () => {

    const [rows] = await pool.query(`
        SELECT
            u.idusuario,
            u.usuario,
            u.estado,
            u.ultimo_login,

            p.idpersona,
            p.identidad,
            p.nombres,
            p.apellidos

        FROM usuarios u
        INNER JOIN personas p
            ON u.idpersona = p.idpersona

        ORDER BY u.idusuario DESC
    `);

    return {
        ok: true,
        data: rows
    };
};

const obtenerUsuario = async (idusuario) => {

    const [rows] = await pool.query(`
        SELECT
            u.*,

            p.identidad,
            p.nombres,
            p.apellidos

        FROM usuarios u
        INNER JOIN personas p
            ON u.idpersona = p.idpersona
        WHERE u.idusuario = ?
    `, [idusuario]);

    if(rows.length === 0){
        throw new Error('Usuario no encontrado');
    }

    return {
        ok: true,
        data: rows[0]
    };
};

const actualizarUsuario = async (idusuario, body) => {

    const {
        usuario,
        estado
    } = body;

    await pool.query(`
        UPDATE usuarios
        SET
            usuario = ?,
            estado = ?
        WHERE idusuario = ?
    `, [
        usuario,
        estado,
        idusuario
    ]);

    return {
        ok: true,
        msg: 'Usuario actualizado correctamente'
    };
};

const eliminarUsuario = async (idusuario) => {

    await pool.query(`
        UPDATE usuarios
        SET estado = 'INACTIVO'
        WHERE idusuario = ?
    `, [idusuario]);

    return {
        ok: true,
        msg: 'Usuario eliminado correctamente'
    };
};

module.exports = {
    crearUsuario,
    obtenerUsuarios,
    obtenerUsuario,
    actualizarUsuario,
    eliminarUsuario
};