const db = require('../Configuraciones/ConexionDb/db');

obtenerTiposProductoFinanciero = async () => {

    const connection = await db.getConnection();

    try {

        const [rows] = await connection.query(
            `
            SELECT
                id_tipo_producto,
                codigo,
                nombre,
                descripcion
            FROM tipo_producto_financiero
            WHERE estado = TRUE
            `
        );

        return rows;

    } catch (error) {

        throw error;

    } finally {

        connection.release();

    }

};

crearProductoFinanciero = async (body) => {
console.log("Este es el serviio de producto financiero")
    const connection = await db.getConnection();

    try {

        await connection.beginTransaction();

        const {

            nombre,
            codigo,
            descripcion,
            id_tipo_producto,
            configuracion = {}

        } = body;

        /*
        =====================================
        VALIDACIONES GENERALES
        =====================================
        */

        if (!nombre) {

            throw new Error(
                'Nombre requerido'
            );

        }

        if (!codigo) {

            throw new Error(
                'Código requerido'
            );

        }

        /*
        =====================================
        VALIDAR TIPO PRODUCTO
        =====================================
        */

        const [tipoRows] = await connection.query(
            `
            SELECT *
            FROM tipo_producto_financiero
            WHERE id_tipo_producto = ?
            `,
            [id_tipo_producto]
        );

        if (tipoRows.length === 0) {

            throw new Error(
                'Tipo producto financiero no existe'
            );

        }

        const tipoProducto = tipoRows[0];

        /*
        =====================================
        VALIDACIONES DINAMICAS
        =====================================
        */

        // Ahorro
        if (tipoProducto.codigo === 'AHO') {

            if (
                configuracion.tasa_interes == null
            ) {

                throw new Error(
                    'Producto ahorro requiere tasa_interes'
                );

            }

        }

        // Prestamo
        if (tipoProducto.codigo === 'PRE') {

            if (
                configuracion.tasa_mora == null
            ) {

                throw new Error(
                    'Producto préstamo requiere tasa_mora'
                );

            }

        }

        /*
        =====================================
        VALIDAR CODIGO DUPLICADO
        =====================================
        */

        const [codigoRows] = await connection.query(
            `
            SELECT id_producto_financiero
            FROM producto_financiero
            WHERE codigo = ?
            `,
            [codigo]
        );

        if (codigoRows.length > 0) {

            throw new Error(
                'Código ya existe'
            );

        }

        /*
        =====================================
        INSERTAR PRODUCTO FINANCIERO
        =====================================
        */


        const [productoInsert] =
        await connection.query(
            `
            INSERT INTO producto_financiero
            (
                nombre,
                codigo,
                descripcion,
                id_tipo_producto,
                estado,
                fecha_creacion
            )
            VALUES
            (
                ?, ?, ?, ?,
                TRUE,
                NOW()
            )
            `,
            [
                nombre,
                codigo,
                descripcion || null,
                id_tipo_producto
            ]
        );

        const idProductoFinanciero =
        productoInsert.insertId;

        /*
        =====================================
        INSERTAR CONFIGURACION
        =====================================
        */

    
        await connection.query(
            `
            INSERT INTO producto_financiero_configuracion
            (

                id_producto_financiero,

                tasa_interes,
                tasa_mora,

                saldo_minimo,
                monto_minimo_apertura,

                plazo_minimo_meses,
                plazo_maximo_meses,

                permite_retiro,
                genera_interes,
                capitaliza_interes,
                permite_abono_capital,

                frecuencia_interes,
                tipo_calculo_interes,

                dias_base,

                fecha_inicio_vigencia,
                fecha_fin_vigencia,

                fecha_creacion

            )
            VALUES
            (
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?,
                ?, NOW()
            )
            `,
            [

                idProductoFinanciero,

                configuracion.tasa_interes ?? 0,
                configuracion.tasa_mora ?? 0,

                configuracion.saldo_minimo ?? 0,
                configuracion.monto_minimo_apertura ?? 0,

                configuracion.plazo_minimo_meses ?? null,
                configuracion.plazo_maximo_meses ?? null,

                configuracion.permite_retiro ?? true,
                configuracion.genera_interes ?? true,
                configuracion.capitaliza_interes ?? false,
                configuracion.permite_abono_capital ?? false,

                configuracion.frecuencia_interes ?? null,
                configuracion.tipo_calculo_interes ?? null,

                configuracion.dias_base ?? 360,

                new Date(configuracion.fecha_inicio_vigencia).toISOString().split('T')[0] ?? null,
                new Date(configuracion.fecha_fin_vigencia).toISOString().split('T')[0] ?? null,
               

            ]
        );

        /*
        =====================================
        COMMIT
        =====================================
        */

        await connection.commit();

        return {

            ok: true,

            mensaje:
            'Producto financiero creado correctamente',

            id_producto_financiero:
            idProductoFinanciero

        };

    } catch (error) {

        await connection.rollback();

        throw error;

    } finally {

        connection.release();

    }

};



 

