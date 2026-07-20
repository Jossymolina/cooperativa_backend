const express = require('express');
const router = express.Router();

const controller =
require('../Controladores/producto_financiero');

router.post(
    '/crear_producto_financiero',
    controller.crearProductoFinanciero
);
router.get(
    '/obtener_productos_financieros',
    controller.obtenerTodoProductoFinanciero
);


router.get(
    '/tipos_producto_financiero',
    controller.obtenerTiposProductoFinanciero
);

module.exports = router;