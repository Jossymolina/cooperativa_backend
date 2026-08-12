
const pool = require('../Configuraciones/ConexionDb/db');
const historial = require('../services/Historial');
//I sertar una cuenta nueva
async function insertarCuentaContable(
    codigo,
    nombre,
    idcuenta_padre,
    tipo,
    naturaleza,
    requiere_tercero
) {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Verificar que el código no exista
        const [cuentaExistente] = await connection.query(
            `
            SELECT idcuenta
            FROM cuentas_contables
            WHERE codigo = ?
            LIMIT 1
            `,
            [codigo]
        );

        if (cuentaExistente.length > 0) {
            throw new Error(
                `El código contable ${codigo} ya existe`
            );
        }

        // Determinar nivel
        let nivel = 1;
console.log(idcuenta_padre)
        if (idcuenta_padre !== null && idcuenta_padre !== undefined) {
            const [padre] = await connection.query(
                `SELECT nivel, estado
                FROM cuentas_contables
                WHERE idcuenta = ?
                LIMIT 1
                `,
                [idcuenta_padre]
            );

            if (padre.length === 0) {
                throw new Error(
                    `La cuenta padre ${idcuenta_padre} no existe`
                );
            }

            if (padre[0].estado !== 1) {
                throw new Error(
                    'La cuenta padre está inactiva'
                );
            }

            nivel = padre[0].nivel + 1;
        }

        console.log(connection.format(`
            INSERT INTO cuentas_contables (
                codigo,
                nombre,
                idcuenta_padre,
                nivel,
                tipo,
                naturaleza,
                requiere_tercero,
                estado
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `,
            [
                codigo,
                nombre,
                idcuenta_padre,
                nivel,
                tipo,
                naturaleza,
                requiere_tercero ? 1 : 0
            ]))
        // Insertar cuenta
        const [resultado] = await connection.query(
            `
            INSERT INTO cuentas_contables (
                codigo,
                nombre,
                idcuenta_padre,
                nivel,
                tipo,
                naturaleza,
                requiere_tercero,
                estado
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)
            `,
            [
                codigo,
                nombre,
                idcuenta_padre,
                nivel,
                tipo,
                naturaleza,
                requiere_tercero ? 1 : 0
            ]
        );

        await connection.commit();
        return {
            idcuenta: resultado.insertId,
            codigo: codigo,
            nombre: nombre,
            idcuenta_padre: idcuenta_padre,
            nivel: nivel,
            tipo: tipo,
            naturaleza: naturaleza,
            requiere_tercero: requiere_tercero ? 1 : 0,
            estado: 1
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

//sacar todo el catalogo contable
async function obtenerCatalogoContable() {

    const [cuentas] = await pool.query(`
        SELECT
            idcuenta,
            codigo,
            nombre,
            idcuenta_padre,
            nivel,
            tipo,
            naturaleza,
            requiere_tercero,
            estado,
            fecha_creacion,
            fecha_modificacion
        FROM cuentas_contables
        WHERE estado = 1
        ORDER BY codigo ASC
    `);

    const mapa = {};
    const arbol = [];

    // Crear nodos
    cuentas.forEach(cuenta => {

        mapa[cuenta.idcuenta] = {
            ...cuenta,
            hijos: []
        };

    });

    // Construir árbol
    cuentas.forEach(cuenta => {

        if (cuenta.idcuenta_padre === null) {

            // Nodo raíz
            arbol.push(mapa[cuenta.idcuenta]);

        } else {

            const padre = mapa[cuenta.idcuenta_padre];

            if (padre) {
                padre.hijos.push(mapa[cuenta.idcuenta]);
            }

        }

    });

    return arbol;
}

//Actualizar una cuenta en especifico
async function actualizarCuentaContable(
    idcuenta,
    codigo,
    nombre,
    idcuenta_padre,
    tipo,
    naturaleza,
    requiere_tercero,
    estado
) {

    const connection = await pool.getConnection();

    try {

        await connection.beginTransaction();


        // ==========================================
        // 1. VERIFICAR QUE LA CUENTA EXISTA
        // ==========================================
        const [cuenta] = await connection.query(
            `
            SELECT
                idcuenta,
                idcuenta_padre,
                nivel
            FROM cuentas_contables
            WHERE idcuenta = ?
            LIMIT 1
            `,
            [idcuenta]
        );

        if (cuenta.length === 0) {
            throw new Error(
                `La cuenta ${idcuenta} no existe`
            );
        }


        // ==========================================
        // 2. VERIFICAR CÓDIGO DUPLICADO
        // ==========================================

        const [codigoExistente] = await connection.query(
            `
            SELECT idcuenta
            FROM cuentas_contables
            WHERE codigo = ?
              AND idcuenta <> ?
            LIMIT 1
            `,
            [codigo, idcuenta]
        );

        if (codigoExistente.length > 0) {
            throw new Error(
                `El código contable ${codigo} ya existe`
            );
        }

        // ==========================================
        // 3. NO PERMITIR QUE SEA SU PROPIO PADRE
        // ==========================================

        if (
            idcuenta_padre !== null &&
            Number(idcuenta_padre) === Number(idcuenta)
        ) {
            throw new Error(
                'Una cuenta no puede ser su propio padre'
            );
        }


        // ==========================================
        // 4. VALIDAR CUENTA PADRE
        // ==========================================

        let nivel = 1;
console.log("adre ",idcuenta_padre)
        if (idcuenta_padre !== null && idcuenta_padre !== undefined) {
            const [padre] = await connection.query(
                `
                SELECT
                    idcuenta,
                    nivel,
                    estado
                FROM cuentas_contables
                WHERE idcuenta = ?
                LIMIT 1
                `,
                [idcuenta_padre]
            );

            if (padre.length === 0) {
                throw new Error(
                    `La cuenta padre ${idcuenta_padre} no existe`
                );
            }

            if (padre[0].estado !== 1) {
                throw new Error(
                    'La cuenta padre está inactiva'
                );
            }

            nivel = padre[0].nivel + 1;
        }

        // ==========================================
        // 5. ACTUALIZAR CUENTA
        // ==========================================

        await connection.query(
            `
            UPDATE cuentas_contables
            SET
                codigo = ?,
                nombre = ?,
                idcuenta_padre = ?,
                nivel = ?,
                tipo = ?,
                naturaleza = ?,
                requiere_tercero = ?,
                estado = ?
            WHERE idcuenta = ?
            `,
            [
                codigo,
                nombre,
                idcuenta_padre,
                nivel,
                tipo,
                naturaleza,
                requiere_tercero ? 1 : 0,
                estado ? 1 : 0,
                idcuenta
            ]
        );


        // ==========================================
        // 6. CONFIRMAR
        // ==========================================

        await connection.commit();


        return {
            idcuenta: idcuenta,
            codigo: codigo,
            nombre: nombre,
            idcuenta_padre: idcuenta_padre,
            nivel: nivel,
            tipo: tipo,
            naturaleza: naturaleza,
            requiere_tercero: requiere_tercero ? 1 : 0,
            estado: estado ? 1 : 0
        };


    } catch (error) {

        await connection.rollback();

        throw error;

    } finally {

        connection.release();
    }
}


//Eliminar una cuenta
async function eliminarCuentaContable(idcuenta) {

    const connection = await pool.getConnection();
    try {

        await connection.beginTransaction();

        // ==========================================
        // 1. VERIFICAR QUE LA CUENTA EXISTA
        // ==========================================
        const [cuenta] = await connection.query(
            `
            SELECT
                idcuenta,
                codigo,
                nombre,
                estado
            FROM cuentas_contables
            WHERE idcuenta = ?
            LIMIT 1
            `,
            [idcuenta]
        );

        if (cuenta.length === 0) {
            throw new Error(
                'La cuenta contable no existe'
            );
        }


        // ==========================================
        // 2. VERIFICAR SI TIENE CUENTAS HIJAS
        // ==========================================

        const [hijos] = await connection.query(
            `
            SELECT idcuenta
            FROM cuentas_contables
            WHERE idcuenta_padre = ?
            LIMIT 1
            `,
            [idcuenta]
        );


      

    


        // ==========================================
        // 5. NO TIENE HIJOS NI MOVIMIENTOS
        //    → ELIMINAR
        // ==========================================

        await connection.query(
            `
            DELETE FROM cuentas_contables
            WHERE idcuenta = ?
            `,
            [idcuenta]
        );


        // ==========================================
        // 6. CONFIRMAR
        // ==========================================

        await connection.commit();


        return {
            eliminado: true,
            desactivado: false,
            idcuenta: idcuenta,
            mensaje: 'La cuenta fue eliminada correctamente.'
        };


    } catch (error) {

        await connection.rollback();

        throw error;

    } finally {

        connection.release();
    }
}

module.exports  = {
    insertarCuentaContable,
    obtenerCatalogoContable,
    actualizarCuentaContable,
    eliminarCuentaContable


}