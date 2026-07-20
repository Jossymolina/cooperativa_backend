const  db = require("../Configuraciones/ConexionDb/db")

function prueba(req,res){
    let codigo = `
    SELECT * FROM correspondencia_hm.archivos limit 20
    `
    db.query(codigo,(error,result)=>{
        if(error) return  res.status(200).send({mensaje:"Error de conexion"})
            if(result.length===0) return  res.status(200).send({mensaje:"No se encontro nada"})
         return res.status(200).send({resultado:result}) 
         
    })
}

module.exports={
    prueba
}