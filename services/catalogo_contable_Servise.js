
const pool = require('../Configuraciones/ConexionDb/db');
const historial = require('../services/Historial');
const {   ejecutarPartidaAutomatica } = require('./PartidaAutomaticaService');

 
//I sertar una cuenta nueva
async function insertarCuentaContable(
    codigo,
    nombre,
    idcuenta_padre,
    tipo,
    naturaleza,
    requiere_tercero
) {
    let connection ;
    try {
        connection = await pool.getConnection();
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
        if(connection){
connection.release();
        }
        
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

    let connection  

    try {
connection = await pool.getConnection();
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
        console.log("adre ", idcuenta_padre)
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
if(connection){
        connection.release();

}
    }
}


//Eliminar una cuenta
async function eliminarCuentaContable(idcuenta) {

    let connection  
    try {
connection = await pool.getConnection();
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

        if(connection){
            connection.release();
        }
    }
}



/**
 * aÑO FISCAL O EJERCICIO FISCAL
 */

/**
 * Obtener un ejercicio por ID
 */
const obtenerEjercicio = async (idEjercicio) => {

    let connection 

    try {
connection = await pool.getConnection();
        const [ejercicios] = await connection.query(`
            SELECT
                id_ejercicio,
                anio,
                fecha_inicio,
                fecha_fin,
                estado,
                fecha_apertura,
                fecha_cierre,
                usuario_apertura,
                usuario_cierre
            FROM conta_ejercicio_contable
            WHERE id_ejercicio = ?
            LIMIT 1
        `, [idEjercicio]);


        if (ejercicios.length === 0) {

            throw new Error(
                'El ejercicio contable no existe.'
            );

        }


        const [periodos] = await connection.query(`
            SELECT
                id_periodo,
                id_ejercicio,
                numero_periodo,
                nombre,
                fecha_inicio,
                fecha_fin,
                estado,
                fecha_apertura,
                fecha_cierre
            FROM conta_periodo_contable
            WHERE id_ejercicio = ?
            ORDER BY numero_periodo ASC
        `, [idEjercicio]);


        return {
            ejercicio: ejercicios[0],
            periodos
        };


    } finally {
if(connection){
connection.release();
}
        

    }

};



const crearEjercicio = async ({
    anio,
    usuario
}) => {

    let connection  

    try {
connection = await pool.getConnection();
        await connection.beginTransaction();

        // ----------------------------------------------------
        // 1. Validar año
        // ----------------------------------------------------

        if (!anio || !Number.isInteger(Number(anio))) {
            throw new Error('El año del ejercicio es obligatorio.');
        }

        anio = Number(anio);

        if (anio < 2000 || anio > 2100) {
            throw new Error('El año del ejercicio no es válido.');
        }


        // ----------------------------------------------------
        // 2. Verificar si ya existe el ejercicio
        // ----------------------------------------------------

        const [existente] = await connection.query(`
            SELECT id_ejercicio
            FROM conta_ejercicio_contable
            WHERE anio = ?
            LIMIT 1
        `, [anio]);

        if (existente.length > 0) {
            throw new Error(
                `Ya existe un ejercicio contable para el año ${anio}.`
            );
        }


        // ----------------------------------------------------
        // 3. Validar si ya existe otro ejercicio abierto
        // ----------------------------------------------------

        const [abierto] = await connection.query(`
            SELECT
                id_ejercicio,
                anio
            FROM conta_ejercicio_contable
            WHERE estado = 'ABIERTO'
            LIMIT 1
        `);

        if (abierto.length > 0) {
            throw new Error(
                `El ejercicio ${abierto[0].anio} todavía está abierto. Debe cerrarse antes de abrir el ejercicio ${anio}.`
            );
        }


        // ----------------------------------------------------
        // 4. Fechas del ejercicio
        // ----------------------------------------------------

        const fechaInicio = `${anio}-01-01`;
        const fechaFin = `${anio}-12-31`;


        // ----------------------------------------------------
        // 5. Crear ejercicio
        // ----------------------------------------------------

        const [resultado] = await connection.query(`
            INSERT INTO conta_ejercicio_contable (
                anio,
                fecha_inicio,
                fecha_fin,
                estado,
                fecha_apertura,
                usuario_apertura
            )
            VALUES (?, ?, ?, 'ABIERTO', NOW(), ?)
        `, [
            anio,
            fechaInicio,
            fechaFin,
            usuario || null
        ]);

        const idEjercicio = resultado.insertId;


        // ----------------------------------------------------
        // 6. Crear los 12 períodos
        // ----------------------------------------------------

        const nombresMeses = [
            'Enero',
            'Febrero',
            'Marzo',
            'Abril',
            'Mayo',
            'Junio',
            'Julio',
            'Agosto',
            'Septiembre',
            'Octubre',
            'Noviembre',
            'Diciembre'
        ];

        for (let mes = 1; mes <= 12; mes++) {

            const fechaInicioPeriodo =
                `${anio}-${String(mes).padStart(2, '0')}-01`;

            const fechaFinPeriodo =
                new Date(anio, mes, 0)
                    .toISOString()
                    .substring(0, 10);
            const estadoPeriodo = mes === 1 ? 'ABIERTO' : 'CERRADO';

            await connection.query(`
    INSERT INTO conta_periodo_contable (
        id_ejercicio,
        numero_periodo,
        nombre,
        fecha_inicio,
        fecha_fin,
        estado,
        fecha_apertura
    )
    VALUES (?, ?, ?, ?, ?, ?, NOW())
`, [
                idEjercicio,
                mes,
                nombresMeses[mes - 1],
                fechaInicioPeriodo,
                fechaFinPeriodo,
                estadoPeriodo
            ]);
        }


        // ----------------------------------------------------
        // 7. Confirmar todo
        // ----------------------------------------------------

        await connection.commit();


        // ----------------------------------------------------
        // 8. Obtener ejercicio creado
        // ----------------------------------------------------

        const [ejercicio] = await connection.query(`
            SELECT
                id_ejercicio,
                anio,
                fecha_inicio,
                fecha_fin,
                estado,
                fecha_apertura,
                fecha_cierre,
                usuario_apertura,
                usuario_cierre
            FROM conta_ejercicio_contable
            WHERE id_ejercicio = ?
        `, [idEjercicio]);


        const [periodos] = await connection.query(`
            SELECT
                id_periodo,
                id_ejercicio,
                numero_periodo,
                nombre,
                fecha_inicio,
                fecha_fin,
                estado
            FROM conta_periodo_contable
            WHERE id_ejercicio = ?
            ORDER BY numero_periodo
        `, [idEjercicio]);


        return {
            ejercicio: ejercicio[0],
            periodos
        };

    } catch (error) {

        await connection.rollback();

        throw error;

    } finally {

        if(connection){
connection.release();
}
    }
};


/**
 * Actualizar ejercicio
 */
const actualizarEjercicio = async ({
    idEjercicio,
    anio,
    usuario
}) => {

    let connection  

    try {
connection = await pool.getConnection();
        await connection.beginTransaction();


        // ----------------------------------------------------
        // 1. Obtener ejercicio
        // ----------------------------------------------------

        const [ejercicios] = await connection.query(`
            SELECT
                id_ejercicio,
                anio,
                estado
            FROM conta_ejercicio_contable
            WHERE id_ejercicio = ?
            LIMIT 1
        `, [idEjercicio]);

        if (ejercicios.length === 0) {
            throw new Error('El ejercicio contable no existe.');
        }

        const ejercicio = ejercicios[0];


        // ----------------------------------------------------
        // 2. No modificar ejercicio cerrado
        // ----------------------------------------------------

        if (ejercicio.estado === 'CERRADO') {
            throw new Error(
                'No se puede modificar un ejercicio cerrado.'
            );
        }


        // ----------------------------------------------------
        // 3. Validar año
        // ----------------------------------------------------

        if (!anio || !Number.isInteger(Number(anio))) {
            throw new Error('El año del ejercicio es obligatorio.');
        }

        anio = Number(anio);


        // ----------------------------------------------------
        // 4. Verificar duplicado
        // ----------------------------------------------------

        const [duplicado] = await connection.query(`
            SELECT id_ejercicio
            FROM conta_ejercicio_contable
            WHERE anio = ?
              AND id_ejercicio <> ?
            LIMIT 1
        `, [
            anio,
            idEjercicio
        ]);

        if (duplicado.length > 0) {
            throw new Error(
                `Ya existe otro ejercicio para el año ${anio}.`
            );
        }


        // ----------------------------------------------------
        // 5. Actualizar
        // ----------------------------------------------------

        const fechaInicio = `${anio}-01-01`;
        const fechaFin = `${anio}-12-31`;

        await connection.query(`
            UPDATE conta_ejercicio_contable
            SET
                anio = ?,
                fecha_inicio = ?,
                fecha_fin = ?
            WHERE id_ejercicio = ?
        `, [
            anio,
            fechaInicio,
            fechaFin,
            idEjercicio
        ]);


        // ----------------------------------------------------
        // 6. Actualizar períodos
        //
        // Esto solamente sería recomendable mientras
        // el ejercicio no tenga movimientos.
        // ----------------------------------------------------

        const [movimientos] = await connection.query(`
            SELECT COUNT(*) AS cantidad
            FROM conta_asiento_contable a
            INNER JOIN conta_periodo_contable p
                ON p.id_periodo = a.id_periodo
            WHERE p.id_ejercicio = ?
        `, [idEjercicio]);

        if (movimientos[0].cantidad > 0) {
            throw new Error(
                'No se puede cambiar el año porque el ejercicio ya contiene asientos contables.'
            );
        }


        // Regenerar fechas de los períodos

        const nombresMeses = [
            'Enero',
            'Febrero',
            'Marzo',
            'Abril',
            'Mayo',
            'Junio',
            'Julio',
            'Agosto',
            'Septiembre',
            'Octubre',
            'Noviembre',
            'Diciembre'
        ];

        for (let mes = 1; mes <= 12; mes++) {

            const fechaInicioPeriodo =
                `${anio}-${String(mes).padStart(2, '0')}-01`;

            const fechaFinPeriodo =
                new Date(anio, mes, 0)
                    .toISOString()
                    .substring(0, 10);

            await connection.query(`
                UPDATE conta_periodo_contable
                SET
                    numero_periodo = ?,
                    nombre = ?,
                    fecha_inicio = ?,
                    fecha_fin = ?
                WHERE id_ejercicio = ?
                  AND numero_periodo = ?
            `, [
                mes,
                nombresMeses[mes - 1],
                fechaInicioPeriodo,
                fechaFinPeriodo,
                idEjercicio,
                mes
            ]);
        }


        await connection.commit();


        return await obtenerEjercicio(idEjercicio);

    } catch (error) {

        await connection.rollback();

        throw error;

    } finally {
      if(connection){
        connection.release();
      }
    }
};


/**
 * Eliminar ejercicio
 */
const eliminarEjercicio = async (idEjercicio) => {

    let connection 

    try {
 connection = await pool.getConnection();
        await connection.beginTransaction();


        // ----------------------------------------------------
        // 1. Verificar ejercicio
        // ----------------------------------------------------

        const [ejercicios] = await connection.query(`
            SELECT
                id_ejercicio,
                anio,
                estado
            FROM conta_ejercicio_contable
            WHERE id_ejercicio = ?
            LIMIT 1
        `, [idEjercicio]);

        if (ejercicios.length === 0) {
            throw new Error('El ejercicio contable no existe.');
        }

        const ejercicio = ejercicios[0];


        // ----------------------------------------------------
        // 2. No eliminar ejercicio cerrado
        // ----------------------------------------------------

        if (ejercicio.estado === 'CERRADO') {
            throw new Error(
                'No se puede eliminar un ejercicio cerrado.'
            );
        }


        // ----------------------------------------------------
        // 3. Verificar asientos
        // ----------------------------------------------------

        const [asientos] = await connection.query(`
            SELECT COUNT(*) AS cantidad
            FROM conta_asiento_contable a
            INNER JOIN conta_periodo_contable p
                ON p.id_periodo = a.id_periodo
            WHERE p.id_ejercicio = ?
        `, [idEjercicio]);

        if (asientos[0].cantidad > 0) {
            throw new Error(
                'No se puede eliminar el ejercicio porque ya contiene asientos contables.'
            );
        }


        // ----------------------------------------------------
        // 4. Eliminar períodos
        // ----------------------------------------------------

        await connection.query(`
            DELETE FROM conta_periodo_contable
            WHERE id_ejercicio = ?
        `, [idEjercicio]);


        // ----------------------------------------------------
        // 5. Eliminar ejercicio
        // ----------------------------------------------------

        await connection.query(`
            DELETE FROM conta_ejercicio_contable
            WHERE id_ejercicio = ?
        `, [idEjercicio]);


        await connection.commit();


        return {
            ok: true,
            mensaje: `Ejercicio ${ejercicio.anio} eliminado correctamente.`
        };

    } catch (error) {

        await connection.rollback();

        throw error;

    } finally {
        if(connection){
        connection.release();

        }
    }
};

const listarEjercicios = async () => {
    let connection;

    try {

        connection = await pool.getConnection();

        const [rows] = await connection.query(`
            SELECT
                e.id_ejercicio,
                e.anio,
                e.fecha_inicio,
                e.fecha_fin,
                e.estado,
                e.fecha_apertura,
                e.fecha_cierre,
                e.usuario_apertura,
                e.usuario_cierre
            FROM conta_ejercicio_contable e
            ORDER BY e.anio DESC
        `);

        return rows;

    } catch (error) {

        console.log(error);

        throw new Error("Error en la consulta");

    } finally {

        if (connection) {
            connection.release();
        }

    }
};




const cerrarPeriodo = async ({
    idPeriodo,
    usuario
}) => {
    let  connection
    try {
       connection  = await pool.getConnection();
        console.log("El id dentro del servicio ",idPeriodo)
        await connection.beginTransaction();
        // 1. Obtener período actual
        console.log(connection.format(`
            SELECT
                p.id_periodo,
                p.id_ejercicio,
                p.numero_periodo,
                p.estado,
                e.estado AS estado_ejercicio
            FROM conta_periodo_contable p
            INNER JOIN conta_ejercicio_contable e
                ON e.id_ejercicio = p.id_ejercicio
            WHERE p.id_periodo = ?
            LIMIT 1
        `, [idPeriodo]))
        const [periodos] = await connection.query(`
            SELECT
                p.id_periodo,
                p.id_ejercicio,
                p.numero_periodo,
                p.estado,
                e.estado AS estado_ejercicio
            FROM conta_periodo_contable p
            INNER JOIN conta_ejercicio_contable e
                ON e.id_ejercicio = p.id_ejercicio
            WHERE p.id_periodo = ?
            LIMIT 1
        `, [idPeriodo]);

        if (periodos.length === 0) {
            throw new Error('El período contable no existe.');
        }

        const periodo = periodos[0];

        // 2. Verificar ejercicio
        if (periodo.estado_ejercicio !== 'ABIERTO') {
            throw new Error(
                'El ejercicio contable se encuentra cerrado.'
            );
        }

        // 3. Verificar período
        if (periodo.estado !== 'ABIERTO') {
            throw new Error(
                'El período contable ya se encuentra cerrado.'
            );
        }

        // 4. Buscar siguiente período
        const [siguientes] = await connection.query(`
            SELECT
                id_periodo,
                numero_periodo,
                estado
            FROM conta_periodo_contable
            WHERE id_ejercicio = ?
              AND numero_periodo > ?
            ORDER BY numero_periodo ASC
            LIMIT 1
        `, [
            periodo.id_ejercicio,
            periodo.numero_periodo
        ]);

        // 5. Cerrar período actual
        await connection.query(`
            UPDATE conta_periodo_contable
            SET
                estado = 'CERRADO',
                fecha_cierre = NOW(),
                usuario_cierre = ?
            WHERE id_periodo = ?
        `, [
            usuario || null,
            idPeriodo
        ]);

        // 6. Abrir siguiente período
        if (siguientes.length > 0) {

            const siguiente = siguientes[0];

            await connection.query(`
                UPDATE conta_periodo_contable
                SET
                    estado = 'ABIERTO',
                    fecha_apertura = NOW(),
                    usuario_apertura = ?
                WHERE id_periodo = ?
            `, [
                usuario || null,
                siguiente.id_periodo
            ]);
        }

        await connection.commit();

        return {
            periodo_cerrado: idPeriodo,
            siguiente_periodo:
                siguientes.length > 0
                    ? siguientes[0].id_periodo
                    : null
        };

    } catch (error) {

        await connection.rollback();

        throw error;

    } finally {
                if(connection){
        connection.release();

                }

    }
};


const cerrarEjercicio = async (idEjercicio, usuario) => {

    let connection  ;

    try {
connection = await pool.getConnection();
        await connection.beginTransaction();

        // 1. Obtener ejercicio
        const [ejercicios] = await connection.query(`
            SELECT
                id_ejercicio,
                anio,
                estado
            FROM conta_ejercicio_contable
            WHERE id_ejercicio = ?
            LIMIT 1
        `, [idEjercicio]);

        if (ejercicios.length === 0) {
            throw new Error('El ejercicio contable no existe.');
        }

        const ejercicio = ejercicios[0];

        // 2. Verificar estado
        if (ejercicio.estado !== 'ABIERTO') {
            throw new Error(
                'El ejercicio contable ya se encuentra cerrado.'
            );
        }

        // 3. Verificar períodos abiertos
        const [abiertos] = await connection.query(`
            SELECT
                id_periodo,
                nombre,
                numero_periodo
            FROM conta_periodo_contable
            WHERE id_ejercicio = ?
              AND estado = 'ABIERTO'
            ORDER BY numero_periodo
        `, [idEjercicio]);

        if (abiertos.length > 0) {

            throw new Error(
                `No se puede cerrar el ejercicio. ` +
                `El período ${abiertos[0].nombre} todavía está abierto.`
            );

        }

        // 4. Cerrar ejercicio
        await connection.query(`
            UPDATE conta_ejercicio_contable
            SET
                estado = 'CERRADO',
                fecha_cierre = NOW(),
                usuario_cierre = ?
            WHERE id_ejercicio = ?
        `, [
            usuario || null,
            idEjercicio
        ]);

        await connection.commit();

        return {
            ok: true,
            mensaje: `El ejercicio ${ejercicio.anio} fue cerrado correctamente.`
        };

    } catch (error) {

        await connection.rollback();

        throw error;

    } finally {
        if(connection){
                connection.release();

        }

    }
};





/**
 * Insertar asiento contable con sus movimientos
 */
const insertarAsientoContable = async (p) => {

    let connection  

    try {
connection = await pool.getConnection();
        await connection.beginTransaction();


        // =====================================================
        // 1. VALIDACIONES BÁSICAS
        // =====================================================

        if (!p) {
            throw new Error(
                'Los datos del asiento son obligatorios.'
            );
        }

        const {
            id_periodo,
            fecha,
            concepto,
            tipo_asiento,
            origen,
            referencia,
            movimientos
        } = p;


        if (!id_periodo) {
            throw new Error(
                'El período contable es obligatorio.'
            );
        }


        if (!fecha) {
            throw new Error(
                'La fecha del asiento es obligatoria.'
            );
        }


        if (!concepto || !concepto.trim()) {
            throw new Error(
                'El concepto del asiento es obligatorio.'
            );
        }


        if (!movimientos || !Array.isArray(movimientos)) {
            throw new Error(
                'Los movimientos del asiento son obligatorios.'
            );
        }


        if (movimientos.length < 2) {
            throw new Error(
                'El asiento debe tener al menos dos movimientos.'
            );
        }


        // =====================================================
        // 2. OBTENER PERÍODO + EJERCICIO
        // =====================================================

        const [periodos] = await connection.query(`

            SELECT
                p.id_periodo,
                p.id_ejercicio,
                p.numero_periodo,
                p.nombre,
                p.fecha_inicio,
                p.fecha_fin,
                p.estado AS estado_periodo,

                e.anio,
                e.estado AS estado_ejercicio

            FROM cooperativa_db.conta_periodo_contable p

            INNER JOIN cooperativa_db.conta_ejercicio_contable e
                ON e.id_ejercicio = p.id_ejercicio

            WHERE p.id_periodo = ?

            LIMIT 1

        `, [id_periodo]);


        if (periodos.length === 0) {
            throw new Error(
                'El período contable no existe.'
            );
        }


        const periodo = periodos[0];


        // =====================================================
        // 3. VALIDAR EJERCICIO
        // =====================================================

        if (periodo.estado_ejercicio !== 'ABIERTO') {

            throw new Error(
                `No se puede crear el asiento. El ejercicio ${periodo.anio} está cerrado.`
            );

        }


        // =====================================================
        // 4. VALIDAR PERÍODO
        // =====================================================

        if (periodo.estado_periodo !== 'ABIERTO') {

            throw new Error(
                `No se puede crear el asiento. El período ${periodo.nombre} está cerrado.`
            );

        }


        // =====================================================
        // 5. VALIDAR FECHA
        // =====================================================

        if (
            fecha < periodo.fecha_inicio ||
            fecha > periodo.fecha_fin
        ) {

            throw new Error(
                `La fecha ${fecha} no pertenece al período ${periodo.nombre}.`
            );

        }


        // =====================================================
        // 6. VALIDAR MOVIMIENTOS
        // =====================================================

        let totalDebe = 0n;
        let totalHaber = 0n;


        console.log('Movimientos:', movimientos);


        for (let i = 0; i < movimientos.length; i++) {

            const movimiento = movimientos[i];


            // -------------------------------------------------
            // Validar cuenta
            // -------------------------------------------------

            if (!movimiento.idcuenta) {

                throw new Error(
                    `El movimiento ${i + 1} no tiene cuenta contable.`
                );

            }


            // -------------------------------------------------
            // Convertir valores monetarios a centavos
            // evitando problemas de precisión de JavaScript
            // -------------------------------------------------

            const debe = convertirACentavos(
                movimiento.debe
            );

            const haber = convertirACentavos(
                movimiento.haber
            );


            // -------------------------------------------------
            // Validar negativos
            // -------------------------------------------------

            if (debe < 0n || haber < 0n) {

                throw new Error(
                    `El movimiento ${i + 1} contiene valores negativos.`
                );

            }


            // -------------------------------------------------
            // No puede tener DEBE y HABER simultáneamente
            // -------------------------------------------------

            if (debe > 0n && haber > 0n) {

                throw new Error(
                    `El movimiento ${i + 1} no puede tener DEBE y HABER al mismo tiempo.`
                );

            }


            // -------------------------------------------------
            // Debe tener algún valor
            // -------------------------------------------------

            if (debe === 0n && haber === 0n) {

                throw new Error(
                    `El movimiento ${i + 1} debe tener un valor en DEBE o HABER.`
                );

            }


            totalDebe += debe;
            totalHaber += haber;

        }


        // =====================================================
        // 7. VALIDAR BALANCE
        // =====================================================

        if (totalDebe !== totalHaber) {

            throw new Error(
                `El asiento no está balanceado. DEBE: ${formatearCentavos(totalDebe)} | HABER: ${formatearCentavos(totalHaber)}`
            );

        }


        // =====================================================
        // 8. VALIDAR QUE EXISTAN LAS CUENTAS
        // =====================================================

        const idsCuentas = [
            ...new Set(
                movimientos.map(
                    movimiento => Number(movimiento.idcuenta)
                )
            )
        ];


        const [cuentas] = await connection.query(`

            SELECT
                idcuenta,
                codigo,
                nombre,
                estado

            FROM cooperativa_db.cuentas_contables

            WHERE idcuenta IN (?)

        `, [idsCuentas]);


        // -----------------------------------------------------
        // Crear mapa usando IDCUENTA
        // -----------------------------------------------------

        const cuentasMap = new Map(
            cuentas.map(cuenta => [
                Number(cuenta.idcuenta),
                cuenta
            ])
        );


        // -----------------------------------------------------
        // Validar cada cuenta
        // -----------------------------------------------------

        for (let i = 0; i < movimientos.length; i++) {

            const idcuenta = Number(
                movimientos[i].idcuenta
            );


            const cuenta = cuentasMap.get(
                idcuenta
            );


            if (!cuenta) {

                throw new Error(
                    `La cuenta con ID ${idcuenta} no existe.`
                );

            }


            if (cuenta.estado !== 1) {

                throw new Error(
                    `La cuenta ${cuenta.codigo} - ${cuenta.nombre} está inactiva.`
                );

            }

        }


        // =====================================================
        // 9. CREAR ENCABEZADO
        // =====================================================

        const numeroTemporal =
            `TEMP-${Date.now()}-${Math.floor(
                Math.random() * 1000000
            )}`;


        const [resultado] = await connection.query(`

            INSERT INTO cooperativa_db.conta_asiento_contable (

                id_periodo,
                numero_asiento,
                fecha,
                concepto,
                tipo_asiento,
                origen,
                referencia,
                estado,
                usuario_creacion

            )

            VALUES (?, ?, ?, ?, ?, ?, ?, 'CONTABILIZADO', ?)

        `, [

            id_periodo,
            numeroTemporal,
            fecha,
            concepto.trim(),
            tipo_asiento,
            origen,
            referencia || null,
            p.usuario_creacion || null

        ]);


        const idAsiento = resultado.insertId;


        // =====================================================
        // 10. ASIGNAR NÚMERO DEL ASIENTO
        // =====================================================

        await connection.query(`

            UPDATE cooperativa_db.conta_asiento_contable

            SET numero_asiento = ?

            WHERE id_asiento = ?

        `, [

            String(idAsiento),
            idAsiento

        ]);


        // =====================================================
        // 11. INSERTAR MOVIMIENTOS
        // =====================================================

        for (let i = 0; i < movimientos.length; i++) {

            const movimiento = movimientos[i];


            await connection.query(`

                INSERT INTO cooperativa_db.conta_asiento_contable_detalle (

                    id_asiento,
                    idcuenta,
                    descripcion,
                    debe,
                    haber,
                    orden

                )

                VALUES (?, ?, ?, ?, ?, ?)

            `, [

                idAsiento,

                Number(movimiento.idcuenta),

                movimiento.descripcion || null,

                movimiento.debe || 0,

                movimiento.haber || 0,

                movimiento.orden || (i + 1)

            ]);

        }


        // =====================================================
        // 12. CONFIRMAR TRANSACCIÓN
        // =====================================================

        await connection.commit();


        // =====================================================
        // 13. RETORNAR ASIENTO CREADO
        // =====================================================

        return {

            id_asiento: idAsiento,

            numero_asiento: String(idAsiento),

            id_periodo: id_periodo,

            fecha: fecha,

            concepto: concepto,

            tipo_asiento: tipo_asiento,

            origen: origen,

            referencia: referencia || null,

            estado: 'BORRADOR',

            total_debe:
                formatearCentavos(totalDebe),

            total_haber:
                formatearCentavos(totalHaber),

            movimientos:
                movimientos.length

        };


    } catch (error) {

        await connection.rollback();

        throw error;

    } finally {
if(connection){
        connection.release();

}

    }

};

/**
 * Convierte un valor monetario a centavos
 * para evitar problemas de precisión con Number.
 */
const convertirACentavos = (valor) => {

    if (
        valor === null ||
        valor === undefined ||
        valor === ''
    ) {
        return 0n;
    }

    const texto = String(valor).trim();

    if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
        throw new Error(
            `El valor monetario ${valor} no es válido.`
        );
    }

    const partes = texto.split('.');

    const entero = BigInt(partes[0]);

    let decimales = partes[1] || '';

    decimales = decimales.padEnd(2, '0');

    return (entero * 100n) + BigInt(decimales);
};


