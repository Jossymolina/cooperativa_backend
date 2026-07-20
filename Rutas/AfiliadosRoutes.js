const express = require('express');
const router = express.Router();
const afiliados =require('../Controladores/AfiliadosController');
const validarJWT = require('../middlewares/validarJWT');
 

router.post( '/crear_afiliados',validarJWT,afiliados .crearAfiliados);
router.get('/obtener_afiliados', validarJWT,afiliados.obtenerAfiliados);
router.post('/obtener_afiliados_dni',validarJWT,afiliados.obtenerAfiliadosDNI);
router.post('/crear_cuenta_ahorro', validarJWT,afiliados.crearCuentaAhorro);
router.post('/crear_cuenta_prestamo',validarJWT, afiliados .crearCuentaPrestamo);
router.post('/sacarAfiliadosConPrestamos_Activos',validarJWT, afiliados .sacarAfiliadosConPrestamos_Activos);
router.post('/cambiarEstadoPrestamos',validarJWT, afiliados .cambiarEstadoPrestamos);
router.post('/desembolsarPrestamos',validarJWT, afiliados .desembolsarPrestamos);
router.post('/buscarProductosAfiliado',validarJWT, afiliados .buscarProductosAfiliado);
router.post('/sacarPrestamoXcuentaFinanciera',validarJWT, afiliados .sacarPrestamoXcuentaFinanciera);
router.post('/SacarCuotaPagarPrestamo',validarJWT, afiliados .SacarCuotaPagarPrestamo);
router.post('/registrarCuotaPrestamo',validarJWT, afiliados .registrarCuotaPrestamo);
router.post('/sacarMovimientoCuenta',validarJWT, afiliados .sacarMovimientoCuenta);
router.post('/sacarTablaAmortizacion',validarJWT, afiliados .sacarTablaAmortizacion);
router.post('/sacarPagosConDetallePrestamo',validarJWT, afiliados .sacarPagosConDetallePrestamo);
router.post('/aplicarAbonoCapital',validarJWT, afiliados .aplicarAbonoCapital);
router.post('/cancelarPrestamoTotal',validarJWT, afiliados .cancelarPrestamoTotal);
router.post('/BuscarProductoDEAhorroAfiliado',validarJWT, afiliados .BuscarProductoDEAhorroAfiliado);
router.post('/depositar_CuentaAhorro',validarJWT, afiliados .depositar_CuentaAhorro);
router.post('/retirar_CuentaAhorro',validarJWT, afiliados .retirar_CuentaAhorro);
router.get('/obtenerCuotasMesAfiliados',validarJWT, afiliados .obtenerCuotasMesAfiliados);
router.post('/cambiarEstadoPrestamosEnBloque',validarJWT, afiliados .cambiarEstadoPrestamosEnBloque);







module.exports = router;