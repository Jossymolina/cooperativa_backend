// srvPlanillas.js
const pool = require('../Configuraciones/ConexionDb/db');
const servicio_afiliado = require('./AfiliadosService');
const XLSX = require('xlsx');
const fs = require('fs');
function limpiarMonto(valor) {
    if (valor === null || valor === undefined) {
        return null;
    }

    if (typeof valor === 'number') {
        return valor;
    }

    let monto = String(valor).trim();

    monto = monto.replace(/[^0-9.,]/g, '');
    monto = monto.replace(/,/g, '');

    const numero = Number(monto);

    return isNaN(numero)
        ? null
        : numero;
}

exports.cargarPlanilla = async (archivo, usuario,generales) => {
    let conexion;
    try {
        // ==========================
        // VALIDACIONES DEL ARCHIVO
        // ==========================
        if (!archivo) {
            throw new Error('No se recibió ningún archivo.');
        }
        if (!/\.(xlsx|xls)$/i.test(archivo.originalname)) {
            throw new Error(
                'Solo se permiten archivos Excel (.xlsx o .xls).'
            );
        }
        let workbook;
        try {
            workbook = XLSX.readFile(
                archivo.path
            );

        } catch (error) {
            throw new Error(
                'El archivo Excel está dañado o no puede ser leído.'
            );

        }
        if ( !workbook.SheetNames ||  workbook.SheetNames.length === 0  ) {
            throw new Error( 'El archivo no contiene hojas.' );
        }
        const hoja = workbook.Sheets[workbook.SheetNames[0]];
        const filas =  XLSX.utils.sheet_to_json(hoja);
        if (!filas.length) {
            throw new Error(
                'El archivo no contiene registros.'
            );
        }

        // ==========================
        // VALIDAR COLUMNAS
        // ==========================

        const primeraFila = filas[0];
        const columnasRequeridas = [
            'Identidad',
            'Nombre',
            'Monto'
        ];

        for (const columna of columnasRequeridas) {
            if (!(columna in primeraFila)) {
                throw new Error(
                    `La columna "${columna}" no existe en el archivo.`
                );
            }
        }

        // ==========================
        // VALIDAR DUPLICADOS
        // ==========================

        const mapaIdentidades = new Map();

        for (const fila of filas) {
            const identidad = String(
                fila.Identidad || ''
            ).trim();
            if (!identidad) {
                continue;
            }
            mapaIdentidades.set(
                identidad,
                (mapaIdentidades.get(identidad) || 0) + 1
            );
        }

        const duplicados = [];
        for (const [identidad, cantidad] of mapaIdentidades.entries()) {
            if (cantidad > 1) {
                duplicados.push({
                    identidad,
                    cantidad
                });
            }

        }
        if (duplicados.length > 0) {
            return {
                ok: false,
                msg:
                    'Se encontraron identidades duplicadas en el archivo.',
                duplicados
            };
        }

        // ==========================
        // TRANSACCIÓN
        // ==========================

        conexion = await pool.getConnection();

        await conexion.beginTransaction();

         //====================
        // Verificar si existe una planilla cargada
        //=========
        let sql_verifica_existencia = `
             SELECT * FROM cooperativa_db.excel_planilla_carga where  year(fecha)=year(?) and month(fecha)=month(?)
             limit 1
        `

        const [existe_] = await conexion.query(sql_verifica_existencia, [
            `${generales.fecha}-1` ,
             `${generales.fecha}-1`
        ]);
      if(existe_.length>=1)  return{ok:false,msg:"Ya existe una planilla cargadas"}
        const [planilla] = await conexion.query(`
            INSERT INTO excel_planilla_carga
            (
                fecha,
                archivo,
                usuario,
                fecha_creacion,
                ESTADO
            )
            VALUES
            (
                CURDATE(),
                ?,
                ?,
                now(),
                'PENDIENTE'
            )
        `, [
            archivo.originalname,
            usuario.idusuario
        ]);

        const idplanilla =  planilla.insertId;
        let total = 0;
        let validados = 0;
        let errores = 0;
        // ==========================
        // PROCESAR FILAS
        // ==========================

        for (const fila of filas) {
            total++;
           const identidad = String(
                fila.Identidad || ''
            ).trim();
            const nombre = String(
                fila.Nombre || ''
            ).trim();
            const monto = limpiarMonto(
                fila.Monto
            );
            let idafiliado = null;
            let estado = 'VALIDADO';
            let observacion = null;
            // ======================
            // IDENTIDAD
           // ======================
            if (!identidad) {
                estado = 'ERROR';
                observacion = 'Identidad vacía';
            }

            // ======================
            // MONTO
            // ======================

            if (monto === null) {
                estado = 'ERROR';
                observacion = observacion
                    ? `${observacion}. Monto inválido`
                    : 'Monto inválido';
            } else if (monto <= 0) {
                estado = 'ERROR';
                observacion = observacion
                    ? `${observacion}. Monto debe ser mayor a cero`
                    : 'Monto debe ser mayor a cero';
            }

            // ======================
            // AFILIADO
            // ======================

            if (estado !== 'ERROR') {
                const [afiliados] =
                    await conexion.query(`
                        SELECT
                            a.id_afiliado,
                            a.estado
                        FROM personas p
                        INNER JOIN afiliado a   ON a.idpersona = p.idpersona
                        INNER JOIN cuenta_financiera c  ON (c.id_afiliado = a.id_afiliado and c.estado='ACTIVA')
                        WHERE p.identidad = ?
                        LIMIT 1
                    `, [identidad]);

                if ( afiliados.length === 0  ) {
                    estado = 'ERROR';
                    observacion = 'Afiliado no encontrado';

                } else {

                    idafiliado =
                        afiliados[0].id_afiliado;

                    if (
                        afiliados[0].estado ===
                        'INACTIVO'
                    ) {

                        estado = 'ERROR';
                        observacion =
                            'Afiliado inactivo';

                    }

                    if (
                        afiliados[0].estado ===
                        'SUSPENDIDO'
                    ) {

                        estado = 'ERROR';
                        observacion =
                            'Afiliado suspendido';

                    }

                }

            }

            await conexion.query(`
                INSERT INTO excel_planilla_carga_detalle
                (
                    idplanilla,
                    identidad,
                    nombre,
                    monto,
                    idafiliado,
                    estado,
                    observacion
                )
                VALUES
                (
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?,
                    ?
                )
            `, [
                idplanilla,
                identidad,
                nombre,
                monto || 0,
                idafiliado,
                estado,
                observacion
            ]);

            if (
                estado === 'VALIDADO'
            ) {
                validados++;
            } else {
                errores++;
            }

        }

        await conexion.commit();

        return {
            ok: true,
            idplanilla,
            total,
            validados,
            errores
        };

    } catch (error) {
console.log(error)
        if (conexion) {
            await conexion.rollback();
        }
    return {
            ok: false,
            msg: error.message
        };

    } finally {

        if (conexion) {
            conexion.release();
        }

        if (
            archivo &&
            archivo.path &&
            fs.existsSync(
                archivo.path
            )
        ) {

            try {

                fs.unlinkSync(
                    archivo.path
                );

            } catch (error) {

                console.error(
                    'Error eliminando archivo temporal:',
                    error
                );

            }

        }

    }

};







