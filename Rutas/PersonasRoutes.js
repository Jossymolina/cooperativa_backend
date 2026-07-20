const express = require('express');

const router = express.Router();

const PersonasController = require('../Controladores/PersonasController');

//

//router.get('/', PersonasController.obtenerPersonas);

//router.get('/:idpersona', PersonasController.obtenerPersona);

//router.put('/:idpersona', PersonasController.actualizarPersona);

//router.delete('/:idpersona', PersonasController.eliminarPersona);
router.post('/obtenerPersonaIdentidad', PersonasController.obtenerPersonaIdentidad);
router.get('/sacar_tipos_persona', PersonasController.sacar_tipos_persona);
router.post('/crear_persona', PersonasController.crearPersona);

module.exports = router;