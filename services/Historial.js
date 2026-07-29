// services/bitacora.service.js

// services/bitacora.service.js

async function registrarBitacora(
    conexion,
    {
        idusuario,
        tabla_afectada,
        accion,
        descripcion,
        datos_anteriores = null,
        datos_nuevos = null,
        nivel = 'INFO'
    }
) {
    try {

        const sql = `
            INSERT INTO bitacora (
                idusuario,
                tabla_afectada,
                accion,
                descripcion,
                datos_anteriores,
                datos_nuevos,
                nivel
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const [resultado] = await conexion.query(sql, [
            idusuario,
            tabla_afectada,
            accion,
            descripcion,
            datos_anteriores ? JSON.stringify(datos_anteriores) : null,
            datos_nuevos ? JSON.stringify(datos_nuevos) : null,
            nivel
        ]);

        return resultado.insertId;

    } catch (error) {
        throw error; // Se devuelve el error al padre
    }
}

module.exports = {
    registrarBitacora
};
 