/*
========================================
OBTENER PRODUCTOS FINANCIEROS
========================================
*/

const obtenerProductosFinancieros = async () => {

    const connection = await db.getConnection();

    try {

        const [rows] = await connection.query(
            `
            SELECT

                /*
                =====================================
                PRODUCTO FINANCIERO
                =====================================
                */

                pf.id_producto_financiero,
                pf.codigo,
                pf.nombre,
                pf.descripcion,
                pf.estado,
                pf.fecha_creacion,

                /*
                =====================================
                TIPO PRODUCTO
                =====================================
                */

                tpf.id_tipo_producto,
                tpf.codigo AS codigo_tipo_producto,
                tpf.nombre AS nombre_tipo_producto,
                tpf.descripcion AS descripcion_tipo_producto,

                /*
                =====================================
                CONFIGURACION
                =====================================
                */

                pfc.id_configuracion,

                pfc.tasa_interes,
                pfc.tasa_mora,

                pfc.saldo_minimo,
                pfc.monto_minimo_apertura,

                pfc.plazo_minimo_meses,
                pfc.plazo_maximo_meses,

                pfc.permite_retiro,
                pfc.genera_interes,
                pfc.capitaliza_interes,
                pfc.permite_abono_capital,

                pfc.frecuencia_interes,
                pfc.tipo_calculo_interes,

                pfc.dias_base,

                pfc.fecha_inicio_vigencia,
                pfc.fecha_fin_vigencia

            FROM cooperativa_db.producto_financiero pf

            INNER JOIN cooperativa_db.tipo_producto_financiero tpf
                ON tpf.id_tipo_producto =
                   pf.id_tipo_producto

            LEFT JOIN cooperativa_db.producto_financiero_configuracion pfc
                ON pfc.id_producto_financiero =
                   pf.id_producto_financiero

            ORDER BY pf.id_producto_financiero DESC
            `
        );

        return rows;

    } catch (error) {

        throw error;

    } finally {

        connection.release();

    }

};

/*
========================================
OBTENER PRODUCTO FINANCIERO POR ID
========================================
*/

const obtenerProductoFinancieroPorId =
async (idProductoFinanciero) => {

    const connection = await db.getConnection();

    try {

        const [rows] = await connection.query(
            `
            SELECT

                /*
                =====================================
                PRODUCTO FINANCIERO
                =====================================
                */

                pf.id_producto_financiero,
                pf.codigo,
                pf.nombre,
                pf.descripcion,
                pf.estado,
                pf.fecha_creacion,

                /*
                =====================================
                TIPO PRODUCTO
                =====================================
                */

                tpf.id_tipo_producto,
                tpf.codigo AS codigo_tipo_producto,
                tpf.nombre AS nombre_tipo_producto,
                tpf.descripcion AS descripcion_tipo_producto,

                /*
                =====================================
                CONFIGURACION
                =====================================
                */

                pfc.id_configuracion,

                pfc.tasa_interes,
                pfc.tasa_mora,

                pfc.saldo_minimo,
                pfc.monto_minimo_apertura,

                pfc.plazo_minimo_meses,
                pfc.plazo_maximo_meses,

                pfc.permite_retiro,
                pfc.genera_interes,
                pfc.capitaliza_interes,
                pfc.permite_abono_capital,

                pfc.frecuencia_interes,
                pfc.tipo_calculo_interes,

                pfc.dias_base,

                pfc.fecha_inicio_vigencia,
                pfc.fecha_fin_vigencia

            FROM cooperativa_db.producto_financiero pf

            INNER JOIN cooperativa_db.tipo_producto_financiero tpf
                ON tpf.id_tipo_producto =
                   pf.id_tipo_producto

            LEFT JOIN cooperativa_db.producto_financiero_configuracion pfc
                ON pfc.id_producto_financiero =
                   pf.id_producto_financiero

            WHERE pf.id_producto_financiero = ?
            `,
            [idProductoFinanciero]
        );

        if (rows.length === 0) {

            throw new Error(
                'Producto financiero no encontrado'
            );

        }

        return rows[0];

    } catch (error) {

        throw error;f

    } finally {

        connection.release();

    }

};

 
module.exports = {
 crearProductoFinanciero,
 obtenerTiposProductoFinanciero,
    obtenerProductosFinancieros,
    obtenerProductoFinancieroPorId
}