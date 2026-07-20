const express = require('express');

const router = express.Router();

const ModulosController = require('../Controladores/ModulosController');

router.post('/', ModulosController.crearModulo);

router.get('/', ModulosController.obtenerModulos);

router.get('/:idmodulo', ModulosController.obtenerModulo);

router.put('/:idmodulo', ModulosController.actualizarModulo);

router.delete('/:idmodulo', ModulosController.eliminarModulo);

module.exports = router;