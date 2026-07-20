
const pool = require('../Configuraciones/ConexionDb/db');

const crearPersona = async (body) => {

    const connection = await pool.getConnection();
    try {

        const {
            identidad,
            nombres,
            apellidos,
            sexo,
            fecha_nacimiento,
            estado_civil,
            nacionalidad,
            correo,
            tipos_persona,
            cuenta
        } = body;

console.log(body)
      
     

        // =====================================
        // VALIDAR IDENTIDAD DUPLICADA
        // =====================================

        const [personaExiste] = await connection.query(`
            SELECT idpersona
            FROM personas
            WHERE identidad = ?
            LIMIT 1
        `, [identidad]);

        if (personaExiste.length > 0) {
            throw new Error('La identidad ya existe');
        }
console.log("entrandi ")

        // =====================================
        // INICIAR TRANSACCIÓN
        // =====================================

        await connection.beginTransaction();

        // =====================================
        // INSERTAR PERSONA
        // =====================================


 

        const [personaInsertada] = await connection.query(`
            INSERT INTO personas
            (
                identidad,
                nombres,
                apellidos,
                sexo,
                fecha_nacimiento,
                estado_civil,
                nacionalidad,
                correo,
                numero_cuenta
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?,?)
        `, [
            identidad,
            nombres,
            apellidos,
            sexo,
            fecha_nacimiento || null,
            estado_civil || null,
            nacionalidad || null,
            correo || null,
            cuenta
        ]);

        const idpersona = personaInsertada.insertId;

        // =====================================
        // INSERTAR TIPOS
        // =====================================

        for (const item of tipos_persona) {

            if (!item.idtipo_persona) {
                throw new Error('Debe enviar idtipo_persona');
            }

            // ==============================
            // VALIDAR TIPO
            // ==============================

            const [tipoExiste] = await connection.query(`
                SELECT idtipo_persona
                FROM tipos_persona
                WHERE idtipo_persona = ?
                AND estado = 'ACTIVO'
                LIMIT 1
            `, [item.idtipo_persona]);

            if (tipoExiste.length === 0) {
                throw new Error(
                    `El tipo ${item.idtipo_persona} no existe o está inactivo`
                );
            }

            // ==============================
            // VALIDAR DUPLICADOS
            // ==============================

            const duplicados = tipos_persona.filter(
                x => x.idtipo_persona == item.idtipo_persona
            );

            if (duplicados.length > 1) {
                throw new Error(
                    `El tipo ${item.idtipo_persona} está repetido`
                );
            }

            // ==============================
            // INSERTAR RELACIÓN
            // ==============================

            await connection.query(`
                INSERT INTO personas_tipos
                (
                    idpersona,
                    idtipo_persona
                )
                VALUES (?, ?)
            `, [
                idpersona,
                item.idtipo_persona
            ]);
        }

        // =====================================
        // COMMIT
        // =====================================

        await connection.commit();

        return {
            ok: true,
            msg: 'Persona registrada correctamente',
            idpersona
        };

    } catch (error) {

        await connection.rollback();
        throw error;

    } finally {

        connection.release();

    }

};


const obtenerPersonas = async () => {

    const [rows] = await pool.query(`
        SELECT *
        FROM personas
        WHERE estado = 'ACTIVO'
        ORDER BY idpersona DESC
    `);

    return {
        ok: true,
        data: rows
    };
};





const obtenerPersona = async (idpersona) => {

    const [rows] = await pool.query(`
        SELECT *
        FROM personas
        WHERE idpersona = ?
    `, [idpersona]);

    if(rows.length === 0){
        throw new Error('Persona no encontrada jossy');
    }

    return {
        ok: true,
        data: rows[0]
    };
};

const actualizarPersona = async (idpersona, body) => {

    const {
        identidad,
        nombres,
        apellidos,
        sexo,
        fecha_nacimiento,
        estado_civil,
        nacionalidad,
        correo
    } = body;

    await pool.query(`
        UPDATE personas
        SET
            identidad = ?,
            nombres = ?,
            apellidos = ?,
            sexo = ?,
            fecha_nacimiento = ?,
            estado_civil = ?,
            nacionalidad = ?,
            correo = ?
        WHERE idpersona = ?
    `, [
        identidad,
        nombres,
        apellidos,
        sexo,
        fecha_nacimiento,
        estado_civil,
        nacionalidad,
        correo,
        idpersona
    ]);

    return {
        ok: true,
        msg: 'Persona actualizada correctamente'
    };
};

const eliminarPersona = async (idpersona) => {

    await pool.query(`
        UPDATE personas
        SET estado = 'INACTIVO'
        WHERE idpersona = ?
    `, [idpersona]);

    return {
        ok: true,
        msg: 'Persona eliminada correctamente'
    };
};


const obtenerPersonaIdentidad = async (identidad) => {
  console.log(pool.format(`SELECT * FROM cooperativa_db.personas where identidad = ?`,[identidad]))
    const [rows] = await pool.query(`
        SELECT * FROM cooperativa_db.personas where identidad = ?
    `, [identidad]);

    if(rows.length === 0){
        throw new Error('Persona no encontrada sdsdsd');
    }

    return {
        ok: true,
        resultado: rows[0]
    };
};

const sacar_tipos_persona = async () => {
    console.log(" SELECT * FROM cooperativa_db.tipos_persona order by nombre_tipo asc")
    const [rows] = await pool.query(`
        SELECT * FROM cooperativa_db.tipos_persona order by nombre_tipo asc
    `, []);

    if(rows.length === 0){
        throw new Error('No hay datos');
    }

    return {
        ok: true,
        resultado: rows
    };
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