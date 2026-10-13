const pool = require('../Configuraciones/ConexionDb/db');

/**
 * Motor genérico de partidas contables automáticas.
 *
 * IMPORTANTE:
 * - Recibe una conexión existente.
 * - NO abre conexión.
 * - NO inicia transacción.
 * - NO hace commit.
 * - NO hace rollback.
 * - NO libera la conexión.
 *
 * La transacción debe ser controlada por el servicio que invoque
 * esta función.
 */
const ejecutarPartidaAutomatica = async (
    connection,
    {
        codigoRegla,
        fecha,
        concepto,
        origen,
        referencia = null,
        usuario = null,
        parametros = {}
    }
) => {

    try {

        // =========================================================
        // 0. VALIDAR CONEXIÓN
        // =========================================================

        if (!connection) {
            throw new Error(
                'La conexión MySQL es obligatoria para ejecutar la partida automática.'
            );
        }

        if (!codigoRegla) {
            throw new Error(
                'El código de la regla contable es obligatorio.'
            );
        }

        if (!fecha) {
            throw new Error(
                'La fecha de la partida es obligatoria.'
            );
        }

        if (!concepto) {
            throw new Error(
                'El concepto de la partida es obligatorio.'
            );
        }

        if (!origen) {
            throw new Error(
                'El origen de la partida es obligatorio.'
            );
        }

        // =========================================================
        // 1. BUSCAR REGLA
        // =========================================================

        const [reglas] = await connection.query(`
            SELECT
                id_regla,
                codigo,
                nombre,
                tipo_asiento,
                estado
            FROM conta_regla_contable
            WHERE codigo = ?
              AND estado = 1
            LIMIT 1
        `, [codigoRegla]);

        if (reglas.length === 0) {
            throw new Error(
                `La regla contable '${codigoRegla}' no existe o está inactiva.`
            );
        }

        const regla = reglas[0];

        // =========================================================
        // 2. OBTENER PARÁMETROS DE LA REGLA
        // =========================================================

        const [parametrosRegla] = await connection.query(`
            SELECT
                id_parametro,
                codigo,
                nombre,
                tipo_dato,
                requerido,
                orden,
                estado
            FROM conta_regla_contable_parametro
            WHERE id_regla = ?
              AND estado = 1
            ORDER BY orden ASC
        `, [regla.id_regla]);

        // =========================================================
        // 3. VALIDAR PARÁMETROS
        // =========================================================

        for (const parametro of parametrosRegla) {

            const valor = parametros[parametro.codigo];

            if (
                parametro.requerido === 1 &&
                (
                    valor === undefined ||
                    valor === null ||
                    valor === ''
                )
            ) {
                throw new Error(
                    `Falta el parámetro requerido '${parametro.codigo}' para la regla '${codigoRegla}'.`
                );
            }

            if (
                valor !== undefined &&
                valor !== null &&
                valor !== ''
            ) {

                switch (parametro.tipo_dato) {

                    case 'CUENTA':

                        if (
                            !Number.isInteger(Number(valor)) ||
                            Number(valor) <= 0
                        ) {
                            throw new Error(
                                `El parámetro '${parametro.codigo}' debe contener un idcuenta válido.`
                            );
                        }

                        break;

                    case 'DECIMAL':

                        if (
                            isNaN(Number(valor)) ||
                            Number(valor) < 0
                        ) {
                            throw new Error(
                                `El parámetro '${parametro.codigo}' debe contener un valor numérico válido.`
                            );
                        }

                        break;

                    case 'ENTERO':

                        if (!Number.isInteger(Number(valor))) {
                            throw new Error(
                                `El parámetro '${parametro.codigo}' debe ser un entero válido.`
                            );
                        }

                        break;

                }
            }
        }

        // =========================================================
        // 4. OBTENER DETALLES DE LA REGLA
        // =========================================================

        const [detallesRegla] = await connection.query(`
            SELECT
                id_regla_detalle,
                id_regla,
                concepto,
                movimiento,
                origen_cuenta,
                idcuenta,
                parametro_cuenta,
                origen_importe,
                parametro_importe,
                descripcion,
                orden,
                estado
            FROM conta_regla_contable_detalle
            WHERE id_regla = ?
              AND estado = 1
            ORDER BY orden ASC
        `, [regla.id_regla]);

        if (detallesRegla.length === 0) {
            throw new Error(
                `La regla '${codigoRegla}' no tiene detalles contables configurados.`
            );
        }

        // =========================================================
        // 5. RESOLVER CUENTAS E IMPORTES
        // =========================================================

        const detalles = [];

        let totalDebe = 0;
        let totalHaber = 0;

        for (const detalle of detallesRegla) {

            let idcuenta;

            // -----------------------------------------------------
            // RESOLVER CUENTA
            // -----------------------------------------------------

            if (detalle.origen_cuenta === 'FIJA') {

                if (!detalle.idcuenta) {
                    throw new Error(
                        `El detalle '${detalle.concepto}' está configurado como cuenta fija pero no tiene idcuenta.`
                    );
                }

                idcuenta = Number(detalle.idcuenta);

            } else if (detalle.origen_cuenta === 'PARAMETRO') {

                if (!detalle.parametro_cuenta) {
                    throw new Error(
                        `El detalle '${detalle.concepto}' no tiene parametro_cuenta configurado.`
                    );
                }

                const cuentaParametro =
                    parametros[detalle.parametro_cuenta];

                if (
                    cuentaParametro === undefined ||
                    cuentaParametro === null ||
                    cuentaParametro === ''
                ) {
                    throw new Error(
                        `No se recibió el parámetro de cuenta '${detalle.parametro_cuenta}'.`
                    );
                }

                idcuenta = Number(cuentaParametro);

            } else {

                throw new Error(
                    `Origen de cuenta '${detalle.origen_cuenta}' no soportado en el detalle '${detalle.concepto}'.`
                );
            }

            if (!Number.isInteger(idcuenta) || idcuenta <= 0) {
                throw new Error(
                    `Cuenta inválida en el detalle '${detalle.concepto}'.`
                );
            }

            // -----------------------------------------------------
            // VALIDAR CUENTA
            // -----------------------------------------------------

            const [cuentas] = await connection.query(`
                SELECT
                    idcuenta,
                    codigo,
                    nombre,
                    tipo,
                    naturaleza,
                    requiere_tercero,
                    estado
                FROM cuentas_contables
                WHERE idcuenta = ?
                LIMIT 1
            `, [idcuenta]);

            if (cuentas.length === 0) {
                throw new Error(
                    `La cuenta ${idcuenta} no existe.`
                );
            }

            const cuenta = cuentas[0];

            if (Number(cuenta.estado) !== 1) {
                throw new Error(
                    `La cuenta ${cuenta.codigo} - ${cuenta.nombre} está inactiva.`
                );
            }

            if (
                cuenta.tipo !== 'CUENTA' &&
                cuenta.tipo !== 'AUXILIAR'
            ) {
                throw new Error(
                    `La cuenta ${cuenta.codigo} - ${cuenta.nombre} no es imputable.`
                );
            }

            // -----------------------------------------------------
            // RESOLVER IMPORTE
            // -----------------------------------------------------

            let importe;

            if (detalle.origen_importe === 'PARAMETRO') {

                const valorImporte =
                    parametros[detalle.parametro_importe];

                if (
                    valorImporte === undefined ||
                    valorImporte === null ||
                    valorImporte === ''
                ) {
                    throw new Error(
                        `No se recibió el parámetro de importe '${detalle.parametro_importe}'.`
                    );
                }

                importe = Number(valorImporte);

            } else {

                throw new Error(
                    `Origen de importe '${detalle.origen_importe}' no soportado.`
                );
            }

            if (!Number.isFinite(importe) || importe < 0) {
                throw new Error(
                    `Importe inválido en el detalle '${detalle.concepto}'.`
                );
            }

            importe = Number(importe.toFixed(2));

            if (importe === 0) {
                continue;
            }

            let debe = 0;
            let haber = 0;

            if (detalle.movimiento === 'DEBE') {

                debe = importe;
                totalDebe += importe;

            } else if (detalle.movimiento === 'HABER') {

                haber = importe;
                totalHaber += importe;

            } else {

                throw new Error(
                    `Movimiento '${detalle.movimiento}' inválido en la regla.`
                );
            }

            detalles.push({
                idcuenta,
                descripcion:
                    detalle.descripcion ||
                    detalle.concepto,
                debe,
                haber,
                orden: detalle.orden,
                requiere_tercero:
                    Number(cuenta.requiere_tercero)
            });
        }

        // =========================================================
        // 6. VALIDAR DETALLES
        // =========================================================

        if (detalles.length === 0) {
            throw new Error(
                'La partida no contiene movimientos contables con importe mayor a cero.'
            );
        }

        // =========================================================
        // 7. VALIDAR CUADRATURA
        // =========================================================

        totalDebe = Number(totalDebe.toFixed(2));
        totalHaber = Number(totalHaber.toFixed(2));

        if (Math.abs(totalDebe - totalHaber) > 0.01) {
            throw new Error(
                `La partida no está cuadrada. Debe: ${totalDebe.toFixed(2)}, Haber: ${totalHaber.toFixed(2)}.`
            );
        }

        // =========================================================
        // 8. BUSCAR EJERCICIO
        // =========================================================

        const [ejercicios] = await connection.query(`
            SELECT
                id_ejercicio,
                anio,
                fecha_inicio,
                fecha_fin,
                estado
            FROM conta_ejercicio_contable
            WHERE ? BETWEEN fecha_inicio AND fecha_fin
            LIMIT 1
            FOR UPDATE
        `, [fecha]);

        if (ejercicios.length === 0) {
            throw new Error(
                `No existe un ejercicio contable para la fecha ${fecha}.`
            );
        }

        const ejercicio = ejercicios[0];

        if (ejercicio.estado !== 'ABIERTO') {
            throw new Error(
                `El ejercicio ${ejercicio.anio} está cerrado.`
            );
        }

        // =========================================================
        // 9. BUSCAR PERÍODO
        // =========================================================

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
              AND ? BETWEEN fecha_inicio AND fecha_fin
            LIMIT 1
            FOR UPDATE
        `, [
            ejercicio.id_ejercicio,
            fecha
        ]);

        if (periodos.length === 0) {
            throw new Error(
                `No existe un período contable para la fecha ${fecha}.`
            );
        }

        const periodo = periodos[0];

        if (periodo.estado !== 'ABIERTO') {
            throw new Error(
                `El período '${periodo.nombre}' está cerrado.`
            );
        }

        // =========================================================
        // 10. VALIDAR DUPLICIDAD
        // =========================================================

        if (referencia !== null) {

            const [duplicados] = await connection.query(`
                SELECT
                    id_asiento,
                    numero_asiento,
                    estado
                FROM conta_asiento_contable
                WHERE origen = ?
                  AND referencia = ?
                  AND estado <> 'ANULADO'
                LIMIT 1
            `, [
                origen,
                String(referencia)
            ]);

            if (duplicados.length > 0) {
                throw new Error(
                    `La operación ya posee un asiento contable. ` +
                    `Asiento: ${duplicados[0].numero_asiento}`
                );
            }
        }

        // =========================================================
        // 11. GENERAR NÚMERO DE ASIENTO
        // =========================================================
        //
        // Esto lo quitaremos cuando elimines numero_asiento.
        //
        // =========================================================

        const [ultimoAsiento] = await connection.query(`
            SELECT
                numero_asiento
            FROM conta_asiento_contable
            ORDER BY id_asiento DESC
            LIMIT 1
            FOR UPDATE
        `);

        let siguienteNumero = 1;

        if (ultimoAsiento.length > 0) {

            const ultimoNumero =
                String(ultimoAsiento[0].numero_asiento);

            const coincidencia =
                ultimoNumero.match(/(\d+)$/);

            if (coincidencia) {
                siguienteNumero =
                    Number(coincidencia[1]) + 1;
            }
        }

        const numeroAsiento =
            String(siguienteNumero).padStart(6, '0');

        // =========================================================
        // 12. INSERTAR ENCABEZADO
        // =========================================================

        const [resultadoAsiento] = await connection.query(`
            INSERT INTO conta_asiento_contable
            (
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
            periodo.id_periodo,
            numeroAsiento,
            fecha,
            concepto,
            regla.tipo_asiento,
            origen,
            referencia !== null
                ? String(referencia)
                : null,
            usuario
        ]);

        const idAsiento =
            resultadoAsiento.insertId;

        // =========================================================
        // 13. INSERTAR DETALLES
        // =========================================================

        for (const detalle of detalles) {

            await connection.query(`
                INSERT INTO conta_asiento_contable_detalle
                (
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
                detalle.idcuenta,
                detalle.descripcion,
                detalle.debe.toFixed(2),
                detalle.haber.toFixed(2),
                detalle.orden
            ]);
        }

        // =========================================================
        // 14. ACTUALIZAR DATOS DE CONTABILIZACIÓN
        // =========================================================

        await connection.query(`
            UPDATE conta_asiento_contable
            SET
                usuario_contabilizacion = ?,
                fecha_contabilizacion = NOW()
            WHERE id_asiento = ?
        `, [
            usuario,
            idAsiento
        ]);

        // =========================================================
        // 15. DEVOLVER RESULTADO
        // =========================================================

        return {
            ok: true,

            mensaje:
                'Partida contabilizada correctamente.',

            asiento: {
                id_asiento: idAsiento,
                numero_asiento: numeroAsiento,
                id_periodo: periodo.id_periodo,
                periodo: periodo.nombre,
                fecha,
                concepto,
                tipo_asiento: regla.tipo_asiento,
                origen,
                referencia,
                estado: 'CONTABILIZADO'
            },

            totales: {
                debe: totalDebe,
                haber: totalHaber
            },

            detalles
        };

    } catch (error) {

        // NO hacemos rollback aquí.
        // La transacción pertenece al servicio padre.
        // Simplemente propagamos el error.

        throw error;
    }
};

 

module.exports = {
    ejecutarPartidaAutomatica
};