async function sacarCuentaAhorro(connection,idafiliado){

 const sql = `
     SELECT cuenta_financiera.id_cuenta_financiera,cuenta_financiera.id_afiliado,
cuenta_financiera.numero_cuenta,cuenta_financiera.estado,tp.nombre
FROM cooperativa_db.cuenta_financiera 
join cooperativa_db.producto_financiero p on p.id_producto_financiero = cuenta_financiera.id_producto_financiero
join cooperativa_db.tipo_producto_financiero tp on tp.id_tipo_producto = p.id_tipo_producto 
where id_afiliado = ? and tp.nombre="Ahorro"
limit 1
    `;

    const [rows] =
        await connection.query(
            sql,
            [idafiliado]
        );

    return rows[0];
}

async function obtenerDetallesValidados(
    connection,
    idCarga
) {

    const sql = `
       SELECT *
       FROM excel_planilla_carga_detalle
       WHERE idplanilla = ?
       AND estado = 'VALIDADO';
    `;

    const [rows] =
        await connection.query(
            sql,
            [idCarga]
        );

    return rows;
}

exports.procesarPlanilla = async (idCarga, idUsuario) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const afiliados = await obtenerDetallesValidados(
            connection,
            idCarga
        );
        for (const registro of afiliados) {
            await procesarAfiliado(
                connection,
                registro,
                idUsuario
            );
        }
        await cambiarEstadoPlanillaExcel(connection, idCarga);
        await connection.commit();
        return {
            ok: true,
            msg: 'La planilla fue procesada correctamente.'
        };

    } catch (error) {
        await connection.rollback();
        return {
            ok: false,
            msg: 'Ocurrió un error al procesar la planilla.',
            error: error.message
        };

    } finally {
        connection.release();
    }
};


