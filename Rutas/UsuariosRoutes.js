const express = require('express');

const router = express.Router();

const UsuariosController = require('../Controladores/UsuariosController');

router.post('/', UsuariosController.crearUsuario);

router.get('/', UsuariosController.obtenerUsuarios);

router.get('/:idusuario', UsuariosController.obtenerUsuario);

router.put('/:idusuario', UsuariosController.actualizarUsuario);

router.delete('/:idusuario', UsuariosController.eliminarUsuario);

module.exports = router;