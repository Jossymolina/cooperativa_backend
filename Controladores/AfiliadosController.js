const cuentaFinancieraService =require('../services/AfiliadosService');
const shoulder =require('../scheduler/intereses.scheduler');
 
const crearAfiliados = async (req, res) => {
    try {
        const respuesta = await cuentaFinancieraService.crearAfiliado(req.body);
        return res.status(200).json(  
            respuesta        
        );
    } catch (error) {
         return res.status(200).json({
            ok:false,
            msg:  error.message
        });
    }
};

 
const obtenerAfiliados =async (req, res) => {
    try {
        const respuesta =   await cuentaFinancieraService  .obtenerAfiliados();
        return res.status(200).json({
            ok: true,
            data: respuesta
        });

    } catch (error) {
        return res.status(200).json({
            ok:false,
            msg:  error.message
        });
    }
};


const obtenerAfiliadosDNI =async (req, res) => {
    try {
        const respuesta = await cuentaFinancieraService.obtenerAfiliadosDNI(req.body);
        return res.status(200).json({
            ok: true,
            data: respuesta
        });
    } catch (error) {
        return res.status(200).json({
            ok:false,
            msg: error.message
        });
    }
};

const crearCuentaAhorro =async (req, res) => {
    try {
        const respuesta =await cuentaFinancieraService.crearCuentaAhorro(req.body);
        return res.status(200).json({
            ok: true,
            data: respuesta
        });
    } catch (error) {
       return res.status(200).json({
            ok:false,
            msg:error.message
        });
    }
};

const crearCuentaPrestamo = async (req, res) => {
    try {
        const respuesta = await cuentaFinancieraService .crearCuentaPrestamo(req.body);
        return res.status(200).json({
            ok: true,
            data: respuesta
        });
    } catch (error) {
             return res.status(200).json({
            ok:false,
            msg:  error.message
        });
    }
};

const sacarAfiliadosConPrestamos_Activos =async (req, res) => {
    try {
        const respuesta =  await cuentaFinancieraService.sacarAfiliadosConPrestamos_Activos(req.body);
        return res.status(200).json({
            ok: true,
            data: respuesta
        });
    } catch (error) {
        return res.status(200).json({
            ok:false,
            msg:error.message
        });
    }
};

const cambiarEstadoPrestamos =async (req, res) => {
    try {
        const respuesta = await cuentaFinancieraService .cambiarEstadoDeUnPrestamo(req.body);
        return res.status(200).json({
            ok: true,
            data: respuesta
        });
    } catch (error) {
        return res.status(200).json({
            ok:false,
            msg:error.message
        });
    }
};

const cambiarEstadoPrestamosEnBloque =async (req, res) => {
    try {
     const respuesta = await cuentaFinancieraService .cambiarEstadoDeUnPrestamoEnBloque(req.body.prestamos);
       return res.status(200).json({
            ok: true,
            data:respuesta
        });
    } catch (error) {
        return res.status(200).json({
            ok:false,
            msg: error.message
        });
    }
};


const desembolsarPrestamos =async (req, res) => {
    try {
        const respuesta = await cuentaFinancieraService.desembolsarPrestamos(req.body);
        return res.status(200).json({
            ok: true,
            data: respuesta
        });
    } catch (error) {
         return res.status(200).json({
            ok:false,
            msg:error.message
        });
    }
};


const buscarProductosAfiliado =async (req, res) => {
    try {
        const respuesta = await cuentaFinancieraService.buscarProductosAfiliado(req.body);
           return res.status(200).json({
            ok: true,
            data: respuesta,
          });

    } catch (error) {
       return res.status(200).json({
            ok:false,
            msg: error.message
        });
    }
};


const sacarPrestamoXcuentaFinanciera = async (req, res) => {
    try {

        const respuesta = await cuentaFinancieraService.sacarPrestamoXcuentaFinanciera(req.body);
        return res.status(200).json({
            ok: true,
            data: respuesta
        });
    } catch (error) {
 return res.status(200).json({
            ok:false,
            msg:error.message
        });
    }
};

const SacarCuotaPagarPrestamo = async (req, res) => {
    try {
const respuesta = await cuentaFinancieraService.SacarCuotaPagarPrestamo(req.body);
        return res.status(200).json({
            ok: true,
            data: respuesta
        });
    } catch (error) {
return res.status(200).json({
            ok:false,
            msg:error.message
 });
 }
};