async function obtenerPrestamosActivosAfiliado(
    conection,
    idAfiliado
) {

    const sql = `
       SELECT
            p.*
        FROM prestamo p
        INNER JOIN cuenta_financiera cf
            ON cf.id_cuenta_financiera = p.id_cuenta_financiera
        WHERE cf.id_afiliado = ?
        AND cf.estado IN ('ACTIVA','MORA')
     
    `;

    const [rows] = await conection.query(
        sql,
        [idAfiliado]
    );

    return rows;
}



const obtenerPrimeraCuotaPendiente = async (connection,idPrestamo) => {

    const sql = `
        SELECT *
        FROM prestamo_amortizacion
        WHERE id_prestamo = ?
        AND estado IN (
            'VENCIDA',
            'PARCIAL',
            'PENDIENTE'
        )
        ORDER BY numero_cuota ASC
        LIMIT 1
    `;

    const [rows] = await connection.query(sql, [idPrestamo]);

    if (!rows.length) {
        return null;
    }

    return rows[0];
};

const cambiarEstadoPlanillaExcel = async (connection,idplanilla) => {
try {
    const sql = `
       UPDATE cooperativa_db.excel_planilla_carga SET estado = 'procesada' WHERE (idplanilla = ?);

    `;
    console.log(connection.format(sql, [idplanilla]))
    const [rows] = await connection.query(sql, [idplanilla]);

    if (!rows.length) {
        return null;
    }

    return rows[0]; 
} catch (error) {
     throw error


}

   
};



