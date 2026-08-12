const express = require('express');
const router = express.Router();
const ctalogoController =require('../Controladores/catalogoController');
const validarJWT = require('../middlewares/validarJWT');
 

router.post( '/insertarCuentaContable',validarJWT,ctalogoController .insertarCuentaContable);
router.get('/obtenerCuentasContables', validarJWT,ctalogoController.obtenerCatalogoContable);
router.post('/actualizarcuentaContable', validarJWT,ctalogoController.actualizarCuentaContable);
router.post('/eliminarCuentasContables', validarJWT,ctalogoController.eliminarCuentaContable);

 module.exports = router