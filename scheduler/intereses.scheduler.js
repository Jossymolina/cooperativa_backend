const cron = require('node-cron');
const { generarInteresesAhorro } = require('../services/AfiliadosService');
const db = require('../Configuraciones/ConexionDb/db');

        console.log("Verificando dias ::::::::::::::::::")
//'0 23 28-31 * *'
cron.schedule('* * * * *', async () => {

    try {
        console.log("Verificando dias ::::::::::::::::::")

        const hoy = new Date();

        // ¿Es el último día del mes?
        const manana = new Date(hoy);
        manana.setDate(hoy.getDate() + 1);
        console.log(manana)
        console.log(hoy.getMonth())
//!== hoy.getMonth()
        if (hoy.getMonth() ===5) {

            console.log("Generando intereses...");

            const connection = await db.getConnection();

            try {

                await connection.beginTransaction();
console.log("Activando servicio")
                await generarInteresesAhorro(connection);

                await connection.commit();

            } catch (error) {

                await connection.rollback();

                console.error(error);

            } finally {

                connection.release();

            }

        }

    } catch (error) {

        console.error(error);

    }

});