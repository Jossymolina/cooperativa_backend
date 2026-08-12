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

module.exports  = {
    insertarCuentaContable,
    obtenerCatalogoContable,
    actualizarCuentaContable,
    eliminarCuentaContable


}