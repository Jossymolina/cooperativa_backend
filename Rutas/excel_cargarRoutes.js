const express = require('express');
const router = express.Router();

const multer = require('multer');
const excel_carga = require('../Controladores/excel_carga');

const upload = multer({
    dest: 'uploads/'
});

router.post('/cargar_excel_cuotas', upload.single('archivo'),  excel_carga.cargarPlanilla);
router.post('/sacarPlanillaGuardada',  excel_carga.sacarPlanillaGuardada);
router.post('/procesarplanillaCargado',  excel_carga.procesarplanillaCargado);




module.exports = router;