/**
 * Convierte centavos a formato monetario.
 */
const formatearCentavos = (valor) => {

    const negativo = valor < 0n;

    const absoluto = negativo
        ? valor * -1n
        : valor;

    const entero = absoluto / 100n;

    const decimales = String(
        absoluto % 100n
    ).padStart(2, '0');

    return `${negativo ? '-' : ''}${entero}.${decimales}`;
};


const obtenerCuentaContable = async (codigo) => {
    console.log(pool.format(`
     
      SELECT
    c.idcuenta,
    c.codigo,
    c.nombre,
    c.idcuenta_padre,
    c.nivel,
    c.tipo,
    c.naturaleza,
    c.requiere_tercero,
    c.estado
FROM cooperativa_db.cuentas_contables c
WHERE c.codigo = ?
  AND NOT EXISTS (
      SELECT 1
      FROM cooperativa_db.cuentas_contables h
      WHERE h.idcuenta_padre = c.idcuenta
  )
LIMIT 1;
    `, [codigo]))
 
    const [rows] = await pool.query(`
         
      SELECT
    c.idcuenta,
    c.codigo,
    c.nombre,
    c.idcuenta_padre,
    c.nivel,
    c.tipo,
    c.naturaleza,
    c.requiere_tercero,
    c.estado
FROM cooperativa_db.cuentas_contables c
WHERE c.codigo = ?
  AND NOT EXISTS (
      SELECT 1
      FROM cooperativa_db.cuentas_contables h
      WHERE h.idcuenta_padre = c.idcuenta
  )
LIMIT 1;
    `, [codigo]);


    if (rows.length === 0) {
        throw new Error('La cuenta contable no existe.');
    }

    return rows[0];
};


 

