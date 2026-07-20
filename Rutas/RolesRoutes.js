const express = require('express');

const router = express.Router();

const RolesController = require('../Controladores/RolesController');

router.post('/', RolesController.crearRol);

router.get('/', RolesController.obtenerRoles);

router.get('/:idrol', RolesController.obtenerRol);

router.put('/:idrol', RolesController.actualizarRol);

router.delete('/:idrol', RolesController.eliminarRol);

router.post('/asignar', RolesController.asignarRolUsuario);

router.get('/usuario/:idusuario', RolesController.obtenerRolesUsuario);

router.delete('/usuario/:idusuario_rol', RolesController.quitarRolUsuario);

module.exports = router;