const registrarCuotaPrestamo = async (req, res) => {
    try {
const respuesta =await cuentaFinancieraService.registrarCuotaPrestamo(req.body);
        return res.status(200).json({
            ok: true,
            data: respuesta,
            msg:respuesta.msg
        });
    } catch (error) {
return res.status(200).json({
            ok:false,
            msg: error.message
        });
    }
};


const sacarMovimientoCuenta = async (req, res) => {
    try {
const respuesta =await cuentaFinancieraService.sacarMovimientoCuenta(req.body);
        return res.status(200).json({
            ok: true,
            data: respuesta
        });
    } catch (error) {
return res.status(200).json({
            ok:false,
            msg:error.message
        });
    }
};

const sacarTablaAmortizacion = async (req, res) => {
    try {
const respuesta =await cuentaFinancieraService.sacarTablaAmortizacion(req.body);
        return res.status(200).json({
            ok: true,
            data: respuesta
        });
    } catch (error) {
return res.status(200).json({
            ok:false,
            msg:error.message
        });
    }
};


const sacarPagosConDetallePrestamo = async (req, res) => {
    try {
 const respuesta =await cuentaFinancieraService.sacarPagosConDetallePrestamo(req.body);
        return res.status(200).json({
            ok: true,
            data: respuesta
        });
    } catch (error) {
 return res.status(200).json({
            ok:false,
            msg:error.message
        });
    }
};

const aplicarAbonoCapital = async (req, res) => {
    try {
const respuesta =await cuentaFinancieraService.aplicarAbonoCapital(
    req.body.idPrestamo,
    req.body.numeroCuotaInicio,
    req.body.montoAbono,
   req.body.nuevaAmortizacionArreglo,
   req.body.productoSeleccionado
        );

        return res.status(200).json({
            ok: true,
            data: respuesta
        });


    } catch (error) {
          return res.status(200).json({
 ok:false,
            msg:error.message
        });
    }
};

const cancelarPrestamoTotal = async (req, res) => {
    try {
 const respuesta =await cuentaFinancieraService.cancelarPrestamoTotal(
         req.body.numeroCuotaInicio,
          req.body.productoSeleccionado,
          req.body.interes,
          req.body.capital,
          req.body.mora,
          req.body.total_a_pagar
       );
       return res.status(200).json({
            ok: true,
            data: respuesta
        });
    } catch (error) {
 return res.status(200).json({
            ok:false,
            msg:error.message
        });
    }
};


const BuscarProductoDEAhorroAfiliado = async (req, res) => {
    try {
const respuesta = await cuentaFinancieraService .BuscarProductoDEAhorroAfiliado(req.body);
 return res.status(200).json({
            ok: true,
            data: respuesta,
          });
    } catch (error) {
 return res.status(200).json({
            ok:false,
            msg: error.message
        });
    }
};


const depositar_CuentaAhorro = async (req, res) => {
    try {
        const respuesta = await cuentaFinancieraService .depositar_CuentaAhorro(req.body);
         return res.status(200).json({
            ok: true,
            data: respuesta,
         });
  } catch (error) {
       return res.status(200).json({
            ok:false,
           msg: error.message
        });
    }
};



const retirar_CuentaAhorro = async (req, res) => {
    try {
       const respuesta = await cuentaFinancieraService .retirar_CuentaAhorro(req.body);
       return res.status(200).json({
            ok: true,
            data: respuesta,
        });
   } catch (error) {
 return res.status(200).json({
            ok:false,
            msg: error.message
        });
    }
};


const obtenerCuotasMesAfiliados = async (req, res) => {
    try {
        const respuesta = await cuentaFinancieraService.obtenerCuotasMesAfiliados();
        
        return res.status(200).json({
            ok: true,
            data: respuesta,
        });
    } catch (error) {
        return res.status(200).json({
            ok: false,
            msg: error.message
        });
    }
};




module.exports = {

    crearAfiliados,
    obtenerAfiliados,
    obtenerAfiliadosDNI,
    crearCuentaAhorro,
    crearCuentaPrestamo,
    sacarAfiliadosConPrestamos_Activos,
    cambiarEstadoPrestamos,
    desembolsarPrestamos,
    buscarProductosAfiliado,
    sacarPrestamoXcuentaFinanciera,
    SacarCuotaPagarPrestamo,
    registrarCuotaPrestamo,
    sacarMovimientoCuenta,
    sacarTablaAmortizacion,
    sacarPagosConDetallePrestamo,
    aplicarAbonoCapital,
    cancelarPrestamoTotal,
    BuscarProductoDEAhorroAfiliado,
    depositar_CuentaAhorro,
    retirar_CuentaAhorro,
    obtenerCuotasMesAfiliados,
    cambiarEstadoPrestamosEnBloque
    
};