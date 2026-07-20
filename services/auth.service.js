const bcrypt = require('bcrypt');

const pool = require('../Configuraciones/ConexionDb/db');

const jwt = require('jsonwebtoken');


const login = async (body, req) => {

    const {
        usuario,
        password
    } = body;

    // BUSCAR USUARIO
    let sql = `
        SELECT

            u.idusuario,
            u.usuario,
            u.password,
            u.estado,
            u.intentos_fallidos,

            p.idpersona,
            p.identidad,
            p.nombres,
            p.apellidos
        FROM  cooperativa_db.usuarios u
        INNER JOIN cooperativa_db.personas p
            ON u.idpersona = p.idpersona
        WHERE u.usuario = ?
        `
        console.log(pool.format(sql,[usuario]))
    const [rows] = await pool.query(sql, [usuario]);
     console.log(rows)
    if(rows.length === 0){
        throw new Error('Usuario no encontrado');
    }

    const usuarioDB = rows[0];

    // VALIDAR ESTADO

    if(usuarioDB.estado !== 'ACTIVO'){
        throw new Error('Usuario inactivo o bloqueado');
    }

    // VALIDAR PASSWORD
console.log("Antes del hash")
console.log(password,
        usuarioDB.password)
    const validarPassword = await bcrypt.compare(
        password,
        usuarioDB.password
    );

    // PASSWORD INCORRECTA

    if(!validarPassword){

        await pool.query(`
            UPDATE usuarios
            SET intentos_fallidos = intentos_fallidos + 1
            WHERE idusuario = ?
        `, [usuarioDB.idusuario]);

        throw new Error('Contraseña incorrecta');
    }

    // RESETEAR INTENTOS

    await pool.query(`
        UPDATE usuarios
        SET
            intentos_fallidos = 0,
            ultimo_login = NOW()
        WHERE idusuario = ?
    `, [usuarioDB.idusuario]);

    // OBTENER ROLES

    const [roles] = await pool.query(`
        SELECT

            r.idrol,
            r.codigo,
            r.nombre_rol

        FROM usuario_roles ur

        INNER JOIN roles r
            ON ur.idrol = r.idrol

        WHERE ur.idusuario = ?
        AND ur.estado = 'ACTIVO'
        AND r.estado = 'ACTIVO'
    `, [usuarioDB.idusuario]);

    // OBTENER PERMISOS

    const [permisos] = await pool.query(`
        SELECT DISTINCT

            m.codigo AS modulo,
            a.codigo AS accion

        FROM usuario_roles ur

        INNER JOIN roles_permisos rp
            ON ur.idrol = rp.idrol

        INNER JOIN modulos m
            ON rp.idmodulo = m.idmodulo

        INNER JOIN acciones a
            ON rp.idaccion = a.idaccion

        WHERE ur.idusuario = ?
        AND rp.estado = 'ACTIVO'
    `, [usuarioDB.idusuario]);

    // OBTENER MENU

    const [menu] = await pool.query(`
        SELECT DISTINCT

            m.idmodulo,
            m.codigo,
            m.nombre_modulo,
            m.icono,
            m.ruta,
            m.modulo_padre,
            m.orden_menu

        FROM usuario_roles ur

        INNER JOIN roles_permisos rp
            ON ur.idrol = rp.idrol

        INNER JOIN modulos m
            ON rp.idmodulo = m.idmodulo

        WHERE ur.idusuario = ?
        AND rp.estado = 'ACTIVO'
        AND m.visible_menu = 1
        AND m.estado = 'ACTIVO'

        ORDER BY m.orden_menu ASC
    `, [usuarioDB.idusuario]);

    // GENERAR JWT

    const token = jwt.sign(
        {
            idusuario: usuarioDB.idusuario
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES
        }
    );

    // GUARDAR SESION

    await pool.query(`
        INSERT INTO sesiones(
            idusuario,
            token,
            ip,
            user_agent
        )
        VALUES(?,?,?,?)
    `, [
        usuarioDB.idusuario,
        token,
        req.ip,
        req.headers['user-agent']
    ]);

    return {
        ok: true,

        token,

        usuario: {
            idusuario: usuarioDB.idusuario,
            usuario: usuarioDB.usuario,
            identidad: usuarioDB.identidad,
            nombres: usuarioDB.nombres,
            apellidos: usuarioDB.apellidos
        },

        roles,

        permisos,

        menu
    };
};

const crearUsuario = async (body) => {

    const {
        idpersona,
        usuario,
        password
    } = body;
 
    

    if (!idpersona) {
        throw new Error('El idpersona es requerido');
    }

    if (!usuario || usuario.trim() === '') {
        throw new Error('El usuario es requerido');
    }

    if (!password || password.trim() === '') {
        throw new Error('La contraseña es requerida');
    }
    console.log("pase los if")

     

 
console.log(pool.format(`
        SELECT idpersona
        FROM cooperativa_db.personas
        WHERE idpersona = ?
        AND estado = 'ACTIVO'
        LIMIT 1
    `, [idpersona]))
    const [personaExiste] = await pool.query(`
        SELECT idpersona
        FROM cooperativa_db.personas
        WHERE idpersona = ?
        AND estado = 'ACTIVO'
        LIMIT 1
    `, [idpersona]);

    console.log(personaExiste)
    if (personaExiste.length === 0) {
        throw new Error('La persona no existe');
    }

  
console.log(pool.format(`
        SELECT idusuario
        FROM cooperativa_db.usuarios
        WHERE idpersona = ?
        LIMIT 1
    `, [idpersona]))
    const [usuarioPersona] = await pool.query(`
        SELECT idusuario
        FROM cooperativa_db.usuarios
        WHERE idpersona = ?
        LIMIT 1
    `, [idpersona]);

    if (usuarioPersona.length > 0) {
        throw new Error('La persona ya tiene usuario');
    }

    // =====================================
    // VALIDAR USUARIO DUPLICADO
    // =====================================

    const [usuarioExiste] = await pool.query(`
        SELECT idusuario
        FROM cooperativa_db.usuarios
        WHERE usuario = ?
        LIMIT 1
    `, [usuario]);

    if (usuarioExiste.length > 0) {
        throw new Error('El usuario ya existe');
    }
 
    const passwordHash = await bcrypt.hash(password, 10);

    // =====================================
    // INSERTAR USUARIO
    // =====================================

    const [result] = await pool.query(`
        INSERT INTO cooperativa_db.usuarios(
            idpersona,
            usuario,
            password
        )
        VALUES(?,?,?)
    `, [
        idpersona,
        usuario.trim(),
        passwordHash
    ]);

    return {
        ok: true,
        msg: 'Usuario creado correctamente',
        idusuario: result.insertId
    };
};

const listarUsuarios = async () => {
 
const [usuarios] = await pool.query(`
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
            ON p.idpersona = u.idpersona
        ORDER BY u.idusuario DESC
    `);

    return {
        ok: true,
        resultado: usuarios
    };

};

module.exports = {
    login,
    crearUsuario,
    listarUsuarios
};