const express = require('express');

const router = express.Router();

const RolesPermisosController = require('../Controladores/RolesPermisosController');

router.post('/', RolesPermisosController.asignarPermiso);

router.get('/:idrol', RolesPermisosController.obtenerPermisosRol);

router.delete('/:idrol_permiso', RolesPermisosController.eliminarPermiso);

module.exports = router;