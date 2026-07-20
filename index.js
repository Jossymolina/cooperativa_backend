const app = require('./app');
require('dotenv').config();
const pool = require('./Configuraciones/ConexionDb/db');

const PORT =  process.env.PORT || 3000;

app.listen(PORT, async() => {
    console.log('Servidor corriendo en puerto ' + PORT);
      try {

        const connection = await pool.getConnection();

        console.log('Base de datos conectada');

        connection.release();

    } catch (error) {

        console.log(error);

    }
});