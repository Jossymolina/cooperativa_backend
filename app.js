const cors = require('cors');
const morgan = require('morgan');

const RutasGenerales = require('./Rutas/RutasGenerales');
const authRoutes = require('./Rutas/auth');
const PersonasRoutes = require('./Rutas/PersonasRoutes');
const PersonasTiposRoutes = require('./Rutas/PersonasTiposRoutes');
const UsuariosRoutes = require('./Rutas/UsuariosRoutes');
const RolesRoutes = require('./Rutas/RolesRoutes');
const ModulosRoutes = require('./Rutas/ModulosRoutes');
const AccionesRoutes = require('./Rutas/AccionesRoutes');
const RolesPermisosRoutes = require('./Rutas/RolesPermisosRoutes');
const productos_financieros = require('./Rutas/producto_financiero');
const afiliados_controlador = require('./Rutas/AfiliadosRoutes');
const excel_ruta = require('./Rutas/excel_cargarRoutes');





const express = require('express');
const app = express();

app.use(express.json());

app.use(cors());
app.use(morgan('dev'));


app.use('/api', RutasGenerales);
app.use('/api', authRoutes);
app.use('/api', PersonasRoutes);
app.use('/api/', PersonasTiposRoutes);
app.use('/api',productos_financieros );
app.use('/api',afiliados_controlador );
app.use('/api',excel_ruta );


/*app.use('/api/', UsuariosRoutes);
app.use('/api/', RolesRoutes);
app.use('/api/', ModulosRoutes);
app.use('/api/', AccionesRoutes);
app.use('/api/', RolesPermisosRoutes);*/
module.exports = app;