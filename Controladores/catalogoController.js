let catalogoService =  require("../services/catalogo_contable_Servise.js")

const insertarCuentaContable =async (req, res) => {
    try {
        let p = req.body
     const respuesta = await catalogoService.insertarCuentaContable(p.codigo,p.nombre,p.idcuenta_padre,p.tipo,p.naturaleza,p.requiere_tercero);
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

const obtenerCatalogoContable =async (req, res) => {
    try {
     const respuesta = await catalogoService.obtenerCatalogoContable(req.body);
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
const eliminarCuentaContable =async (req, res) => {
    try {
     const respuesta = await catalogoService.eliminarCuentaContable(req.body.idcuenta);
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

const actualizarCuentaContable =async (req, res) => {
    try {
 
        console.log(req.body)
        let p = req.body
     const respuesta = await catalogoService.actualizarCuentaContable(p.idcuenta,p.codigo,p.nombre,p.idcuenta_padre,p.tipo,p.naturaleza,p.requiere_tercero,p.estado);
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

/**Ejercicio */
 
const listarEjercicios = async (req, res) => {

    try {

        const data = await catalogoService.listarEjercicios();

        return res.status(200).json({
            ok: true,
            data
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            ok: false,
            mensaje: error.message
        });
    }
};


const obtenerEjercicio = async (req, res) => {

    try {

        const { id } = req.params;
console.log("sacando periodos ",id)
        const data = await catalogoService.obtenerEjercicio(id);

        return res.status(200).json({
            ok: true,
            data
        });

    } catch (error) {

        return res.status(404).json({
            ok: false,
            mensaje: error.message
        });
    }
};


const crearEjercicio = async (req, res) => {

    try {
        const {
            anio,
            user
        } = req.body;
        console.log(req.body)
         const usuario = user || null;
        const data = await catalogoService.crearEjercicio({
            anio,
            usuario
        });

        return res.status(200).json({
            ok: true,
            mensaje: `Ejercicio ${anio} creado correctamente.`,
            data
        });

    } catch (error) {

        console.error(error);

        return res.status(200).json({
            ok: false,
            mensaje: error.message
        });
    }
};


const actualizarEjercicio = async (req, res) => {

    try {

        const { id } = req.params;

        const {
            anio
        } = req.body;

        const usuario = req.user?.id || null;

        const data = await catalogoService.actualizarEjercicio({
            idEjercicio: id,
            anio,
            usuario
        });

        return res.status(200).json({
            ok: true,
            mensaje: 'Ejercicio actualizado correctamente.',
            data
        });

    } catch (error) {

        console.error(error);

        return res.status(400).json({
            ok: false,
            mensaje: error.message
        });
    }
};


const eliminarEjercicio = async (req, res) => {

    try {

        const { id } = req.params;

        const data = await catalogoService.eliminarEjercicio(id);

        return res.status(200).json(data);

    } catch (error) {

        console.error(error);

        return res.status(400).json({
            ok: false,
            mensaje: error.message
        });
    }
};

const cerrarPeriodo = async (req, res) => {

    try {
        const { id } = req.params;
        console.log("el id es ",id)
        let p = {
                idPeriodo:id,
                usuario:null
            }
         await catalogoService.generarSaldoPeriodo(p.idPeriodo);
        const data = await catalogoService.cerrarPeriodo(p);
     

     
     
        return res.status(200).json({
            ok:true,
            data:data
        });
    } catch (error) {
        console.error(error);
        return res.status(200).json({
            ok: false,
            mensaje: error.message
        });
    }
};

 
const cerrarEjercicio = async (req, res) => {
    try {
        const { id } = req.params;
        console.log("Cerrar ejercicio",id)
        const data = await catalogoService.cerrarEjercicio(id);
        return res.status(200).json({
            ok: true,
            data
        });
    } catch (error) {
        console.error(error);
        return res.status(200).json({
            ok: false,
            mensaje: error.message
        });
    }
};
 


 
const insertarAsientoContable = async (req, res) => {

    try {

        const data =
            await catalogoService.insertarAsientoContable(
                req.body
            );  

        return res.status(200).json({
            ok: true,
            data
        });

    } catch (error) {

        console.error(error);

        return res.status(200).json({
            ok: false,
            mensaje: error.message
        });
    }
};
 

const obtenerCuentaContable = async (req, res) => {
    try {

        const { id } = req.params;
console.log("ide de la cuenta ",id)
        const data = await catalogoService.obtenerCuentaContable(id);

        return res.status(200).json({
            ok: true,
            data
        });

    } catch (error) {

        console.error(error);

        return res.status(200).json({
            ok: false,
            mensaje: error.message
        });
    }
};
 

const obtenerAsientosContables = async (req, res) => {

    try {

        const { idPeriodo } = req.params;

        if (!idPeriodo) {
            return res.status(200).json({
                ok: false,
                mensaje: 'El idPeriodo es requerido'
            });
        }

        const asientos = await catalogoService.listarAsientosContables(idPeriodo);

        return res.status(200).json({
            ok: true,
            data: asientos
        });

    } catch (error) {

        console.error('Error en obtenerAsientosContables:', error);

        return res.status(200).json({
            ok: false,
            mensaje: 'Error al consultar los asientos contables'
        });
    }
};

const consultarBalanza = async (req, res) => {
   try {
        const { idPeriodo } = req.params;
        if (!idPeriodo) {
            return res.status(200).json({
                ok: false,
                mensaje: 'El idPeriodo es requerido'
            });
        }
        console.log(idPeriodo)
        const balanza = await catalogoService.consultarBalanza(idPeriodo);
        return res.status(200).json({
            ok: true,
            data: balanza
        });
    } catch (error) {

        console.error('Error al consultar la balanza de comprobacion:', error);

        return res.status(200).json({
            ok: false,
            mensaje: 'Error al consultar la balanza de comprobacion'
        });
    }
};

 async function consultarBalanceGeneral(req,res){
     try {
        const { idPeriodo } = req.params;
        if (!idPeriodo) {
            return res.status(200).json({
                ok: false,
                mensaje: 'El idPeriodo es requerido'
            });
        }
        console.log(idPeriodo)
        const consultarBalanceGeneral = await catalogoService.consultarBalanceGeneral(idPeriodo);
        return res.status(200).json({
            ok: true,
            data: consultarBalanceGeneral
        });
    } catch (error) {

        console.error('Error al consultar el balance General:', error);

        return res.status(200).json({
            ok: false,
            mensaje: 'Error al consultar el balance General'
        });
    }
}

 async function consultarEstadoResultados(req,res){
     try {
        const { idPeriodo } = req.params;
        if (!idPeriodo) {
            return res.status(200).json({
                ok: false,
                mensaje: 'El idPeriodo es requerido'
            });
        }
        console.log(idPeriodo)
        const consultarEstadoResultados = await catalogoService.consultarEstadoResultados(idPeriodo);
        return res.status(200).json({
            ok: true,
            data: consultarEstadoResultados
        });
    } catch (error) {

        console.error('Error al consultar Estado de Resultado:', error);

        return res.status(200).json({
            ok: false,
            mensaje: 'Error al consultar Estado de Resultado'
        });
    }
}

 async function consultarLibroDiario(req,res){
     try {
        const { idPeriodo } = req.params;
        if (!idPeriodo) {
            return res.status(200).json({
                ok: false,
                mensaje: 'El idPeriodo es requerido'
            });
        }
        console.log(idPeriodo)
        const consultarLibroDiario = await catalogoService.consultarLibroDiario(idPeriodo);
        return res.status(200).json({
            ok: true,
            data: consultarLibroDiario
        });
    } catch (error) {

        console.error('Error al consultar Estado de Resultado:', error);

        return res.status(200).json({
            ok: false,
            mensaje: 'Error al consultar Estado de Resultado'
        });
    }
}

 async function consultarLibroMayor(req,res){
     try {
        const { idPeriodo } = req.params;
        if (!idPeriodo) {
            return res.status(200).json({
                ok: false,
                mensaje: 'El idPeriodo es requerido'
            });
        }
        console.log(idPeriodo)
        const consultarLibroMayor = await catalogoService.consultarLibroMayor(idPeriodo);
        return res.status(200).json({
            ok: true,
            data: consultarLibroMayor
        });
    } catch (error) {

        console.error('Error al consultar el libro Mayor:', error);

        return res.status(200).json({
            ok: false,
            mensaje: 'Error al consultar el libro Mayor'
        });
    }
}


 
module.exports  = {
    insertarCuentaContable,
    obtenerCatalogoContable,
    actualizarCuentaContable,
    eliminarCuentaContable,
    //Ejercicio
     listarEjercicios,
    obtenerEjercicio,
    crearEjercicio,
    actualizarEjercicio,
    eliminarEjercicio,
    cerrarPeriodo,
    cerrarEjercicio,
    //asiento contable 
    insertarAsientoContable,
    obtenerCuentaContable,
    obtenerAsientosContables,
    consultarBalanza,
    consultarBalanceGeneral,
    consultarEstadoResultados,
    consultarLibroDiario,
    consultarLibroMayor
    


}