const listarAsientosContables = async (idPeriodo) => {
    let connection;

    try {
        connection = await pool.getConnection();

        const sql = `
            SELECT
                a.id_asiento,
                a.id_periodo,
                a.numero_asiento,
                a.fecha,
                a.concepto,
                a.tipo_asiento,
                a.origen,
                a.referencia,
                a.fecha_creacion,

                d.id_detalle,
                d.idcuenta,
                d.descripcion,
                d.debe,
                d.haber,
                d.orden,

                c.codigo,
                c.nombre,
                c.idcuenta_padre,
                c.tipo,
                c.naturaleza

            FROM cooperativa_db.conta_asiento_contable a

            INNER JOIN cooperativa_db.conta_asiento_contable_detalle d
                ON d.id_asiento = a.id_asiento

            INNER JOIN cooperativa_db.cuentas_contables c
                ON c.idcuenta = d.idcuenta

            WHERE a.id_periodo = ?

            ORDER BY
                a.fecha ASC,
                a.numero_asiento ASC,
                d.orden ASC
        `;

        const [rows] = await connection.query(sql, [idPeriodo]);

        return rows;

    } catch (error) {
        console.error('Error al listar los asientos contables:', error);
        throw error;

    } finally {
        if (connection) {
            connection.release();
        }
    }
};

 




 //guardar Saldos de un periodo
