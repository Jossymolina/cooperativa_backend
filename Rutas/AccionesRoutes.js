const express = require('express');

const router = express.Router();

const AccionesController = require('../Controladores/AccionesController');
 


router.post('/', AccionesController.crearAccion);

router.get('/', AccionesController.obtenerAcciones);

router.get('/:idaccion', AccionesController.obtenerAccion);

router.put('/:idaccion', AccionesController.actualizarAccion);

router.delete('/:idaccion', AccionesController.eliminarAccion);

module.exports = router;