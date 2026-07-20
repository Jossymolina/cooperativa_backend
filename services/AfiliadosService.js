const db = require('../Configuraciones/ConexionDb/db');
const crearAfiliado = async (body) => {
    const connection = await db.getConnection();
    try {

        await connection.beginTransaction();

        const {
            idpersona,
            codigo_afiliado,
            fecha_afiliacion,
            estado,
            metadato
        } = body;
        if (!idpersona) {
            throw new Error('El idpersona es requerido');
        }
        if (!codigo_afiliado) {
            throw new Error('El codigo afiliado es requerido');
        }
        if (!fecha_afiliacion) {
            throw new Error('La fecha afiliacion es requerida');
        }
        const [existeCodigo] = await connection.query(
            `
            SELECT id_afiliado
            FROM afiliado
            WHERE codigo_afiliado = ?
            `,
            [codigo_afiliado]
        );
        if (existeCodigo.length > 0) {
            throw new Error('El afiliado ya existe');
        }
        const [result] = await connection.query(
            `
            INSERT INTO afiliado
            (
                idpersona,
                codigo_afiliado,
                fecha_afiliacion,
                estado,
                fecha_creacion
            )
            VALUES
            (
                ?, ?, ?, ?, NOW()
            )
            `,
            [
                idpersona,
                codigo_afiliado,
                fecha_afiliacion,
                estado || 'ACTIVO'
            ]
        );
        await connection.commit();
        return {
            ok: true,
            msg: 'Afiliado registrado con exito',
            id_afiliado: result.insertId
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

const obtenerAfiliados = async () => {
    const connection = await db.getConnection();
    try {
        const [rows] = await connection.query(
            ` SELECT personas.idpersona,personas.identidad,nombres,apellidos,sexo,fecha_nacimiento,estado_civil,correo,personas.fecha_creacion as fehca_creacion_persona,
                    id_afiliado,codigo_afiliado,fecha_afiliacion,afiliado.estado as estado_afiliacion,
                    afiliado.fecha_creacion as fecha_creacion_afiliacion  FROM cooperativa_db.personas
                    join cooperativa_db.afiliado on afiliado.idpersona = personas.idpersona
            `);
        return rows;
    } catch (error) {
        throw error;
    } finally {
        connection.release();
    }

};

const obtenerAfiliadosDNI = async (body) => {
    const { identidad } = body
    const connection = await db.getConnection();
    try {
        const [rows] = await connection.query(
            `SELECT personas.idpersona,personas.identidad,nombres,apellidos,sexo,fecha_nacimiento,estado_civil,correo,personas.fecha_creacion as fehca_creacion_persona,
                    id_afiliado,codigo_afiliado,fecha_afiliacion,afiliado.estado as estado_afiliacion,
                    afiliado.fecha_creacion as fecha_creacion_afiliacion  FROM cooperativa_db.personas
                    join cooperativa_db.afiliado on afiliado.idpersona = personas.idpersona
                    where identidad = ? and afiliado.estado = "activo"
            `, [identidad]);
        return rows;
    } catch (error) {
        throw error;
    } finally {
        connection.release();
    }
};

const crearCuentaAhorro = async (body) => {
    const {
        id_afiliado,
        id_producto_financiero,
        fecha_apertura,
        cuota_ahorro = 0,
        saldo_minimo_bloquedo = 0
    } = body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        if (!id_afiliado) {
            throw new Error('El id_afiliado es requerido');
        }
        if (!id_producto_financiero) {
            throw new Error('El id_producto_financiero es requerido');
        }
        if (!fecha_apertura) {
            throw new Error('La fecha_apertura es requerida');
        }
        // Validar que no exista una cuenta activa del mismo producto
        const [existeCuenta] = await connection.query(
            `
            SELECT id_cuenta_financiera
            FROM cuenta_financiera
            WHERE id_afiliado = ?
              AND id_producto_financiero = ?
              AND estado = 'ACTIVA'
            LIMIT 1
            `,
            [id_afiliado, id_producto_financiero]
        );
        if (existeCuenta.length > 0) {
            throw new Error('Este afiliado ya cuenta con este producto en su cartera digital');
        }
        // Obtener producto financiero
        const [productoRows] = await connection.query(
            `
            SELECT id_tipo_producto
            FROM producto_financiero
            WHERE id_producto_financiero = ?
            LIMIT 1
            `,
            [id_producto_financiero]
        );

        if (productoRows.length === 0) {
            throw new Error('Producto financiero no encontrado');
        }

        const producto = productoRows[0];
        // Bloquear la tabla mientras se obtiene el siguiente AUTO_INCREMENT
        await connection.query('LOCK TABLES cuenta_financiera WRITE');
        const [autoIncrement] = await connection.query(`
            SELECT AUTO_INCREMENT
            FROM information_schema.TABLES
            WHERE TABLE_SCHEMA = DATABASE()
              AND TABLE_NAME = 'cuenta_financiera'
        `);
        const siguienteId = autoIncrement[0].AUTO_INCREMENT;
        const numero_cuenta =
            String(producto.id_tipo_producto).padStart(3, '0') +
            String(id_producto_financiero).padStart(4, '0') +
            String(siguienteId).padStart(10, '0');
        const [result] = await connection.query(
            `
            INSERT INTO cuenta_financiera
            (
                id_afiliado,
                id_producto_financiero,
                numero_cuenta,
                saldo_actual,
                saldo_disponible,
                cuota_ahorro,
                saldo_minimo_bloquedo,
                fecha_apertura,
                estado
            )
            VALUES
            (
                ?, ?, ?, 0, 0, ?, ?, ?, 'ACTIVA'
            )
            `,
            [
                id_afiliado,
                id_producto_financiero,
                numero_cuenta,
                cuota_ahorro,
                saldo_minimo_bloquedo,
                fecha_apertura
            ]
        );
        await connection.query('UNLOCK TABLES');
        await connection.commit();
        return {
            ok: true,
            msg: 'Cuenta financiera creada correctamente',
            data: {
                id_cuenta_financiera: result.insertId,
                numero_cuenta
            }
        };
    } catch (error) {
        try {
            await connection.query('UNLOCK TABLES');
        } catch (e) { }

        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

};

const crearCuentaPrestamo = async (body) => {
    const {
        id_afiliado,
        id_producto_financiero,
        fecha_apertura,
        fecha_vencimiento,
        monto_aprobado,
        tasa_interes_anual,
        plazo_meses,
        cuota_mensual,
        fecha_desembolso,
        tipo_amortizacion,
        amortizacion,
        cantidad_cuotas,
    } = body;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        if (!id_afiliado) {
            throw new Error('El id_afiliado es requerido');
        }
        if (!id_producto_financiero) {
            throw new Error('El id_producto_financiero es requerido');
        }
        if (!fecha_apertura) {
            throw new Error('La fecha_apertura es requerida');
        }

        const [productoRows] = await connection.query(
            `   SELECT *
                        FROM producto_financiero
                        WHERE id_producto_financiero = ?
                        LIMIT 1
                        `,
            [id_producto_financiero]
        );
        if (productoRows.length === 0) {
            throw new Error('Producto financiero no encontrado');
        }
        const producto = productoRows[0];



        const [correlativoRows] =
            await connection.query(
                `
            SELECT COUNT(*) + 1 AS correlativo
            FROM cuenta_financiera
            `
            );

        const correlativo =
            correlativoRows[0].correlativo;


        const tipoCuenta = "00" + producto.id_tipo_producto;

        const numero_cuenta =
            tipoCuenta +
            String(id_producto_financiero).padStart(4, '0') +
            String(correlativo).padStart(10, '0');



        const [result] =
            await connection.query(
                `
            INSERT INTO cuenta_financiera
            (
                id_afiliado,
                id_producto_financiero,
                numero_cuenta,
                saldo_actual,
                saldo_disponible,
                fecha_apertura,
                estado,
                fecha_vencimiento
            )
            VALUES
            (
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?,
                ?
            )
            `,
                [
                    id_afiliado,
                    id_producto_financiero,
                    numero_cuenta,
                    0,
                    0,
                    fecha_apertura,
                    'ACTIVA',
                    fecha_vencimiento
                ]
            );


        let id_ = result.insertId;

        let d = {
            id: id_,
            monto_aprobado: monto_aprobado,
            tasa_interes_anual: tasa_interes_anual,
            plazo_meses: plazo_meses,
            cuota_mensual: cuota_mensual,
            fecha_desembolso: fecha_desembolso,
            amortizacion: amortizacion

        }
        //Jossy aqui esta
        await registrarTablaPrestamo(connection, d);
        await connection.commit();
        return {
            ok: true,
            msg: 'Cuenta financiera creada correctamente',
            data: {
                id_cuenta_financiera:
                    numero_cuenta
            }
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

};

const registrarTablaPrestamo = async (connection, body) => {
    const {
        id,
        monto_aprobado,
        tasa_interes_anual,
        plazo_meses,
        cuota_mensual,
        fecha_desembolso,
        amortizacion
    } = body;
    try {
        const [cuentaRows] = await connection.query(
            `
            SELECT *
            FROM cuenta_financiera
            WHERE id_cuenta_financiera = ?
            LIMIT 1
            `,
            [id]
        );
        if (cuentaRows.length === 0) {
            throw new Error("Cuenta financiera no encontrada");
        }
        const [prestamoExiste] = await connection.query(
            `
            SELECT *
            FROM prestamo
            WHERE id_cuenta_financiera = ?
            LIMIT 1
            `,
            [id]
        );
        if (prestamoExiste.length > 0) {
            throw new Error("La cuenta ya tiene un préstamo");
        }
        const [result] = await connection.query(
            `
            INSERT INTO prestamo (
                id_cuenta_financiera,
                monto_aprobado,
                tasa_interes_anual,
                plazo_meses,
                cuota_mensual,
                saldo_capital,
                fecha_desembolso,
                tipo_amortizacion,
                estado
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                id,
                monto_aprobado,
                tasa_interes_anual,
                plazo_meses,
                cuota_mensual,
                monto_aprobado,
                fecha_desembolso,
                "FRANCESA",
                "ACTIVO"
            ]
        );
        const id_prestamo = result.insertId;
        await crearAmortizacionPrestamo(connection, {
            id_prestamo,
            amortizacion
        });
        return {
            ok: true,
            msg: "Guardado correctamente",
            id_prestamo
        };

    } catch (error) {
        throw error;
    }

};

const crearAmortizacionPrestamo = async (connection, body) => {
    const {
        id_prestamo,
        amortizacion = []
    } = body;
    try {
        if (!id_prestamo) {
            throw new Error("El id_prestamo es requerido");
        }
        if (!Array.isArray(amortizacion) || amortizacion.length === 0) {
            throw new Error("La amortización es requerida");
        }
        const values = amortizacion.map(cuota => [
            id_prestamo,
            cuota.numero,
            cuota.fecha_pago,
            cuota.saldo,
            cuota.capital,
            cuota.interes,
            cuota.mora || 0,
            cuota.cuota,
            cuota.saldo_final ?? cuota.saldo,
            cuota.estado || "PENDIENTE"
        ]);
        const sql = `
            INSERT INTO prestamo_amortizacion (
                id_prestamo,
                numero_cuota,
                fecha_pago,
                saldo_inicial,
                capital,
                interes,
                mora,
                cuota_total,
                saldo_final,
                estado
            )
            VALUES ?
        `;
        const [result] = await connection.query(sql, [values]);
        return {
            ok: true,
            message: "Amortización creada correctamente",
            insertedRows: result.affectedRows
        };
    } catch (error) {
        throw error;
    }
};

const sacarAfiliadosConPrestamos_Activos = async (body) => {
    const connection = await db.getConnection();
    try {
        const { estado } = body;
        const sql = `
            SELECT
                monto_aprobado,
                tasa_interes_anual,
                plazo_meses,
                cuota_mensual,
                cuenta_financiera.fecha_creacion,
                fecha_apertura,
                fecha_vencimiento,
                CONCAT(nombres, ' ', apellidos) AS afiliado,
                personas.idpersona AS idpersonas,
                afiliado.id_afiliado,
                id_prestamo,
                personas.numero_cuenta,
                0 AS seleccionado,
                cuenta_financiera.id_cuenta_financiera
            FROM prestamo
            INNER JOIN cuenta_financiera
                ON cuenta_financiera.id_cuenta_financiera = prestamo.id_cuenta_financiera
            INNER JOIN afiliado
                ON afiliado.id_afiliado = cuenta_financiera.id_afiliado
            INNER JOIN personas
                ON personas.idpersona = afiliado.idpersona
            WHERE prestamo.estado = ?
        `;
        const [result] = await connection.query(sql, [estado]);
        return result;
    } catch (error) {
        throw error;
    } finally {
        connection.release();
    }
};

const cambiarEstadoPrestamos = async (connection, { id_prestamo, estado, observaciones }) => {
    try {
        const data = [
            estado,
            observaciones || "",
            id_prestamo
        ];
        const [resultado] = await connection.query(
            `
            UPDATE prestamo
            SET
                estado = ?,
                observaciones = ?
            WHERE id_prestamo = ?
            `,
            data
        );
        if (resultado.affectedRows === 0) {
            throw new Error('No se encontró el préstamo');
        }
        return resultado;
    } catch (error) {
        throw error;
    }
};

const registrarMovimientoFinanciero = async (connection, {
    id_cuenta_financiera,
    estado,
    monto,
    referencia = null,
    descripcion = null
}) => {
    try {
        if (!id_cuenta_financiera) {
            throw new Error('La cuenta financiera es requerida');
        }
        if (!estado) {
            throw new Error('El tipo de movimiento es requerido');
        }
        if (!monto || Number(monto) === 0) {
            throw new Error('El monto es requerido');
        }
        const [cuenta] = await connection.query(`
            SELECT
                id_cuenta_financiera,
                saldo_actual
            FROM cuenta_financiera
            WHERE id_cuenta_financiera = ?
            LIMIT 1
        `, [id_cuenta_financiera]);

        if (cuenta.length === 0) {
            throw new Error('La cuenta financiera no existe');
        }
        const [tipoMovimiento] = await connection.query(`
            SELECT
                id_tipo_movimiento,
                codigo,
                nombre,
                afecta_saldo
            FROM tipo_movimiento_financiero
            WHERE codigo = ?
            LIMIT 1
        `, [estado]);

        if (tipoMovimiento.length === 0) {
            throw new Error('El tipo de movimiento no existe');
        }

        const saldoAnterior = Number(cuenta[0].saldo_actual || 0);
        let saldoNuevo = saldoAnterior;

        // SOLO SI AFECTA SALDO
        if (tipoMovimiento[0].afecta_saldo == 1) {
            if (estado === 'RETIRO_AHORRO') {
                saldoNuevo = saldoAnterior - Number(monto);
            } else {
                saldoNuevo = saldoAnterior + Number(monto);
            }
        }
        // VALIDAR SALDO NEGATIVO
        if (saldoNuevo < 0) {
            throw new Error('Saldo insuficiente');
        }


        const [movimiento] = await connection.query(`
            INSERT INTO movimiento_financiero
            (
                id_cuenta_financiera,
                id_tipo_movimiento,
                monto,
                saldo_anterior,
                saldo_nuevo,
                referencia,
                descripcion
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?)
        `, [
            id_cuenta_financiera,
            tipoMovimiento[0].id_tipo_movimiento,
            monto,
            saldoAnterior,
            saldoNuevo,
            referencia,
            descripcion
        ]);


        if (tipoMovimiento[0].afecta_saldo == 1) {
            if (estado === 'RETIRO_AHORRO') {
                await connection.query(`
            UPDATE cooperativa_db.cuenta_financiera SET saldo_actual = (saldo_actual-?) WHERE (id_cuenta_financiera = ?);
            ` , [monto, id_cuenta_financiera]);
            } else {
                await connection.query(`
                        UPDATE cooperativa_db.cuenta_financiera SET saldo_actual = (saldo_actual+?) WHERE (id_cuenta_financiera = ?);
                        ` , [monto, id_cuenta_financiera]);
            }
        }

        return {
            ok: true,
            msg: 'Movimiento financiero registrado correctamente',
            resultado: {
                id_movimiento: movimiento.insertId,
                saldo_anterior: saldoAnterior,
                saldo_nuevo: saldoNuevo
            }
        };

    } catch (error) {
        throw error;
    }

};

const desembolsarPrestamos = async (body) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const {
            estado,
            id_prestamo,
            prestamo,
            estado_movimiento,
            descripcion
        } = body;

        if (!prestamo) {
            throw new Error('No se recibió la información del préstamo');
        }
        const p = {
            id_cuenta_financiera: prestamo.id_cuenta_financiera,
            estado: estado_movimiento,
            monto: prestamo.monto_aprobado,
            referencia: null,
            descripcion
        };
        let movimiento = await registrarMovimientoFinanciero(
            connection,
            p
        );

        let resultado = await cambiarEstadoPrestamos(
            connection,
            {
                id_prestamo,
                estado,
                observaciones: descripcion
            }
        );
        await connection.commit();
        return {
            ok: true,
            mensaje: 'Préstamo desembolsado correctamente'
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

async function buscarProductosAfiliado(body) {
    const connection = await db.getConnection();

    try {
        const { identidad } = body;

        if (!identidad) {
            throw new Error('La identidad es requerida');
        }

        const query = `
            SELECT
                CONCAT(personas.nombres, ' ', personas.apellidos) AS afiliado,
                personas.identidad,
                producto_financiero.nombre AS nombre_producto,
                producto_financiero.descripcion AS descripcion_producto,
                tipo_producto_financiero.nombre AS tipo_producto,
                tasa_interes,
                plazo_maximo_meses,
                frecuencia_interes,
                fecha_fin_vigencia,
                fecha_inicio_vigencia,
                cuenta_financiera.id_cuenta_financiera
            FROM cooperativa_db.personas
            JOIN cooperativa_db.afiliado
                ON afiliado.idpersona = personas.idpersona
            JOIN cooperativa_db.cuenta_financiera
                ON cuenta_financiera.id_afiliado = afiliado.id_afiliado
            JOIN cooperativa_db.producto_financiero
                ON producto_financiero.id_producto_financiero = cuenta_financiera.id_producto_financiero
            JOIN cooperativa_db.tipo_producto_financiero
                ON tipo_producto_financiero.id_tipo_producto = producto_financiero.id_tipo_producto
            JOIN cooperativa_db.producto_financiero_configuracion
                ON producto_financiero_configuracion.id_producto_financiero = producto_financiero.id_producto_financiero
            WHERE personas.identidad = ?;
        `;

        const [rows] = await connection.query(query, [identidad]);

        return rows;

    } finally {
        connection.release();
    }
}

const regist = async (body) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const {
            estado,
            id_prestamo,
            prestamo,
            estado_movimiento,
            descripcion
        } = body;

        if (!prestamo) {
            throw new Error('No se recibió la información del préstamo');
        }

        if (!id_prestamo) {
            throw new Error('El id_prestamo es requerido');
        }

        if (!estado) {
            throw new Error('El estado es requerido');
        }

        if (!estado_movimiento) {
            throw new Error('El estado_movimiento es requerido');
        }

        const p = {
            id_cuenta_financiera: prestamo.id_cuenta_financiera,
            estado: estado_movimiento,
            monto: prestamo.monto_aprobado,
            referencia: null,
            descripcion
        };

        await registrarMovimientoFinanciero(
            connection,
            p
        );

        await cambiarEstadoPrestamos(
            connection,
            {
                id_prestamo,
                estado,
                observaciones: descripcion
            }
        );

        await connection.commit();
        return {
            ok: true,
            mensaje: 'Operación realizada correctamente'
        };

    } catch (error) {
        await connection.rollback();
        console.error(error);
        throw error;
    } finally {
        connection.release();
    }

};

const sacarPrestamoXcuentaFinanciera = async (body) => {
    const connection = await db.getConnection();
    try {
        const { id_cuenta_financiera } = body;
        if (!id_cuenta_financiera) {
            throw new Error('El id_cuenta_financiera es requerido');
        }


        const query = `
            SELECT *
            FROM cooperativa_db.prestamo
            WHERE id_cuenta_financiera = ?
        `;

        const [rows] = await connection.query(
            query,
            [id_cuenta_financiera]
        );

        if (!rows || rows.length === 0) {
            throw new Error('No se encontraron préstamos para esta cuenta financiera');
        }

        return rows;

    } catch (error) {
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const SacarCuotaPagarPrestamo = async (body) => {
    const connection = await db.getConnection();
    try {
        const { id_prestamo } = body;
        if (!id_prestamo) {
            throw new Error('El id_prestamo es requerido');
        }
        const query = `
          SELECT
    pa.id_amortizacion,
    pa.id_prestamo,
    pa.numero_cuota,
    pa.fecha_pago,
    pa.saldo_inicial,
    pa.capital,
    pa.interes,
    pa.mora,
    pa.cuota_total,
    pa.saldo_final,
    pa.estado,

    CASE
        WHEN pa.estado = 'PAGADA' THEN 'PAGADA'
        WHEN pa.fecha_pago < CURDATE() THEN 'VENCIDA'
        WHEN pa.estado = 'PARCIAL' THEN 'PARCIAL'
        ELSE 'PENDIENTE'
    END AS estado_real,

    DATEDIFF(CURDATE(), pa.fecha_pago) AS dias_atraso

FROM prestamo_amortizacion pa
WHERE pa.id_prestamo = ?
  AND pa.estado NOT IN  ('PAGADA','REMPLAZADA','CANCELADA_POR_PAGO_TOTAL','PAGO_CAPITAL_RESTANTE')
ORDER BY
    pa.fecha_pago ASC,
    pa.numero_cuota ASC,
    pa.id_amortizacion ASC
LIMIT 1;
        `;



        const [rows] = await connection.query(
            query,
            [id_prestamo]
        );


        return rows;

    } catch (error) {

        throw error;

    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const registrarCuotaPrestamo = async (body) => {
    const connection = await db.getConnection();

    try {

        await connection.beginTransaction();

        const {
            id_prestamo,
            monto_total,
            referencia = '',
            observacion = '',
            id_cuenta_financiera
        } = body;

        // Validaciones
        if (!id_prestamo) {
            throw new Error('El id_prestamo es requerido');
        }

        if (!id_cuenta_financiera) {
            throw new Error('El id_cuenta_financiera es requerido');
        }

        if (!monto_total || Number(monto_total) <= 0) {
            throw new Error('El monto_total debe ser mayor a cero');
        }

        const sql = `
            CALL cooperativa_db.registrar_cuota_prestamo(
                ?, ?, ?, ?, ?
            )
        `;
        const [result] = await connection.query(sql, [
            id_prestamo,
            Number(monto_total),
            referencia,
            observacion,
            id_cuenta_financiera
        ]);

        if (!result[0] || result[0].length === 0) {
            throw new Error('El procedimiento no devolvió resultados');
        }
        await connection.commit();
        return {
            ok: true,
            msg: result[0][0].mensaje,
            id_pago: result[0][0].id_pago
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();

    }

};
const sacarMovimientoCuenta = async (body) => {
    let connection;
    try {
        const {
            id_cuenta_financiera
        } = body;

        if (!id_cuenta_financiera) {
            throw new Error('El id_cuenta_financiera es requerido');
        }
        connection = await db.getConnection();
        const sql = `
            SELECT id_movimiento,id_cuenta_financiera,movimiento_financiero.id_tipo_movimiento,
                fecha_movimiento,monto,saldo_anterior,saldo_nuevo,descripcion,codigo,nombre,naturaleza,factor
                FROM cooperativa_db.movimiento_financiero
                join  cooperativa_db.tipo_movimiento_financiero on tipo_movimiento_financiero.id_tipo_movimiento = movimiento_financiero.id_tipo_movimiento
                where id_cuenta_financiera = ?
                order by fecha_movimiento desc

        `;
        const [result] = await connection.query(sql, [
            id_cuenta_financiera
        ]);
        return result;
    } catch (error) {

        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const sacarTablaAmortizacion = async (body) => {
    let connection;
    try {
        const {
            id_cuenta_financiera
        } = body;
        if (!id_cuenta_financiera) {
            throw new Error('El  id_cuenta_financiera es requerido');
        }
        connection = await db.getConnection();
        const sql = `
             SELECT id_amortizacion,prestamo.id_prestamo,numero_cuota,fecha_pago,saldo_inicial,capital,
            interes,mora,saldo_final,prestamo_amortizacion.estado,monto_aprobado,plazo_meses,cuota_total as cuota_mensual
            FROM cooperativa_db.prestamo_amortizacion
            join cooperativa_db.prestamo on   prestamo.id_prestamo =  prestamo_amortizacion.id_prestamo
            where id_cuenta_financiera = ? and prestamo_amortizacion.estado <>'REMPLAZADA'
        `;

        const [result] = await connection.query(sql, [
            id_cuenta_financiera
        ]);

        return result;

    } catch (error) {

        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const sacarPagosConDetallePrestamo = async (body) => {
    let connection;
    try {
        const {
            id_cuenta_financiera
        } = body;
        if (!id_cuenta_financiera) {
            throw new Error('El id_cuenta_financiera es requerido');
        }
        connection = await db.getConnection();
        const sql = `
              SELECT
                pp.id_pago,
                pp.id_prestamo,
                pp.fecha_pago,
                pp.monto_total,
                pp.referencia,
                pp.observacion,

                ppd.id_pago_detalle,
                ppd.tipo_aplicacion,
                ppd.monto

            FROM prestamo_pago pp
            LEFT JOIN prestamo_pago_detalle ppd
                ON pp.id_pago = ppd.id_pago
			left join  cooperativa_db.prestamo on  prestamo.id_prestamo = pp.id_prestamo

            WHERE prestamo.id_cuenta_financiera = ?

            ORDER BY pp.fecha_pago DESC,
                     pp.id_pago,
                     ppd.id_pago_detalle
        `;
        const [rows] = await connection.query(sql, [id_cuenta_financiera]);
        const pagosMap = new Map();
        for (const row of rows) {
            if (!pagosMap.has(row.id_pago)) {
                pagosMap.set(row.id_pago, {
                    id_pago: row.id_pago,
                    id_prestamo: row.id_prestamo,
                    fecha_pago: row.fecha_pago,
                    monto_total: Number(row.monto_total),
                    referencia: row.referencia,
                    observacion: row.observacion,
                    detalle: []
                });
            }
            if (row.id_pago_detalle) {
                pagosMap.get(row.id_pago).detalle.push({
                    id_pago_detalle: row.id_pago_detalle,
                    tipo_aplicacion: row.tipo_aplicacion,
                    monto: Number(row.monto)
                });
            }
        }
        return Array.from(pagosMap.values());
    } catch (error) {
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

async function aplicarAbonoCapital(
    idPrestamo,
    numeroCuotaInicio,
    montoAbono,
    nuevaAmortizacionArreglo,
    productoSeleccionado
) {

    const connection = await db.getConnection();

    try {

        await connection.beginTransaction();

        if (!nuevaAmortizacionArreglo || nuevaAmortizacionArreglo.length === 0) {
            throw new Error('La nueva amortización está vacía');
        }

        const [prestamo_tabla] = await connection.query(
            `SELECT *
             FROM cooperativa_db.prestamo
             WHERE id_cuenta_financiera = ? FOR UPDATE;`,
            [productoSeleccionado.id_cuenta_financiera]
        );

        if (prestamo_tabla.length === 0) {
            throw new Error('No existe el prestamo');
        }

        const prestamo = prestamo_tabla[0];

        const [updateAmortizacion] = await connection.query(
            `
            UPDATE prestamo_amortizacion
            SET estado = 'REMPLAZADA'
            WHERE
                id_prestamo = ?
                AND numero_cuota >= ?
                AND estado IN (
                    'PENDIENTE',
                    'PARCIAL',
                    'VENCIDA'
                );
            `,
            [
                prestamo.id_prestamo,
                numeroCuotaInicio
            ]
        );

        if (updateAmortizacion.affectedRows === 0) {
            throw new Error('No existen cuotas pendientes para reemplazar');
        }

        const values = nuevaAmortizacionArreglo.map(c => [
            prestamo.id_prestamo,
            c.numero_cuota,
            c.fecha_pago,
            c.saldo_inicial,
            c.capital,
            c.interes,
            0,
            c.cuota,
            c.saldo_final,
            'PENDIENTE'
        ]);

        const [insertAmortizacion] = await connection.query(
            `
            INSERT INTO prestamo_amortizacion(
                id_prestamo,
                numero_cuota,
                fecha_pago,
                saldo_inicial,
                capital,
                interes,
                mora,
                cuota_total,
                saldo_final,
                estado
            )
            VALUES ?
            `,
            [values]
        );

        if (insertAmortizacion.affectedRows === 0) {
            throw new Error('No fue posible insertar la nueva amortización');
        }

        const [tipoMovimiento] = await connection.query(
            `
            SELECT
                id_tipo_movimiento,
                codigo,
                nombre,
                afecta_saldo
            FROM tipo_movimiento_financiero
            WHERE codigo = ?
            LIMIT 1
            `,
            ['PAGO_CAPITAL_PRESTAMO']
        );

        if (tipoMovimiento.length === 0) {
            throw new Error('No existe el tipo de movimiento');
        }

        await connection.query(
            `
            INSERT INTO movimiento_financiero
            (
                id_cuenta_financiera,
                id_tipo_movimiento,
                monto,
                saldo_anterior,
                saldo_nuevo,
                referencia,
                descripcion
            )
            VALUES
            (?, ?, ?, ?, ?, ?, ?)
            `,
            [
                prestamo.id_cuenta_financiera,
                tipoMovimiento[0].id_tipo_movimiento,
                montoAbono,
                nuevaAmortizacionArreglo[0].saldo_inicial,
                nuevaAmortizacionArreglo[0].saldo_final,
                "Pago de capital",
                `El afiliado pago capital ${new Date()}, saldo anterior antes del calculo: ${nuevaAmortizacionArreglo[0].saldo_inicial} nuevo saldo: ${nuevaAmortizacionArreglo[0].saldo_final}`
            ]
        );

        const detalle_pago = await registrarPagoPrestamo(
            connection,
            {
                id_prestamo: prestamo.id_prestamo,
                referencia: null,
                monto_total: montoAbono,
                observacion: `Abono a capital ${new Date()}`,
                mora: 0,
                interes: 0,
                capital: montoAbono
            }
        );

        if (!detalle_pago) {
            throw new Error('No fue posible registrar el pago del préstamo');
        }

        await connection.commit();

        return {
            ok: true,
            msg: 'Abono aplicado'
        };

    } catch (error) {

        if (connection) {
            await connection.rollback();
        }

        throw error;

    } finally {

        if (connection) {
            connection.release();
        }

    }

}

async function cancelarPrestamoTotal(
    numeroCuotaBloqueada,
    productoSeleccionado,
    interes,
    capital,
    mora,
    total_a_pagar

) {

    const connection = await db.getConnection();

    try {

        await connection.beginTransaction();
        /**Saco que prestamo es apartir de la id cuenta finaciera */
        let prestamo_tabla = await connection.query(`SELECT * FROM cooperativa_db.prestamo where id_cuenta_financiera = ? FOR UPDATE`, [productoSeleccionado.id_cuenta_financiera]);
        if (prestamo_tabla[0].length === 0) {
            //Si no exite no continuamos
            throw new Error('No existe el prestamo');
        }

        //Si exite lo tomo en una variable
        let prestamo = prestamo_tabla[0][0]


        /*Ahora saco la ultima cuota del prestamp para poder determinar el numero de cuota a insertar en la tabla amortizacio 
        ejemplo si es 48 insertare cuota 49 pago de capital
        */
        let ultimma_cuota = await connection.execute(
            `
          select * from cooperativa_db.prestamo_amortizacion
           
            WHERE
                id_prestamo = ?
                AND numero_cuota > ?
                AND estado IN (
                    'PENDIENTE',
                    'PARCIAL',
                    'VENCIDA'
                ) order by numero_cuota desc limit 1

            `,
            [
                prestamo.id_prestamo,
                numeroCuotaBloqueada
            ]
        );

        const cuotas = ultimma_cuota[0];

        if (!cuotas || cuotas.length === 0) {
            throw new Error('No se encontraron cuotas pendientes.');
        }




        /**
         * ahora actualizo las cuotas que ya no se espera recibir pago
         */
        const [update] = await connection.execute(
            `
            UPDATE prestamo_amortizacion
            SET estado = 'CANCELADA_POR_PAGO_TOTAL'
            WHERE
                id_prestamo = ?
                AND numero_cuota > ?
                AND estado IN (
                    'PENDIENTE',
                    'PARCIAL',
                    'VENCIDA'
                )
            `,
            [
                prestamo.id_prestamo,
                numeroCuotaBloqueada
            ]
        );
        if (update.affectedRows === 0) {
            throw new Error('No existen cuotas para cancelar.');
        }
        /**
         * Ahora inserto el movieminto del pago del capital
         */
        let p = {
            id_cuenta_financiera: prestamo.id_cuenta_financiera,
            estado: "PAGO_CAPITAL_RESTANTE",
            monto: capital,
            referencia: null,
            descripcion: "Pago de capital restante realizado con éxito. Queda pendiente únicamente la cuota del período actual."
        }
        let movimiento = await registrarMovimientoFinanciero(connection, p)

        /**
         * Ahora devo insertar en la tabla de pago 
         * detallar el pago  que recibe la tabla del movimiento
         */

        let detalle_pago = await registrarPagoPrestamo(connection,
            {
                id_prestamo: prestamo.id_prestamo,
                referencia: null,
                monto_total: total_a_pagar,
                observacion: "Pago de capital restante",
                mora: mora,
                interes: interes,
                capital: capital
            }
        )

        await connection.commit();

        return {
            ok: true,
            msg: 'Pago total de capital aplicado correctamente'
        };

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }

}
async function registrarPagoPrestamo(connection, {
    id_prestamo,
    monto_total,
    referencia = null,
    observacion = null,
    mora = 0,
    interes = 0,
    capital = 0
}) {
    try {
        if (Number(monto_total) <= 0) {
            throw new Error('El monto total debe ser mayor que cero.');
        }
        const detalles = [
            { tipo: 'MORA', monto: mora },
            { tipo: 'INTERES', monto: interes },
            { tipo: 'CAPITAL', monto: capital }
        ].filter(x => Number(x.monto) > 0);

        if (detalles.length === 0) {
            throw new Error('El pago no contiene ningún detalle.');
        }

        const [resultPago] = await connection.execute(
            `
            INSERT INTO prestamo_pago
            (
                id_prestamo,
                fecha_pago,
                monto_total,
                referencia,
                observacion
            )
            VALUES
            (
                ?,
                NOW(),
                ?,
                ?,
                ?
            )
            `,
            [
                id_prestamo,
                monto_total,
                referencia,
                observacion
            ]
        );

        const id_pago = resultPago.insertId;
        if (!id_pago) {
            throw new Error('No fue posible registrar el pago.');
        }


        for (const detalle of detalles) {

            await connection.execute(
                `
                INSERT INTO prestamo_pago_detalle
                (
                    id_pago,
                    tipo_aplicacion,
                    monto
                )
                VALUES (?, ?, ?)
                `,
                [
                    id_pago,
                    detalle.tipo,
                    detalle.monto
                ]
            );

        }

        return id_pago;

    } catch (error) {

        throw new Error(
            `Error al registrar pago del préstamo: ${error.message}`
        );

    }

}

async function cambiarEstadoDeUnPrestamo(params) {

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await cambiarEstadoPrestamos(
            connection,
            params
        );
        await connection.commit();
        return {
            ok: true,
            mensaje: 'Estado del préstamo actualizado correctamente'
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

}

async function BuscarProductoDEAhorroAfiliado(body) {
    const connection = await db.getConnection();
    const { identidad } = body
    try {
        if (!identidad) {
            throw new Error('La identidad es requerida');
        }
        const query = `
                   SELECT concat(personas.nombres," ",personas.apellidos) as afiliado,
                        personas.identidad as identidad,producto_financiero.nombre as nombre_producto,
                        producto_financiero.descripcion as descripcion_producto,
                        tipo_producto_financiero.nombre as tipo_producto,
                        tasa_interes,plazo_maximo_meses,frecuencia_interes,
                        fecha_fin_vigencia,
                        fecha_inicio_vigencia,
                        cuenta_financiera.id_cuenta_financiera,
                        cuenta_financiera.id_producto_financiero,
                        producto_financiero.id_tipo_producto
                        
                        FROM cooperativa_db.personas
                        join  cooperativa_db.afiliado on afiliado.idpersona = personas.idpersona
                        join cooperativa_db.cuenta_financiera on  cuenta_financiera.id_afiliado =  afiliado.id_afiliado
                        join cooperativa_db.producto_financiero on  producto_financiero.id_producto_financiero =  cuenta_financiera.id_producto_financiero
                        join cooperativa_db.tipo_producto_financiero on  tipo_producto_financiero.id_tipo_producto = producto_financiero.id_tipo_producto
                        join cooperativa_db.producto_financiero_configuracion on producto_financiero_configuracion.id_producto_financiero = producto_financiero.id_producto_financiero
                        
                        where personas.identidad =? and producto_financiero.id_tipo_producto =1
        `;

        const [rows] = await connection.query(query, [identidad]);
        if (!rows || rows.length === 0) {
            throw new Error('El afiliado no posee productos financieros');
        }
        return rows;
    } catch (error) {
        throw error;
    } finally {
        connection.release();
    }

}

const depositar_CuentaAhorro = async (body) => {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        const {
            id_cuenta_financiera,
            deposito_monto,
            descripcion,
            estado
        } = body;
        if (!id_cuenta_financiera) {
            throw new Error('La cuenta financiera es requerida.');
        }

        if (Number(deposito_monto) <= 0) {
            throw new Error('El monto del depósito debe ser mayor que cero.');
        }

        if (!estado) {
            throw new Error('El estado es requerido.');
        }


        const p = {
            id_cuenta_financiera: id_cuenta_financiera,
            estado: estado,
            monto: deposito_monto,
            referencia: null,
            descripcion: descripcion
        };

        let movimiento = await registrarMovimientoFinanciero(connection, p);

        await connection.commit();
        return {
            ok: true,
            mensaje: 'Registrado correctamente'
        };

    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

};


const retirar_CuentaAhorro = async (body) => {
    const connection = await db.getConnection();
    try {
        const {
            id_cuenta_financiera,
            retiro_monto,
            descripcion = '',
            estado
        } = body;

        // Validaciones
        if (!id_cuenta_financiera) {
            throw new Error('La cuenta financiera es requerida.');
        }

        if (Number(retiro_monto) <= 0) {
            throw new Error('El monto del retiro debe ser mayor que cero.');
        }

        if (!estado) {
            throw new Error('El estado es requerido.');
        }

        await connection.beginTransaction();

        // Bloquear la cuenta para evitar retiros simultáneos
        const [cuenta] = await connection.query(
            `
            SELECT id_cuenta_financiera
            FROM cuenta_financiera
            WHERE id_cuenta_financiera = ?
            FOR UPDATE
            `,
            [id_cuenta_financiera]
        );

        if (cuenta.length === 0) {
            throw new Error('La cuenta financiera no existe.');
        }

        // Obtener saldo disponible
        const [saldo] = await connection.query(
            `
            SELECT
                COALESCE(SUM(mf.monto * tmf.factor), 0) AS saldo
            FROM movimiento_financiero mf
            INNER JOIN tipo_movimiento_financiero tmf
                ON tmf.id_tipo_movimiento = mf.id_tipo_movimiento
            WHERE mf.id_cuenta_financiera = ?
            `,
            [id_cuenta_financiera]
        );

        const saldoDisponible = Number(saldo[0].saldo);
        const montoRetiro = Number(retiro_monto);

        if (saldoDisponible < montoRetiro) {
            throw new Error('Saldo insuficiente.');
        }

        const movimiento = await registrarMovimientoFinanciero(connection, {
            id_cuenta_financiera,
            estado,
            monto: montoRetiro,
            referencia: null,
            descripcion
        });

        if (!movimiento || !movimiento.ok) {
            throw new Error('No fue posible registrar el movimiento financiero.');
        }
        await connection.commit();
        return {
            ok: true,
            mensaje: 'Retiro realizado correctamente.'
        };
    } catch (error) {
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error('Error al realizar rollback:', rollbackError);
        }
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }
};


const obtenerCuotasMesAfiliados = async () => {
    const connection = await db.getConnection();
    try {

        const sql = `
    
SELECT
    t.id_afiliado,
    t.identidad,
    t.nombre,
    SUM(t.total_cuotas_mes) AS total_cuotas_mes
FROM
(
    (
        SELECT
            a.id_afiliado,
            pe.identidad,
            CONCAT(pe.nombres, ' ', pe.apellidos) AS nombre,
            SUM(pa.cuota_total) AS total_cuotas_mes
        FROM afiliado a
        INNER JOIN personas pe
            ON pe.idpersona = a.idpersona
        INNER JOIN cuenta_financiera cf
            ON cf.id_afiliado = a.id_afiliado
        INNER JOIN prestamo p
            ON p.id_cuenta_financiera = cf.id_cuenta_financiera
            AND p.estado = 'DESEMBOLSADO'
        INNER JOIN prestamo_amortizacion pa
            ON pa.id_amortizacion = (
                SELECT pa2.id_amortizacion
                FROM prestamo_amortizacion pa2
                WHERE pa2.id_prestamo = p.id_prestamo
                  AND pa2.estado IN ('PENDIENTE', 'PARCIAL', 'VENCIDA')
                ORDER BY pa2.numero_cuota
                LIMIT 1
            )
        GROUP BY
            a.id_afiliado,
            pe.identidad,
            pe.nombres,
            pe.apellidos
    )

    UNION ALL

    (
        SELECT
            a.id_afiliado,
            pe.identidad,
            CONCAT(pe.nombres, ' ', pe.apellidos) AS nombre,
            SUM(cf.cuota_ahorro) AS total_cuotas_mes
        FROM afiliado a
        INNER JOIN personas pe
            ON pe.idpersona = a.idpersona
        INNER JOIN cuenta_financiera cf
            ON cf.id_afiliado = a.id_afiliado
            AND cf.estado = 'ACTIVA'
        JOIN producto_financiero pd
            ON pd.id_producto_financiero = cf.id_producto_financiero
        JOIN tipo_producto_financiero tp
            ON tp.id_tipo_producto = pd.id_tipo_producto
            AND tp.id_tipo_producto = 1
        GROUP BY
            a.id_afiliado,
            pe.identidad,
            pe.nombres,
            pe.apellidos
    )
) t
GROUP BY
    t.id_afiliado,
    t.identidad,
    t.nombre;
        `;

        const [rows] = await connection.query(sql);
        return rows;
    } catch (error) {
        console.error('ERROR obtenerCuotasMesAfiliados:', error);
        throw error;
    } finally {
        if (connection) {
            connection.release();
        }
    }

};

async function actualizarEstadoAmortizacion(
    connection,
    idAmortizacion,
    estado
) {
    try {

        if (!connection) {
            throw new Error('La conexión es requerida.');
        }

        if (!idAmortizacion) {
            throw new Error('El id de la amortización es requerido.');
        }

        if (!estado) {
            throw new Error('El estado es requerido.');
        }

        const sql = `
            UPDATE prestamo_amortizacion
            SET estado = ?
            WHERE id_amortizacion = ?
        `;

        const [result] = await connection.query(
            sql,
            [
                estado,
                idAmortizacion
            ]
        );

        if (result.affectedRows === 0) {
            throw new Error('No se encontró la amortización indicada.');
        }

        return {
            ok: true,
            affectedRows: result.affectedRows,
            changedRows: result.changedRows
        };

    } catch (error) {

        throw error;

    }
}


const generarInteresesAhorro = async (connection) => {

    try {

        if (!connection) {
            throw new Error("La conexión es requerida.");
        }

        const CODIGO_MOVIMIENTO = "INTERES_AHORRO";

        const fecha = new Date();

        const anio = fecha.getFullYear();
        const mes = fecha.getMonth() + 1;

        const referencia = `INT-${anio}-${String(mes).padStart(2, "0")}`;

        // ==========================================
        // OBTENER CUENTAS
        // ==========================================

        const [cuentas] = await connection.query(`
            SELECT
                cf.id_cuenta_financiera,
                cf.id_afiliado,
                pf.id_producto_financiero,
                cf.numero_cuenta,
                cf.saldo_actual,
                pfc.tasa_interes
            FROM cooperativa_db.cuenta_financiera cf
            INNER JOIN cooperativa_db.producto_financiero pf
                ON pf.id_producto_financiero = cf.id_producto_financiero
            INNER JOIN cooperativa_db.producto_financiero_configuracion pfc
                ON pfc.id_producto_financiero = pf.id_producto_financiero
            WHERE
                pf.id_tipo_producto = 1
                AND cf.saldo_actual > 0
        `);

        let procesadas = 0;
        let pagadas = 0;
        let omitidas = 0;
        let totalIntereses = 0;
        const errores = [];
        console.log(cuentas)

        for (const cuenta of cuentas) {

            procesadas++;

            try {


                if (!cuenta.tasa_interes || Number(cuenta.tasa_interes) <= 0) {
                    errores.push({
                        cuenta: cuenta.numero_cuenta,
                        error: "La cuenta no posee tasa de interés."
                    });
                    continue;
                }



                //========================================
                // VALIDAR SI YA FUE PAGADO ESTE PERIODO
                //========================================

                const [movimiento] = await connection.query(`
                    SELECT 1
                    FROM cooperativa_db.movimiento_financiero mf
                    INNER JOIN cooperativa_db.tipo_movimiento_financiero tm
                        ON tm.id_tipo_movimiento = mf.id_tipo_movimiento
                    WHERE
                        mf.id_cuenta_financiera = ?
                        AND tm.codigo = ?
                        AND mf.referencia = ?
                    LIMIT 1
                `, [
                    cuenta.id_cuenta_financiera,
                    CODIGO_MOVIMIENTO,
                    referencia
                ]);



                if (movimiento.length > 0) {
                    omitidas++;
                    continue;
                }


                //========================================
                // CALCULAR INTERÉS
                //========================================

                const saldoPromedio = await obtenerSaldoPromedio(
                    connection,
                    cuenta.id_cuenta_financiera,
                    fecha
                );
                //cuenta.saldo_actual
                const interes = Math.round(
                    ((saldoPromedio * cuenta.tasa_interes) / 100 / 12) * 100
                ) / 100;

                if (interes <= 0) {
                    continue;
                }

                //========================================
                // REGISTRAR MOVIMIENTO
                //========================================

                await registrarMovimientoFinanciero(connection, {
                    id_cuenta_financiera: cuenta.id_cuenta_financiera,
                    estado: CODIGO_MOVIMIENTO,
                    monto: interes,
                    referencia,
                    descripcion: `Interés ahorro ${referencia}`
                });

                pagadas++;
                totalIntereses += interes;

            } catch (errorCuenta) {

                errores.push({
                    cuenta: cuenta.numero_cuenta,
                    error: errorCuenta.message
                });

            }

        }

        return {

            ok: true,

            procesadas,

            pagadas,

            omitidas,

            errores: errores.length,

            detalleErrores: errores,

            totalIntereses: Number(totalIntereses.toFixed(2))

        };

    } catch (error) {

        throw new Error(`Error al generar intereses: ${error.message}`);

    }

};


const obtenerSaldoPromedio = async (
    connection,
    idCuenta,
    fechaReferencia = new Date()
) => {

    try {

        if (!connection) {
            throw new Error("La conexión es requerida.");
        }

        if (!idCuenta) {
            throw new Error("La cuenta es requerida.");
        }

        const anio = fechaReferencia.getFullYear();
        const mes = fechaReferencia.getMonth();

        const fechaFin = new Date(anio, mes + 1, 0);

        const fechaInicioConsulta = new Date(anio, mes, 1);
        const fechaFinConsulta = new Date(anio, mes + 1, 1);

        const diasMes = fechaFin.getDate();

        //=====================================================
        // MOVIMIENTOS DEL MES
        //=====================================================

        const [movimientos] = await connection.query(`
            SELECT
                id_movimiento,
                fecha_movimiento,
                saldo_anterior,
                saldo_nuevo
            FROM movimiento_financiero
            WHERE
                id_cuenta_financiera = ?
                AND fecha_movimiento >= ?
                AND fecha_movimiento < ?
            ORDER BY
                fecha_movimiento ASC,
                id_movimiento ASC
        `, [
            idCuenta,
            fechaInicioConsulta,
            fechaFinConsulta
        ]);

        let saldoActual = 0;

        //=====================================================
        // SALDO AL INICIO DEL MES
        //=====================================================

        if (movimientos.length > 0) {

            saldoActual = Number(movimientos[0].saldo_anterior);

        } else {

            const [ultimo] = await connection.query(`
                SELECT saldo_nuevo
                FROM movimiento_financiero
                WHERE
                    id_cuenta_financiera = ?
                    AND fecha_movimiento < ?
                ORDER BY
                    fecha_movimiento DESC,
                    id_movimiento DESC
                LIMIT 1
            `, [
                idCuenta,
                fechaInicioConsulta
            ]);

            if (ultimo.length === 0) {
                return 0;
            }

            saldoActual = Number(ultimo[0].saldo_nuevo);

        }

        //=====================================================
        // CALCULAR SALDO PROMEDIO
        //=====================================================

        let suma = 0;
        let diaAnterior = 1;

        for (const movimiento of movimientos) {

            const diaMovimiento = new Date(
                movimiento.fecha_movimiento
            ).getDate();

            const dias = diaMovimiento - diaAnterior;

            if (dias > 0) {
                suma += saldoActual * dias;
            }

            saldoActual = Number(movimiento.saldo_nuevo);
            diaAnterior = diaMovimiento;

        }

        suma += saldoActual * (diasMes - diaAnterior + 1);

        return Math.round((suma / diasMes) * 100) / 100;

    } catch (error) {
        throw error;
    }

};





async function cambiarEstadoDeUnPrestamoEnBloque(prestamos) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        for (const prest of prestamos) {
            await cambiarEstadoPrestamos(
                connection,
                prest
            );
        }
        await connection.commit();
        return {
            ok: true,
            msg: 'Estados de los préstamos actualizados correctamente.'
        };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}





module.exports = {
    crearAfiliado,
    obtenerAfiliados,
    obtenerAfiliadosDNI,
    crearCuentaAhorro,
    crearCuentaPrestamo,
    sacarAfiliadosConPrestamos_Activos,
    cambiarEstadoDeUnPrestamo,
    desembolsarPrestamos,
    buscarProductosAfiliado,
    sacarPrestamoXcuentaFinanciera,
    SacarCuotaPagarPrestamo,
    registrarCuotaPrestamo,
    sacarMovimientoCuenta,
    sacarTablaAmortizacion,
    sacarPagosConDetallePrestamo,
    aplicarAbonoCapital,
    cancelarPrestamoTotal,

    BuscarProductoDEAhorroAfiliado,
    depositar_CuentaAhorro,
    retirar_CuentaAhorro,
    obtenerCuotasMesAfiliados,
    registrarMovimientoFinanciero,
    registrarPagoPrestamo,
    actualizarEstadoAmortizacion,
    generarInteresesAhorro,
    cambiarEstadoDeUnPrestamoEnBloque


};