async function generarSaldoPeriodo(id_periodo) {

    let conexion;

    try {

        conexion = await pool.getConnection();

        await conexion.beginTransaction();

        // ============================================================
        // 1. OBTENER EL PERÍODO
        // ============================================================

        const [periodos] = await conexion.query(`
            SELECT
                p.id_periodo,
                p.id_ejercicio,
                p.numero_periodo,
                p.nombre,
                p.fecha_inicio,
                p.fecha_fin,
                p.estado
            FROM conta_periodo_contable p
            WHERE p.id_periodo = ?
            LIMIT 1
        `, [id_periodo]);


        if (periodos.length === 0) {
            throw new Error('El período contable no existe.');
        }


        const periodo = periodos[0];


        // ============================================================
        // 2. EL PERÍODO DEBE ESTAR ABIERTO
        // ============================================================

        if (periodo.estado !== 'ABIERTO') {
            throw new Error(
                `El período ${periodo.nombre} ya está cerrado.`
            );
        }


        // ============================================================
        // 3. BUSCAR EL ÚLTIMO PERÍODO CERRADO ANTERIOR
        //
        // IMPORTANTE:
        // No buscamos solamente dentro del mismo ejercicio.
        //
        // Ejemplo:
        //
        // Diciembre 2025
        //       ↓
        // Enero 2026
        //
        // El saldo inicial de enero 2026 viene del cierre
        // de diciembre 2025.
        // ============================================================

        const [periodosAnteriores] = await conexion.query(`
            SELECT
                p.id_periodo,
                p.id_ejercicio,
                p.numero_periodo,
                p.nombre,
                p.fecha_fin
            FROM conta_periodo_contable p
            WHERE p.estado = 'CERRADO'
              AND p.fecha_fin < ?
            ORDER BY p.fecha_fin DESC
            LIMIT 1
        `, [
            periodo.fecha_inicio
        ]);


        const periodoAnterior =
            periodosAnteriores.length > 0
                ? periodosAnteriores[0]
                : null;


        const idPeriodoAnterior =
            periodoAnterior?.id_periodo ?? null;


        // ============================================================
        // 4. ELIMINAR UN SALDO PREVIAMENTE GENERADO
        //
        // Esto permite recalcular un período abierto.
        // ============================================================

        await conexion.query(`
            DELETE FROM conta_saldo_periodo
            WHERE id_ejercicio = ?
              AND id_periodo = ?
        `, [
            periodo.id_ejercicio,
            periodo.id_periodo
        ]);


        // ============================================================
        // 5. CONSTRUIR LOS SALDOS
        //
        // CTE 1:
        // Saldo final del último período cerrado.
        //
        // CTE 2:
        // Movimientos contabilizados del período actual.
        //
        // CTE 3:
        // Unión de:
        //
        // - cuentas con saldo anterior
        // - cuentas con movimiento actual
        //
        // Así contemplamos cuentas nuevas.
        // ============================================================

        const sql = `

            INSERT INTO conta_saldo_periodo (

                id_ejercicio,
                id_periodo,
                idcuenta,

                saldo_inicial_debe,
                saldo_inicial_haber,

                movimiento_debe,
                movimiento_haber,

                saldo_final_debe,
                saldo_final_haber,

                fecha_calculo
            )

            WITH

            -- ========================================================
            -- SALDO DEL ÚLTIMO PERÍODO CERRADO
            -- ========================================================

            saldo_anterior AS (

                SELECT
                    s.idcuenta,

                    s.saldo_final_debe,
                    s.saldo_final_haber

                FROM conta_saldo_periodo s

                WHERE s.id_periodo = ?

            ),


            -- ========================================================
            -- MOVIMIENTOS DEL PERÍODO ACTUAL
            --
            -- SOLO ASIENTOS CONTABILIZADOS
            -- ========================================================

            movimientos AS (

                SELECT

                    d.idcuenta,

                    SUM(d.debe) AS movimiento_debe,

                    SUM(d.haber) AS movimiento_haber

                FROM conta_asiento_contable a

                INNER JOIN conta_asiento_contable_detalle d
                    ON d.id_asiento = a.id_asiento

                WHERE a.id_periodo = ?
                  AND a.estado = 'CONTABILIZADO'

                GROUP BY
                    d.idcuenta
            ),


            -- ========================================================
            -- CUENTAS A PROCESAR
            --
            -- Puede existir:
            --
            -- 1. En el período anterior
            -- 2. En el período actual
            -- 3. En ambos
            -- ========================================================

            cuentas_procesar AS (

                SELECT idcuenta
                FROM saldo_anterior

                UNION

                SELECT idcuenta
                FROM movimientos
            )


            -- ========================================================
            -- RESULTADO FINAL
            -- ========================================================

            SELECT

                ? AS id_ejercicio,

                ? AS id_periodo,

                cp.idcuenta,


                -- ====================================================
                -- SALDO INICIAL
                -- ====================================================

                COALESCE(
                    sa.saldo_final_debe,
                    0.00
                ) AS saldo_inicial_debe,


                COALESCE(
                    sa.saldo_final_haber,
                    0.00
                ) AS saldo_inicial_haber,


                -- ====================================================
                -- MOVIMIENTO DEBE
                -- ====================================================

                COALESCE(
                    m.movimiento_debe,
                    0.00
                ) AS movimiento_debe,


                -- ====================================================
                -- MOVIMIENTO HABER
                -- ====================================================

                COALESCE(
                    m.movimiento_haber,
                    0.00
                ) AS movimiento_haber,


                -- ====================================================
                -- SALDO FINAL DEBE
                --
                -- Aquí aplicamos la naturaleza.
                --
                -- DEUDORA:
                --     Debe - Haber
                --
                -- ACREEDORA:
                --     Haber - Debe
                --
                -- Si el resultado es positivo:
                --     saldo normal
                --
                -- Si es negativo:
                --     saldo en columna contraria.
                -- ====================================================

                CASE

                    WHEN c.naturaleza = 'DEUDORA'
                     AND (

                        COALESCE(sa.saldo_final_debe, 0.00)
                        - COALESCE(sa.saldo_final_haber, 0.00)
                        + COALESCE(m.movimiento_debe, 0.00)
                        - COALESCE(m.movimiento_haber, 0.00)

                     ) > 0

                    THEN (

                        COALESCE(sa.saldo_final_debe, 0.00)
                        - COALESCE(sa.saldo_final_haber, 0.00)
                        + COALESCE(m.movimiento_debe, 0.00)
                        - COALESCE(m.movimiento_haber, 0.00)

                    )


                    WHEN c.naturaleza = 'ACREEDORA'
                     AND (

                        COALESCE(sa.saldo_final_haber, 0.00)
                        - COALESCE(sa.saldo_final_debe, 0.00)
                        + COALESCE(m.movimiento_haber, 0.00)
                        - COALESCE(m.movimiento_debe, 0.00)

                     ) < 0

                    THEN ABS(

                        COALESCE(sa.saldo_final_haber, 0.00)
                        - COALESCE(sa.saldo_final_debe, 0.00)
                        + COALESCE(m.movimiento_haber, 0.00)
                        - COALESCE(m.movimiento_debe, 0.00)

                    )


                    ELSE 0.00

                END AS saldo_final_debe,


                -- ====================================================
                -- SALDO FINAL HABER
                -- ====================================================

                CASE

                    WHEN c.naturaleza = 'DEUDORA'
                     AND (

                        COALESCE(sa.saldo_final_debe, 0.00)
                        - COALESCE(sa.saldo_final_haber, 0.00)
                        + COALESCE(m.movimiento_debe, 0.00)
                        - COALESCE(m.movimiento_haber, 0.00)

                     ) < 0

                    THEN ABS(

                        COALESCE(sa.saldo_final_debe, 0.00)
                        - COALESCE(sa.saldo_final_haber, 0.00)
                        + COALESCE(m.movimiento_debe, 0.00)
                        - COALESCE(m.movimiento_haber, 0.00)

                    )


                    WHEN c.naturaleza = 'ACREEDORA'
                     AND (

                        COALESCE(sa.saldo_final_haber, 0.00)
                        - COALESCE(sa.saldo_final_debe, 0.00)
                        + COALESCE(m.movimiento_haber, 0.00)
                        - COALESCE(m.movimiento_debe, 0.00)

                     ) > 0

                    THEN (

                        COALESCE(sa.saldo_final_haber, 0.00)
                        - COALESCE(sa.saldo_final_debe, 0.00)
                        + COALESCE(m.movimiento_haber, 0.00)
                        - COALESCE(m.movimiento_debe, 0.00)

                    )


                    ELSE 0.00

                END AS saldo_final_haber,


                NOW() AS fecha_calculo


            FROM cuentas_procesar cp

            INNER JOIN cuentas_contables c
                ON c.idcuenta = cp.idcuenta

            LEFT JOIN saldo_anterior sa
                ON sa.idcuenta = cp.idcuenta

            LEFT JOIN movimientos m
                ON m.idcuenta = cp.idcuenta
        `;


        const parametros = [

            // --------------------------------------------------------
            // saldo_anterior
            // --------------------------------------------------------

            idPeriodoAnterior,


            // --------------------------------------------------------
            // movimientos
            // --------------------------------------------------------

            periodo.id_periodo,


            // --------------------------------------------------------
            // INSERT
            // --------------------------------------------------------

            periodo.id_ejercicio,
            periodo.id_periodo
        ];


        await conexion.query(
            sql,
            parametros
        );


        // ============================================================
        // 6. VALIDAR MOVIMIENTOS
        //
        // Todo período contable debe cumplir:
        //
        // TOTAL DEBE = TOTAL HABER
        // ============================================================

        const [resumen] = await conexion.query(`
            SELECT

                COUNT(*) AS cuentas_procesadas,

                COALESCE(
                    SUM(movimiento_debe),
                    0
                ) AS total_movimiento_debe,

                COALESCE(
                    SUM(movimiento_haber),
                    0
                ) AS total_movimiento_haber,

                COALESCE(
                    SUM(saldo_final_debe),
                    0
                ) AS total_saldo_final_debe,

                COALESCE(
                    SUM(saldo_final_haber),
                    0
                ) AS total_saldo_final_haber

            FROM conta_saldo_periodo

            WHERE id_ejercicio = ?
              AND id_periodo = ?
        `, [
            periodo.id_ejercicio,
            periodo.id_periodo
        ]);


        const resultado = resumen[0];


        const totalDebe =
            Number(resultado.total_movimiento_debe);


        const totalHaber =
            Number(resultado.total_movimiento_haber);


        // ============================================================
        // 7. VALIDAR PARTIDA DOBLE
        // ============================================================

        if (
            Math.abs(totalDebe - totalHaber) > 0.01
        ) {

            throw new Error(
                `El período ${periodo.nombre} no está cuadrado. ` +
                `Debe: ${totalDebe.toFixed(2)} | ` +
                `Haber: ${totalHaber.toFixed(2)}`
            );
        }


        // ============================================================
        // 8. CONFIRMAR TRANSACCIÓN
        // ============================================================

        await conexion.commit();


        return {

            ok: true,

            id_ejercicio:
                periodo.id_ejercicio,

            id_periodo:
                periodo.id_periodo,

            periodo:
                periodo.nombre,

            periodo_anterior:
                periodoAnterior
                    ? periodoAnterior.nombre
                    : null,

            cuentas_procesadas:
                Number(resultado.cuentas_procesadas),

            movimiento_debe:
                Number(resultado.total_movimiento_debe),

            movimiento_haber:
                Number(resultado.total_movimiento_haber),

            saldo_final_debe:
                Number(resultado.total_saldo_final_debe),

            saldo_final_haber:
                Number(resultado.total_saldo_final_haber)
        };


    } catch (error) {
        if (conexion) {
            try {
                await conexion.rollback();
            } catch (rollbackError) {
                console.error(
                    'Error realizando rollback:',
                    rollbackError
                );
            }
        }
        console.error(
            'Error generando saldo del período:',
            error
        );
        throw error;
    } finally {
        if (conexion) {
            conexion.release();
        }
    }
}

