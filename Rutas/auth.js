const express = require('express');
const validarJWT = require('../middlewares/validarJWT');
const router = express.Router();

const authController = require('../Controladores/ctr_auth');

router.post('/login', authController.login);

router.post('/crear_usuario',validarJWT, authController.crearUsuario);
router.get('/listar_usuario',validarJWT, authController.sacarUsuariosDB);




module.exports = router;