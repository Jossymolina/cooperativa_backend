const service =
require('../services/producto_financiero');

crearProductoFinanciero = async (req, res) => {

    try {

        const respuesta =
        await service.crearProductoFinanciero(req.body);

        return res.status(200).json({
            ok: true,
            msg: 'Producto financiero creado correctamente',
            data: respuesta
        });

    } catch (error) {

        console.log(error);

        return res.status(200).json({
            ok: false,
            msg: error.message
        });

    }

};

obtenerTiposProductoFinanciero = async (req, res) => {

    try {
console.log("sacar tipos")
        const respuesta =
        await service.obtenerTiposProductoFinanciero();

        return res.status(200).json({
            ok: true,
            data: respuesta
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            ok: false,
            msg: error.message
        });

    }

};

obtenerTodoProductoFinanciero = async (req, res) => {

    try {
console.log("sacar productos financieros")
        const respuesta =
        await service.obtenerProductosFinancieros();

        return res.status(200).json({
            ok: true,
            data: respuesta
        });

    } catch (error) {

        console.log(error);

        return res.status(500).json({
            ok: false,
            msg: error.message
        });

    }

};
module.exports = {
    obtenerTiposProductoFinanciero,
    crearProductoFinanciero,
    obtenerTodoProductoFinanciero
}