//Visualizar balanza
async function consultarBalanza(id_periodo) {

    let conexion;

    try {

        conexion = await pool.getConnection();

        // ============================================================
        // 1. OBTENER INFORMACIÓN DEL PERÍODO
        // ============================================================

        const [periodos] = await conexion.query(`
            SELECT
                p.id_periodo,
                p.id_ejercicio,
                p.numero_periodo,
                p.nombre AS periodo,
                p.fecha_inicio,
                p.fecha_fin,

                e.anio,
                e.estado AS estado_ejercicio

            FROM conta_periodo_contable p

            INNER JOIN conta_ejercicio_contable e
                ON e.id_ejercicio = p.id_ejercicio

            WHERE p.id_periodo = ?

            LIMIT 1
        `, [id_periodo]);


        if (periodos.length === 0) {
            throw new Error(
                'El período contable no existe.'
            );
        }


        const periodo = periodos[0];


        // ============================================================
        // 2. OBTENER BALANZA
        //
        // SOLO cuentas que tengan registro en
        // conta_saldo_periodo.
        //
        // No consultamos nuevamente los asientos.
        // ============================================================

        const [cuentas] = await conexion.query(`
            SELECT

                s.id_saldo,

                c.idcuenta,
                c.codigo,
                c.nombre,
                c.tipo,
                c.naturaleza,
                c.nivel,
                c.idcuenta_padre,

                s.saldo_inicial_debe,
                s.saldo_inicial_haber,

                s.movimiento_debe,
                s.movimiento_haber,

                s.saldo_final_debe,
                s.saldo_final_haber

            FROM conta_saldo_periodo s

            INNER JOIN cuentas_contables c
                ON c.idcuenta = s.idcuenta

            WHERE s.id_ejercicio = ?
              AND s.id_periodo = ?

            ORDER BY
                c.codigo
        `, [
            periodo.id_ejercicio,
            periodo.id_periodo
        ]);


        // ============================================================
        // 3. CALCULAR TOTALES
        // ============================================================

        const totales = {

            saldo_inicial_debe: 0,
            saldo_inicial_haber: 0,

            movimiento_debe: 0,
            movimiento_haber: 0,

            saldo_final_debe: 0,
            saldo_final_haber: 0
        };


        for (const cuenta of cuentas) {

            totales.saldo_inicial_debe +=
                Number(cuenta.saldo_inicial_debe);

            totales.saldo_inicial_haber +=
                Number(cuenta.saldo_inicial_haber);


            totales.movimiento_debe +=
                Number(cuenta.movimiento_debe);

            totales.movimiento_haber +=
                Number(cuenta.movimiento_haber);


            totales.saldo_final_debe +=
                Number(cuenta.saldo_final_debe);

            totales.saldo_final_haber +=
                Number(cuenta.saldo_final_haber);
        }


        // ============================================================
        // 4. REDONDEAR TOTALES
        // ============================================================

        for (const campo of Object.keys(totales)) {

            totales[campo] =
                Number(totales[campo].toFixed(2));
        }


        // ============================================================
        // 5. VALIDAR BALANZA
        // ============================================================

        const diferenciaMovimientos =
            Math.abs(
                totales.movimiento_debe -
                totales.movimiento_haber
            );


        const diferenciaSaldoFinal =
            Math.abs(
                totales.saldo_final_debe -
                totales.saldo_final_haber
            );


        return {

            ok: true,

            periodo: {

                id_periodo:
                    periodo.id_periodo,

                id_ejercicio:
                    periodo.id_ejercicio,

                anio:
                    periodo.anio,

                numero_periodo:
                    periodo.numero_periodo,

                nombre:
                    periodo.periodo,

                fecha_inicio:
                    periodo.fecha_inicio,

                fecha_fin:
                    periodo.fecha_fin,

                estado_ejercicio:
                    periodo.estado_ejercicio
            },


            cuentas,


            totales,


            validacion: {

                movimientos_cuadrados:
                    diferenciaMovimientos <= 0.01,

                saldo_final_cuadrado:
                    diferenciaSaldoFinal <= 0.01,

                diferencia_movimientos:
                    Number(
                        diferenciaMovimientos.toFixed(2)
                    ),

                diferencia_saldo_final:
                    Number(
                        diferenciaSaldoFinal.toFixed(2)
                    )
            }
        };


    } catch (error) {

        console.error(
            'Error consultando balanza contable:',
            error
        );

        throw error;


    } finally {

        if (conexion) {
            conexion.release();
        }
    }
}



//Visualizar Balanza general 
async function consultarBalanceGeneral(id_periodo) {

    let conexion;

    try {

        conexion = await pool.getConnection();

        // ============================================================
        // 1. OBTENER PERÍODO
        // ============================================================

        const [periodos] = await conexion.query(`
            SELECT
                p.id_periodo,
                p.id_ejercicio,
                p.numero_periodo,
                p.nombre AS periodo,
                p.fecha_inicio,
                p.fecha_fin,

                e.anio,
                e.estado AS estado_ejercicio

            FROM conta_periodo_contable p

            INNER JOIN conta_ejercicio_contable e
                ON e.id_ejercicio = p.id_ejercicio

            WHERE p.id_periodo = ?

            LIMIT 1
        `, [id_periodo]);


        if (periodos.length === 0) {

            throw new Error(
                'El período contable no existe.'
            );

        }


        const periodo = periodos[0];


        // ============================================================
        // 2. OBTENER SALDOS
        //
        // SOLO UTILIZAMOS EL SALDO FINAL DEL PERÍODO.
        // ============================================================

        const [saldos] = await conexion.query(`

            SELECT

                s.idcuenta,

                c.codigo,
                c.nombre,
                c.idcuenta_padre,
                c.nivel,
                c.tipo,
                c.naturaleza,

                s.saldo_final_debe,
                s.saldo_final_haber

            FROM conta_saldo_periodo s

            INNER JOIN cuentas_contables c
                ON c.idcuenta = s.idcuenta

            WHERE s.id_ejercicio = ?
              AND s.id_periodo = ?

            ORDER BY
                c.codigo

        `, [
            periodo.id_ejercicio,
            periodo.id_periodo
        ]);


        // ============================================================
        // 3. SEPARAR CUENTAS
        // ============================================================

        const activo = [];

        const pasivo = [];

        const patrimonio = [];

        const ingresos = [];

        const gastos = [];


        for (const cuenta of saldos) {

            const item = {

                idcuenta:
                    cuenta.idcuenta,

                codigo:
                    cuenta.codigo,

                nombre:
                    cuenta.nombre,

                idcuenta_padre:
                    cuenta.idcuenta_padre,

                nivel:
                    cuenta.nivel,

                tipo:
                    cuenta.tipo,

                naturaleza:
                    cuenta.naturaleza,

                saldo_final_debe:
                    Number(
                        cuenta.saldo_final_debe
                    ),

                saldo_final_haber:
                    Number(
                        cuenta.saldo_final_haber
                    )
            };


            // --------------------------------------------------------
            // ACTIVO
            // --------------------------------------------------------

            if (cuenta.codigo.startsWith('1.')) {

                activo.push(item);

            }


            // --------------------------------------------------------
            // PASIVO
            // --------------------------------------------------------

            else if (cuenta.codigo.startsWith('2.')) {

                pasivo.push(item);

            }


            // --------------------------------------------------------
            // PATRIMONIO
            // --------------------------------------------------------

            else if (cuenta.codigo.startsWith('3.')) {

                patrimonio.push(item);

            }


            // --------------------------------------------------------
            // INGRESOS
            // --------------------------------------------------------

            else if (cuenta.codigo.startsWith('4.')) {

                ingresos.push(item);

            }


            // --------------------------------------------------------
            // GASTOS
            // --------------------------------------------------------

            else if (cuenta.codigo.startsWith('5.')) {

                gastos.push(item);

            }
        }


        // ============================================================
        // 4. CALCULAR RESULTADO DEL PERÍODO
        // ============================================================

        let totalIngresos = 0;

        let totalGastos = 0;


        for (const cuenta of ingresos) {

            /*
             * Las cuentas de ingresos normalmente son acreedoras.
             *
             * Saldo = Haber - Debe
             */

            totalIngresos +=
                Number(cuenta.saldo_final_haber)
                -
                Number(cuenta.saldo_final_debe);
        }


        for (const cuenta of gastos) {

            /*
             * Los gastos normalmente son deudores.
             *
             * Saldo = Debe - Haber
             */

            totalGastos +=
                Number(cuenta.saldo_final_debe)
                -
                Number(cuenta.saldo_final_haber);
        }


        totalIngresos =
            Number(totalIngresos.toFixed(2));


        totalGastos =
            Number(totalGastos.toFixed(2));


        const resultadoPeriodo =
            Number(
                (
                    totalIngresos -
                    totalGastos
                ).toFixed(2)
            );


        // ============================================================
        // 5. CALCULAR TOTALES DEL ACTIVO
        // ============================================================

        let totalActivo = 0;


        for (const cuenta of activo) {

            /*
             * Si la cuenta es DEUDORA:
             *
             *     Debe - Haber
             *
             * Si es ACREEDORA:
             *
             *     Haber - Debe
             *
             * Esto permite manejar correctamente cuentas
             * correctoras como:
             *
             *     Depreciación acumulada
             */

            let saldo;


            if (cuenta.naturaleza === 'DEUDORA') {

                saldo =
                    Number(cuenta.saldo_final_debe)
                    -
                    Number(cuenta.saldo_final_haber);

            } else {

                saldo =
                    Number(cuenta.saldo_final_haber)
                    -
                    Number(cuenta.saldo_final_debe);
            }


            totalActivo += saldo;
        }


        totalActivo =
            Number(
                totalActivo.toFixed(2)
            );


        // ============================================================
        // 6. CALCULAR TOTAL PASIVO
        // ============================================================

        let totalPasivo = 0;


        for (const cuenta of pasivo) {

            if (cuenta.naturaleza === 'ACREEDORA') {

                totalPasivo +=
                    Number(cuenta.saldo_final_haber)
                    -
                    Number(cuenta.saldo_final_debe);

            } else {

                totalPasivo +=
                    Number(cuenta.saldo_final_debe)
                    -
                    Number(cuenta.saldo_final_haber);
            }
        }


        totalPasivo =
            Number(
                totalPasivo.toFixed(2)
            );


        // ============================================================
        // 7. CALCULAR PATRIMONIO
        // ============================================================

        let totalPatrimonio = 0;


        for (const cuenta of patrimonio) {

            if (cuenta.naturaleza === 'ACREEDORA') {

                totalPatrimonio +=
                    Number(cuenta.saldo_final_haber)
                    -
                    Number(cuenta.saldo_final_debe);

            } else {

                totalPatrimonio +=
                    Number(cuenta.saldo_final_debe)
                    -
                    Number(cuenta.saldo_final_haber);
            }
        }


        totalPatrimonio =
            Number(
                totalPatrimonio.toFixed(2)
            );


        // ============================================================
        // 8. PATRIMONIO + RESULTADO
        // ============================================================

        const patrimonioConResultado =
            Number(
                (
                    totalPatrimonio +
                    resultadoPeriodo
                ).toFixed(2)
            );


        // ============================================================
        // 9. PASIVO + PATRIMONIO
        // ============================================================

        const totalPasivoPatrimonio =
            Number(
                (
                    totalPasivo +
                    patrimonioConResultado
                ).toFixed(2)
            );


        // ============================================================
        // 10. VALIDAR BALANCE
        // ============================================================

        const diferencia =
            Number(
                (
                    totalActivo -
                    totalPasivoPatrimonio
                ).toFixed(2)
            );


        const balanceCuadrado =
            Math.abs(diferencia) <= 0.01;


        // ============================================================
        // 11. RETORNAR RESULTADO
        // ============================================================

        return {

            ok: true,


            periodo: {

                id_periodo:
                    periodo.id_periodo,

                id_ejercicio:
                    periodo.id_ejercicio,

                anio:
                    periodo.anio,

                numero_periodo:
                    periodo.numero_periodo,

                nombre:
                    periodo.periodo,

                fecha_inicio:
                    periodo.fecha_inicio,

                fecha_fin:
                    periodo.fecha_fin,

                estado_ejercicio:
                    periodo.estado_ejercicio
            },


            activo: {

                cuentas: activo,

                total:
                    totalActivo
            },


            pasivo: {

                cuentas: pasivo,

                total:
                    totalPasivo
            },


            patrimonio: {

                cuentas: patrimonio,

                total:
                    totalPatrimonio,

                resultado_periodo:
                    resultadoPeriodo,

                total_con_resultado:
                    patrimonioConResultado
            },


            resultado: {

                ingresos:
                    totalIngresos,

                gastos:
                    totalGastos,

                resultado:
                    resultadoPeriodo,

                tipo:
                    resultadoPeriodo > 0
                        ? 'UTILIDAD'
                        : resultadoPeriodo < 0
                            ? 'PERDIDA'
                            : 'SIN_RESULTADO'
            },


            total_pasivo_patrimonio:
                totalPasivoPatrimonio,


            validacion: {

                balance_cuadrado:
                    balanceCuadrado,

                diferencia:
                    diferencia
            }
        };


    } catch (error) {

        console.error(
            'Error consultando Balance General:',
            error
        );

        throw error;


    } finally {

        if (conexion) {

            conexion.release();

        }
    }
}

