const express = require('express');

const router = express.Router();

const controladorGeneral = require('../Controladores/ControladorGeneral');

router.get('/prueba', controladorGeneral.prueba);

module.exports = router;