async function  procesarAfiliado(
    connection,
    registro,
    idUsuario
){

    const montoRecibido =   Number(registro.monto);

    // Buscar préstamos activos
    const prestamos =    await  obtenerPrestamosActivosAfiliado(
    connection,
    registro.idafiliado
);

    // ==========================
    // CASO 1: SIN PRÉSTAMOS
    // ==========================

    if (prestamos.length === 0) {
     /*   await this.movimientoFinancieroService
            .depositarAhorro(
                registro.id_afiliado,
                montoRecibido,
                idUsuario
            );
            */
           console.log("@@@2")
           console.log(registro)
           console.log( registro.idafiliado,
                montoRecibido,
                idUsuario)
        return {
            estado: 'SIN_PRESTAMOS'
        };

    }

    // ==========================
    // OBTENER UNA CUOTA POR PRÉSTAMO
    // ==========================

    const cuotasProcesar = [];
    console.log("2222222222222222222222222222222")
console.log(prestamos)
    for (const prestamo of prestamos) {

        const cuota = await obtenerPrimeraCuotaPendiente( connection,prestamo.id_prestamo);
       console.log("Cuota:::::::::")
       console.log(cuota)
        if (cuota) {
        cuota.idPrestamo =  prestamo.id_prestamo
        cuota.id_cuenta_financiera = prestamo.id_cuenta_financiera
            cuotasProcesar.push(cuota);

        }

    }

    /**
     * Sacar cuenta de ahorro por si se ocupa
     */
    let cuenta_ahorro = await sacarCuentaAhorro(connection,registro.idafiliado)
    console.log("Cuenta ahorro es")
    console.log(cuotasProcesar.length )

    // Si por alguna razón no existe cuota pendiente

    if (cuotasProcesar.length === 0) {
       await  servicio_afiliado.registrarMovimientoFinanciero(
                connection,
                {
                  id_cuenta_financiera:cuenta_ahorro.id_cuenta_financiera,
                  estado:"DEPOSITO_AHORRO_EXCEDENTE",
                  monto:montoRecibido,
                  referencia:"Deposito_excedente_excel",
                  descripcion:"Deposito por excedente,ejecutado desde la carga masiva"
                }
             )
        return {
            estado: 'SIN_CUOTAS'
        };

    }

    // ==========================
    // SUMAR REQUERIDO
    // ==========================

    const montoRequerido =
        cuotasProcesar.reduce(
            (suma, cuota) =>
                suma + Number(cuota.cuota_total),
            0
        );

     
    // ==========================
    // INSUFICIENTE
    // ==========================

    if (montoRecibido < montoRequerido) {
        return {
            estado: 'INSUFICIENTE',
            montoRecibido,
            montoRequerido
        };

    }

    // ==========================
    // PAGAR CUOTAS
    // ==========================

    for (const cuota of cuotasProcesar) {
            console.log("Registrandi ultimo for")
            console.log(cuota)
      let registro_movimiento =   await   servicio_afiliado.registrarMovimientoFinanciero(
                connection,
                {
                  id_cuenta_financiera:cuota.id_cuenta_financiera,
                  estado:"PAGO_CUOTA_PRESTAMO",
                  monto:cuota.capital,
                  referencia:"excel_carga",
                  descripcion:"Carga de cuota atraves de un archivo de Excel"
                }
             )

        let registro_pago =  await servicio_afiliado.registrarPagoPrestamo(connection,
            {
                id_prestamo: cuota.id_prestamo,
                referencia: "excel_carga",
                monto_total: cuota.cuota_total,
                observacion: "Pago cuota desde un archivo de excel",
                mora: cuota.mora,
                interes: cuota.interes,
                capital: cuota.capital
            }
        )

        let actualizar_amortizacion = await servicio_afiliado.actualizarEstadoAmortizacion(connection,cuota.id_amortizacion,'PAGADA')

    }

    // ==========================
    // COMPLETO
    // ==========================

    if (montoRecibido === montoRequerido) {

        return {
            estado: 'COMPLETO'
        };

    }

    // ==========================
    // EXCEDENTE
    // ==========================

    const excedente =  montoRecibido - montoRequerido;
      await  servicio_afiliado.registrarMovimientoFinanciero(
                connection,
                {
                  id_cuenta_financiera:cuenta_ahorro.id_cuenta_financiera,
                  estado:"DEPOSITO_AHORRO_EXCEDENTE",
                  monto:excedente,
                  referencia:"Deposito_excedente_excel",
                  descripcion:"Deposito por excedente, ejecutado desde la carga masiva"
                }
             )

          
/*
    await this.movimientoFinancieroService
        .depositarAhorro(
            registro.id_afiliado,
            excedente,
            idUsuario
        );*/

    return {
        estado: 'EXCEDENTE',
        excedente
    };



}



exports.sacarPlanillaGuardada = async (connection, fecha) => {

    try {

        if (!fecha) {
            throw new Error('La fecha es requerida');
        }

        const sql = `
           SELECT
                p.idplanilla,
                p.fecha,
                p.fecha_creacion,
                p.estado AS estado_planilla,
                d.*
            FROM cooperativa_db.excel_planilla_carga p
            INNER JOIN cooperativa_db.excel_planilla_carga_detalle d
                ON d.idplanilla = p.idplanilla
            WHERE YEAR(p.fecha) = YEAR(?)
              AND MONTH(p.fecha) = MONTH(?)
            ORDER BY nombre
         `;

        console.log(connection.format(sql,[fecha, fecha]))

        const [rows] = await connection.query(
            sql,
            [fecha, fecha]
        );

        return rows;

    } catch (error) {
       throw error;
    }
};