//Estado de resultado
async function consultarEstadoResultados(id_periodo) {

    let conexion;

    try {

        conexion = await pool.getConnection();


        // ============================================================
        // 1. OBTENER INFORMACIÓN DEL PERÍODO
        // ============================================================

        const [periodos] = await conexion.query(`
            SELECT
                p.id_periodo,
                p.id_ejercicio,
                p.numero_periodo,
                p.nombre AS periodo,
                p.fecha_inicio,
                p.fecha_fin,

                e.anio,
                e.estado AS estado_ejercicio

            FROM conta_periodo_contable p

            INNER JOIN conta_ejercicio_contable e
                ON e.id_ejercicio = p.id_ejercicio

            WHERE p.id_periodo = ?

            LIMIT 1
        `, [id_periodo]);


        if (periodos.length === 0) {

            throw new Error(
                'El período contable no existe.'
            );

        }


        const periodo = periodos[0];


        // ============================================================
        // 2. OBTENER SALDOS DE INGRESOS Y GASTOS
        //
        // 4 = INGRESOS
        // 5 = GASTOS
        //
        // Utilizamos conta_saldo_periodo.
        // NO consultamos los asientos.
        // ============================================================

        const [saldos] = await conexion.query(`

            SELECT

                s.idcuenta,

                c.codigo,
                c.nombre,
                c.idcuenta_padre,
                c.nivel,
                c.tipo,
                c.naturaleza,

                s.saldo_final_debe,
                s.saldo_final_haber

            FROM conta_saldo_periodo s

            INNER JOIN cuentas_contables c
                ON c.idcuenta = s.idcuenta

            WHERE s.id_ejercicio = ?
              AND s.id_periodo = ?

              AND (
                    c.codigo LIKE '4.%'
                    OR
                    c.codigo LIKE '5.%'
                  )

            ORDER BY
                c.codigo

        `, [
            periodo.id_ejercicio,
            periodo.id_periodo
        ]);


        // ============================================================
        // 3. SEPARAR INGRESOS Y GASTOS
        // ============================================================

        const ingresos = [];

        const gastos = [];


        for (const cuenta of saldos) {

            const debe =
                Number(cuenta.saldo_final_debe || 0);

            const haber =
                Number(cuenta.saldo_final_haber || 0);


            let saldo = 0;


            // ========================================================
            // INGRESOS
            // ========================================================

            if (cuenta.codigo.startsWith('4.')) {

                /*
                 * Los ingresos normalmente son acreedores:
                 *
                 * Haber - Debe
                 */

                saldo = haber - debe;


                ingresos.push({

                    idcuenta:
                        cuenta.idcuenta,

                    codigo:
                        cuenta.codigo,

                    nombre:
                        cuenta.nombre,

                    idcuenta_padre:
                        cuenta.idcuenta_padre,

                    nivel:
                        cuenta.nivel,

                    tipo:
                        cuenta.tipo,

                    naturaleza:
                        cuenta.naturaleza,

                    saldo_final_debe:
                        debe,

                    saldo_final_haber:
                        haber,

                    saldo:
                        Number(saldo.toFixed(2))
                });

            }


            // ========================================================
            // GASTOS
            // ========================================================

            else if (cuenta.codigo.startsWith('5.')) {

                /*
                 * Los gastos normalmente son deudores:
                 *
                 * Debe - Haber
                 */

                saldo = debe - haber;


                gastos.push({

                    idcuenta:
                        cuenta.idcuenta,

                    codigo:
                        cuenta.codigo,

                    nombre:
                        cuenta.nombre,

                    idcuenta_padre:
                        cuenta.idcuenta_padre,

                    nivel:
                        cuenta.nivel,

                    tipo:
                        cuenta.tipo,

                    naturaleza:
                        cuenta.naturaleza,

                    saldo_final_debe:
                        debe,

                    saldo_final_haber:
                        haber,

                    saldo:
                        Number(saldo.toFixed(2))
                });

            }

        }


        // ============================================================
        // 4. TOTAL INGRESOS
        // ============================================================

        let totalIngresos = 0;


        for (const cuenta of ingresos) {

            totalIngresos += cuenta.saldo;

        }


        totalIngresos =
            Number(
                totalIngresos.toFixed(2)
            );


        // ============================================================
        // 5. TOTAL GASTOS
        // ============================================================

        let totalGastos = 0;


        for (const cuenta of gastos) {

            totalGastos += cuenta.saldo;

        }


        totalGastos =
            Number(
                totalGastos.toFixed(2)
            );


        // ============================================================
        // 6. RESULTADO DEL PERÍODO
        // ============================================================

        const resultado =
            Number(
                (
                    totalIngresos -
                    totalGastos
                ).toFixed(2)
            );


        // ============================================================
        // 7. DETERMINAR UTILIDAD / PÉRDIDA
        // ============================================================

        let tipoResultado;


        if (resultado > 0) {

            tipoResultado = 'UTILIDAD';

        }

        else if (resultado < 0) {

            tipoResultado = 'PERDIDA';

        }

        else {

            tipoResultado = 'SIN_RESULTADO';

        }


        // ============================================================
        // 8. RETORNAR ESTADO DE RESULTADOS
        // ============================================================

        return {

            ok: true,

            periodo: {

                id_periodo:
                    periodo.id_periodo,

                id_ejercicio:
                    periodo.id_ejercicio,

                anio:
                    periodo.anio,

                numero_periodo:
                    periodo.numero_periodo,

                nombre:
                    periodo.periodo,

                fecha_inicio:
                    periodo.fecha_inicio,

                fecha_fin:
                    periodo.fecha_fin,

                estado_ejercicio:
                    periodo.estado_ejercicio
            },


            ingresos: {

                cuentas:
                    ingresos,

                total:
                    totalIngresos
            },


            gastos: {

                cuentas:
                    gastos,

                total:
                    totalGastos
            },


            resultado: {

                ingresos:
                    totalIngresos,

                gastos:
                    totalGastos,

                resultado:
                    resultado,

                tipo:
                    tipoResultado
            }

        };


    }

    catch (error) {

        console.error(
            'Error consultando Estado de Resultados:',
            error
        );

        throw error;

    }

    finally {

        if (conexion) {

            conexion.release();

        }
    }
}

