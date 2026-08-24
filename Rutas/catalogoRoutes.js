const express = require('express');
const router = express.Router();
const ctalogoController =require('../Controladores/catalogoController');
const validarJWT = require('../middlewares/validarJWT');
 

router.post( '/insertarCuentaContable',validarJWT,ctalogoController .insertarCuentaContable);
router.get('/obtenerCuentasContables', validarJWT,ctalogoController.obtenerCatalogoContable);
router.post('/actualizarcuentaContable', validarJWT,ctalogoController.actualizarCuentaContable);
router.post('/eliminarCuentasContables', validarJWT,ctalogoController.eliminarCuentaContable);

/**
 * Ejercicios
 */
router.get('/listarEjercicios',validarJWT, ctalogoController.listarEjercicios);
router.get('/obtenerEjercicio/:id', validarJWT,ctalogoController.obtenerEjercicio);
router.post('/crearEjercicio', validarJWT,ctalogoController.crearEjercicio);
/*
router.put('/:id',validarJWT,ctalogoController.actualizarEjercicio);
router.delete('/:id',validarJWT, ctalogoController.eliminarEjercicio);*/

router.get('/cerrarPeriodo/:id',validarJWT, ctalogoController.cerrarPeriodo);
router.put('/cerrarEjercicio/:id/cerrar',validarJWT, ctalogoController.cerrarEjercicio);
 
router.post( '/insertarAsientoContable',  validarJWT, ctalogoController.insertarAsientoContable);

router.get( '/obtenerCuentaContable/:id',  validarJWT,  ctalogoController.obtenerCuentaContable);
router.get( '/listarAsientosContables/:idPeriodo',validarJWT, ctalogoController.obtenerAsientosContables);
router.get( '/consultarBalanza/:idPeriodo',validarJWT, ctalogoController.consultarBalanza);
router.get( '/consultarBalanceGeneral/:idPeriodo',validarJWT, ctalogoController.consultarBalanceGeneral);
router.get( '/consultarEstadoResultados/:idPeriodo',validarJWT, ctalogoController.consultarEstadoResultados);
router.get( '/consultarLibroDiario/:idPeriodo',validarJWT, ctalogoController.consultarLibroDiario);
router.get( '/consultarLibroMayor/:idPeriodo',validarJWT, ctalogoController.consultarLibroMayor);





 module.exports = router