//libro diarios
async function consultarLibroDiario(id_periodo) {

    let conexion;

    try {

        conexion = await pool.getConnection();


        // ============================================================
        // 1. OBTENER INFORMACIÓN DEL PERÍODO
        // ============================================================

        const [periodos] = await conexion.query(`
            SELECT
                p.id_periodo,
                p.id_ejercicio,
                p.numero_periodo,
                p.nombre AS periodo,
                p.fecha_inicio,
                p.fecha_fin,

                e.anio,
                e.estado AS estado_ejercicio

            FROM conta_periodo_contable p

            INNER JOIN conta_ejercicio_contable e
                ON e.id_ejercicio = p.id_ejercicio

            WHERE p.id_periodo = ?

            LIMIT 1
        `, [id_periodo]);


        if (periodos.length === 0) {

            throw new Error(
                'El período contable no existe.'
            );

        }


        const periodo = periodos[0];


        // ============================================================
        // 2. OBTENER ASIENTOS Y DETALLES
        // ============================================================

        const [registros] = await conexion.query(`

            SELECT

                /* ====================================================
                   ASIENTO
                   ==================================================== */

                a.id_asiento,
                a.numero_asiento,
                a.fecha,
                a.concepto,
                a.tipo_asiento,
                a.origen,
                a.referencia,
                a.estado,

                a.usuario_creacion,
                a.fecha_creacion,

                a.usuario_contabilizacion,
                a.fecha_contabilizacion,


                /* ====================================================
                   DETALLE
                   ==================================================== */

                d.id_detalle,
                d.idcuenta,
                d.descripcion,
                d.debe,
                d.haber,
                d.orden,


                /* ====================================================
                   CUENTA
                   ==================================================== */

                c.codigo,
                c.nombre AS cuenta,
                c.naturaleza,
                c.tipo AS tipo_cuenta,
                c.nivel

            FROM conta_asiento_contable a

            INNER JOIN conta_asiento_contable_detalle d
                ON d.id_asiento = a.id_asiento

            INNER JOIN cuentas_contables c
                ON c.idcuenta = d.idcuenta

            WHERE a.id_periodo = ?

              AND a.estado = 'CONTABILIZADO'

            ORDER BY

                a.fecha ASC,
                a.id_asiento ASC,
                d.orden ASC

        `, [id_periodo]);


        // ============================================================
        // 3. AGRUPAR DETALLES POR ASIENTO
        // ============================================================

        const mapaAsientos = new Map();


        for (const registro of registros) {

            const idAsiento =
                registro.id_asiento;


            // --------------------------------------------------------
            // Crear asiento si todavía no existe
            // --------------------------------------------------------

            if (!mapaAsientos.has(idAsiento)) {

                mapaAsientos.set(
                    idAsiento,
                    {

                        id_asiento:
                            registro.id_asiento,

                        numero_asiento:
                            registro.numero_asiento,

                        fecha:
                            registro.fecha,

                        concepto:
                            registro.concepto,

                        tipo_asiento:
                            registro.tipo_asiento,

                        origen:
                            registro.origen,

                        referencia:
                            registro.referencia,

                        estado:
                            registro.estado,

                        usuario_creacion:
                            registro.usuario_creacion,

                        fecha_creacion:
                            registro.fecha_creacion,

                        usuario_contabilizacion:
                            registro.usuario_contabilizacion,

                        fecha_contabilizacion:
                            registro.fecha_contabilizacion,


                        detalles: [],


                        total_debe:
                            0,

                        total_haber:
                            0
                    }
                );

            }


            const asiento =
                mapaAsientos.get(idAsiento);


            // --------------------------------------------------------
            // Convertir valores numéricos
            // --------------------------------------------------------

            const debe =
                Number(
                    registro.debe || 0
                );


            const haber =
                Number(
                    registro.haber || 0
                );


            // --------------------------------------------------------
            // Agregar detalle
            // --------------------------------------------------------

            asiento.detalles.push({

                id_detalle:
                    registro.id_detalle,

                idcuenta:
                    registro.idcuenta,

                codigo:
                    registro.codigo,

                cuenta:
                    registro.cuenta,

                descripcion:
                    registro.descripcion,

                naturaleza:
                    registro.naturaleza,

                tipo_cuenta:
                    registro.tipo_cuenta,

                nivel:
                    registro.nivel,

                debe:
                    debe,

                haber:
                    haber,

                orden:
                    registro.orden
            });


            // --------------------------------------------------------
            // Totales del asiento
            // --------------------------------------------------------

            asiento.total_debe += debe;

            asiento.total_haber += haber;

        }


        // ============================================================
        // 4. CONVERTIR MAP A ARRAY
        // ============================================================

        const asientos =
            Array.from(
                mapaAsientos.values()
            );


        // ============================================================
        // 5. FORMATEAR TOTALES DE CADA ASIENTO
        // ============================================================

        for (const asiento of asientos) {

            asiento.total_debe =
                Number(
                    asiento.total_debe.toFixed(2)
                );


            asiento.total_haber =
                Number(
                    asiento.total_haber.toFixed(2)
                );


            asiento.diferencia =
                Number(
                    (
                        asiento.total_debe -
                        asiento.total_haber
                    ).toFixed(2)
                );


            asiento.cuadrado =
                Math.abs(
                    asiento.diferencia
                ) <= 0.01;

        }


        // ============================================================
        // 6. TOTALES GENERALES
        // ============================================================

        let totalDebe = 0;

        let totalHaber = 0;


        for (const asiento of asientos) {

            totalDebe +=
                asiento.total_debe;

            totalHaber +=
                asiento.total_haber;

        }


        totalDebe =
            Number(
                totalDebe.toFixed(2)
            );


        totalHaber =
            Number(
                totalHaber.toFixed(2)
            );


        const diferencia =
            Number(
                (
                    totalDebe -
                    totalHaber
                ).toFixed(2)
            );


        const cuadrado =
            Math.abs(diferencia) <= 0.01;


        // ============================================================
        // 7. RETORNAR LIBRO DIARIO
        // ============================================================

        return {

            ok: true,


            periodo: {

                id_periodo:
                    periodo.id_periodo,

                id_ejercicio:
                    periodo.id_ejercicio,

                anio:
                    periodo.anio,

                numero_periodo:
                    periodo.numero_periodo,

                nombre:
                    periodo.periodo,

                fecha_inicio:
                    periodo.fecha_inicio,

                fecha_fin:
                    periodo.fecha_fin,

                estado_ejercicio:
                    periodo.estado_ejercicio
            },


            cantidad_asientos:
                asientos.length,


            asientos:
                asientos,


            totales: {

                debe:
                    totalDebe,

                haber:
                    totalHaber,

                diferencia:
                    diferencia,

                cuadrado:
                    cuadrado
            }

        };


    }

    catch (error) {

        console.error(
            'Error consultando Libro Diario:',
            error
        );

        throw error;

    }

    finally {

        if (conexion) {

            conexion.release();

        }

    }

}



//Libro Mayor
async function consultarLibroMayor(id_periodo, idcuenta = null) {

    let conexion;

    try {

        conexion = await pool.getConnection();


        // ============================================================
        // 1. INFORMACIÓN DEL PERÍODO
        // ============================================================

        const [periodos] = await conexion.query(`

            SELECT

                p.id_periodo,
                p.id_ejercicio,
                p.numero_periodo,
                p.nombre AS periodo,
                p.fecha_inicio,
                p.fecha_fin,

                e.anio,
                e.estado AS estado_ejercicio

            FROM conta_periodo_contable p

            INNER JOIN conta_ejercicio_contable e
                ON e.id_ejercicio = p.id_ejercicio

            WHERE p.id_periodo = ?

            LIMIT 1

        `, [id_periodo]);


        if (periodos.length === 0) {

            throw new Error(
                'El período contable no existe.'
            );

        }


        const periodo = periodos[0];


        // ============================================================
        // 2. FILTRO OPCIONAL DE CUENTA
        // ============================================================

        let filtroCuenta = '';

        const parametrosMovimientos = [
            id_periodo
        ];


        if (idcuenta !== null && idcuenta !== undefined) {

            filtroCuenta = `
                AND d.idcuenta = ?
            `;

            parametrosMovimientos.push(
                idcuenta
            );

        }


        // ============================================================
        // 3. OBTENER MOVIMIENTOS
        // ============================================================

        const [movimientos] = await conexion.query(`

            SELECT

                /* ====================================================
                   ASIENTO
                   ==================================================== */

                a.id_asiento,
                a.numero_asiento,
                a.fecha,
                a.concepto,
                a.tipo_asiento,
                a.origen,
                a.referencia,


                /* ====================================================
                   DETALLE
                   ==================================================== */

                d.id_detalle,
                d.idcuenta,
                d.descripcion,
                d.debe,
                d.haber,
                d.orden,


                /* ====================================================
                   CUENTA
                   ==================================================== */

                c.codigo,
                c.nombre AS cuenta,
                c.naturaleza,
                c.tipo AS tipo_cuenta,
                c.nivel

            FROM conta_asiento_contable a

            INNER JOIN conta_asiento_contable_detalle d
                ON d.id_asiento = a.id_asiento

            INNER JOIN cuentas_contables c
                ON c.idcuenta = d.idcuenta

            WHERE a.id_periodo = ?

              AND a.estado = 'CONTABILIZADO'

              ${filtroCuenta}

            ORDER BY

                d.idcuenta ASC,
                a.fecha ASC,
                a.id_asiento ASC,
                d.orden ASC

        `, parametrosMovimientos);


        // ============================================================
        // 4. OBTENER SALDOS DEL PERÍODO
        //
        // Estos representan el saldo con el que inicia el período.
        // ============================================================

        let filtroSaldo = '';

        const parametrosSaldo = [
            periodo.id_ejercicio,
            periodo.id_periodo
        ];


        if (idcuenta !== null && idcuenta !== undefined) {

            filtroSaldo = `
                AND s.idcuenta = ?
            `;

            parametrosSaldo.push(
                idcuenta
            );

        }


        const [saldos] = await conexion.query(`

            SELECT

                s.idcuenta,

                s.saldo_inicial_debe,
                s.saldo_inicial_haber,

                c.codigo,
                c.nombre AS cuenta,
                c.naturaleza,
                c.tipo AS tipo_cuenta,
                c.nivel

            FROM conta_saldo_periodo s

            INNER JOIN cuentas_contables c
                ON c.idcuenta = s.idcuenta

            WHERE s.id_ejercicio = ?

              AND s.id_periodo = ?

              ${filtroSaldo}

        `, parametrosSaldo);


        // ============================================================
        // 5. MAPA DE SALDOS INICIALES
        // ============================================================

        const mapaSaldos = new Map();


        for (const saldo of saldos) {

            mapaSaldos.set(

                Number(saldo.idcuenta),

                {

                    debe:
                        Number(
                            saldo.saldo_inicial_debe || 0
                        ),

                    haber:
                        Number(
                            saldo.saldo_inicial_haber || 0
                        ),

                    codigo:
                        saldo.codigo,

                    cuenta:
                        saldo.cuenta,

                    naturaleza:
                        saldo.naturaleza,

                    tipo_cuenta:
                        saldo.tipo_cuenta,

                    nivel:
                        saldo.nivel

                }

            );

        }


        // ============================================================
        // 6. AGRUPAR MOVIMIENTOS POR CUENTA
        // ============================================================

        const mapaCuentas = new Map();


        for (const movimiento of movimientos) {

            const cuentaId =
                Number(
                    movimiento.idcuenta
                );


            if (!mapaCuentas.has(cuentaId)) {

                const saldoInicial =
                    mapaSaldos.get(cuentaId);


                mapaCuentas.set(

                    cuentaId,

                    {

                        idcuenta:
                            cuentaId,

                        codigo:
                            movimiento.codigo,

                        cuenta:
                            movimiento.cuenta,

                        naturaleza:
                            movimiento.naturaleza,

                        tipo_cuenta:
                            movimiento.tipo_cuenta,

                        nivel:
                            movimiento.nivel,


                        saldo_inicial_debe:
                            saldoInicial?.debe || 0,

                        saldo_inicial_haber:
                            saldoInicial?.haber || 0,


                        movimientos: [],


                        total_movimiento_debe:
                            0,

                        total_movimiento_haber:
                            0

                    }

                );

            }


            const cuenta =
                mapaCuentas.get(cuentaId);


            const debe =
                Number(
                    movimiento.debe || 0
                );


            const haber =
                Number(
                    movimiento.haber || 0
                );


            // --------------------------------------------------------
            // Agregar movimiento
            // --------------------------------------------------------

            cuenta.movimientos.push({

                id_detalle:
                    movimiento.id_detalle,

                id_asiento:
                    movimiento.id_asiento,

                numero_asiento:
                    movimiento.numero_asiento,

                fecha:
                    movimiento.fecha,

                concepto:
                    movimiento.concepto,

                descripcion:
                    movimiento.descripcion,

                tipo_asiento:
                    movimiento.tipo_asiento,

                origen:
                    movimiento.origen,

                referencia:
                    movimiento.referencia,

                debe:
                    debe,

                haber:
                    haber,

                orden:
                    movimiento.orden

            });


            // --------------------------------------------------------
            // Acumular movimientos
            // --------------------------------------------------------

            cuenta.total_movimiento_debe +=
                debe;

            cuenta.total_movimiento_haber +=
                haber;

        }


        // ============================================================
        // 7. INCLUIR CUENTAS QUE SOLO TENGAN SALDO INICIAL
        //
        // Esto es importante.
        //
        // Una cuenta puede tener saldo inicial pero ningún movimiento
        // durante el período.
        // ============================================================

        for (const [cuentaId, saldo] of mapaSaldos) {

            if (!mapaCuentas.has(cuentaId)) {

                mapaCuentas.set(

                    cuentaId,

                    {

                        idcuenta:
                            cuentaId,

                        codigo:
                            saldo.codigo,

                        cuenta:
                            saldo.cuenta,

                        naturaleza:
                            saldo.naturaleza,

                        tipo_cuenta:
                            saldo.tipo_cuenta,

                        nivel:
                            saldo.nivel,


                        saldo_inicial_debe:
                            saldo.debe,

                        saldo_inicial_haber:
                            saldo.haber,


                        movimientos: [],


                        total_movimiento_debe:
                            0,

                        total_movimiento_haber:
                            0

                    }

                );

            }

        }


        // ============================================================
        // 8. CALCULAR SALDOS FINALES
        // ============================================================

        const cuentas =
            Array.from(
                mapaCuentas.values()
            );


        for (const cuenta of cuentas) {

            cuenta.saldo_inicial_debe =
                Number(
                    cuenta.saldo_inicial_debe.toFixed(2)
                );


            cuenta.saldo_inicial_haber =
                Number(
                    cuenta.saldo_inicial_haber.toFixed(2)
                );


            cuenta.total_movimiento_debe =
                Number(
                    cuenta.total_movimiento_debe.toFixed(2)
                );


            cuenta.total_movimiento_haber =
                Number(
                    cuenta.total_movimiento_haber.toFixed(2)
                );


            // --------------------------------------------------------
            // TOTAL DEBE / HABER
            // --------------------------------------------------------

            const totalDebe =

                cuenta.saldo_inicial_debe +
                cuenta.total_movimiento_debe;


            const totalHaber =

                cuenta.saldo_inicial_haber +
                cuenta.total_movimiento_haber;


            cuenta.total_debe =
                Number(
                    totalDebe.toFixed(2)
                );


            cuenta.total_haber =
                Number(
                    totalHaber.toFixed(2)
                );


            // --------------------------------------------------------
            // SALDO SEGÚN NATURALEZA
            // --------------------------------------------------------

            let saldoFinal = 0;


            if (
                cuenta.naturaleza === 'DEUDORA'
            ) {

                saldoFinal =
                    totalDebe -
                    totalHaber;

            }

            else {

                saldoFinal =
                    totalHaber -
                    totalDebe;

            }


            cuenta.saldo_final =
                Number(
                    saldoFinal.toFixed(2)
                );


            // --------------------------------------------------------
            // LADO DEL SALDO
            // --------------------------------------------------------

            if (saldoFinal > 0) {

                if (
                    cuenta.naturaleza === 'DEUDORA'
                ) {

                    cuenta.saldo_final_debe =
                        cuenta.saldo_final;

                    cuenta.saldo_final_haber =
                        0;

                }

                else {

                    cuenta.saldo_final_debe =
                        0;

                    cuenta.saldo_final_haber =
                        cuenta.saldo_final;

                }

            }

            else if (saldoFinal < 0) {

                /*
                 * Saldo contrario a la naturaleza.
                 */

                if (
                    cuenta.naturaleza === 'DEUDORA'
                ) {

                    cuenta.saldo_final_debe =
                        0;

                    cuenta.saldo_final_haber =
                        Math.abs(saldoFinal);

                }

                else {

                    cuenta.saldo_final_debe =
                        Math.abs(saldoFinal);

                    cuenta.saldo_final_haber =
                        0;

                }

            }

            else {

                cuenta.saldo_final_debe = 0;

                cuenta.saldo_final_haber = 0;

            }

        }


        // ============================================================
        // 9. ORDENAR POR CÓDIGO
        // ============================================================

        cuentas.sort(

            (a, b) =>

                a.codigo.localeCompare(
                    b.codigo,
                    undefined,
                    {
                        numeric: true
                    }
                )

        );


        // ============================================================
        // 10. TOTALES GENERALES
        // ============================================================

        let totalSaldoInicialDebe = 0;

        let totalSaldoInicialHaber = 0;

        let totalMovimientoDebe = 0;

        let totalMovimientoHaber = 0;

        let totalFinalDebe = 0;

        let totalFinalHaber = 0;


        for (const cuenta of cuentas) {

            totalSaldoInicialDebe +=
                cuenta.saldo_inicial_debe;

            totalSaldoInicialHaber +=
                cuenta.saldo_inicial_haber;

            totalMovimientoDebe +=
                cuenta.total_movimiento_debe;

            totalMovimientoHaber +=
                cuenta.total_movimiento_haber;

            totalFinalDebe +=
                cuenta.saldo_final_debe;

            totalFinalHaber +=
                cuenta.saldo_final_haber;

        }


        // ============================================================
        // 11. REDONDEAR TOTALES
        // ============================================================

        totalSaldoInicialDebe =
            Number(
                totalSaldoInicialDebe.toFixed(2)
            );

        totalSaldoInicialHaber =
            Number(
                totalSaldoInicialHaber.toFixed(2)
            );

        totalMovimientoDebe =
            Number(
                totalMovimientoDebe.toFixed(2)
            );

        totalMovimientoHaber =
            Number(
                totalMovimientoHaber.toFixed(2)
            );

        totalFinalDebe =
            Number(
                totalFinalDebe.toFixed(2)
            );

        totalFinalHaber =
            Number(
                totalFinalHaber.toFixed(2)
            );


        // ============================================================
        // 12. RETORNAR LIBRO MAYOR
        // ============================================================

        return {

            ok: true,

            periodo: {

                id_periodo:
                    periodo.id_periodo,

                id_ejercicio:
                    periodo.id_ejercicio,

                anio:
                    periodo.anio,

                numero_periodo:
                    periodo.numero_periodo,

                nombre:
                    periodo.periodo,

                fecha_inicio:
                    periodo.fecha_inicio,

                fecha_fin:
                    periodo.fecha_fin,

                estado_ejercicio:
                    periodo.estado_ejercicio

            },


            filtro: {

                idcuenta:
                    idcuenta || null

            },


            cantidad_cuentas:
                cuentas.length,


            cuentas:
                cuentas,


            totales: {

                saldo_inicial_debe:
                    totalSaldoInicialDebe,

                saldo_inicial_haber:
                    totalSaldoInicialHaber,

                movimiento_debe:
                    totalMovimientoDebe,

                movimiento_haber:
                    totalMovimientoHaber,

                saldo_final_debe:
                    totalFinalDebe,

                saldo_final_haber:
                    totalFinalHaber

            }

        };


    }

    catch (error) {

        console.error(
            'Error consultando Libro Mayor:',
            error
        );

        throw error;

    }

    finally {

        if (conexion) {

            conexion.release();

        }

    }

}


const probarPartida = async () => {

    try {
        const resultado =    await ejecutarPartidaAutomatica({

                codigoRegla: 'PAGO_PRESTAMO',

                fecha: '2026-08-24',

                concepto:
                    'Pago de préstamo #4587',

                origen:
                    'PRESTAMO_PAGO',

                referencia:
                    '98542',

                usuario: 1,

                parametros: {

                    cuentaBanco: 40,

                    capital: 1200,

                    interes: 300,

                    total: 1500
                }
            });

        console.log(
            JSON.stringify(resultado, null, 2)
        );

    } catch (error) {

        console.error(
            'Error:',
            error.message
        );
    }
};

 


module.exports = {
    insertarCuentaContable,
    obtenerCatalogoContable,
    actualizarCuentaContable,
    eliminarCuentaContable,
    //Ejercicio fiscal
    listarEjercicios,
    obtenerEjercicio,
    crearEjercicio,
    actualizarEjercicio,
    eliminarEjercicio,
    cerrarPeriodo,
    cerrarEjercicio,
    //Asientocontable
    insertarAsientoContable,
    obtenerCuentaContable,
    listarAsientosContables,
    generarSaldoPeriodo,
    consultarBalanza,
    consultarBalanceGeneral,
    consultarEstadoResultados,
    consultarLibroDiario,
    consultarLibroMayor


}