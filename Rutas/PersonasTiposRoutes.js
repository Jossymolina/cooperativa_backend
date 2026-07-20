const express = require('express');

const router = express.Router();

const PersonasTiposController = require('../Controladores/PersonasTiposController');

router.post('/', PersonasTiposController.asignarTipo);

//router.get('/:idpersona', PersonasTiposController.obtenerTiposPersona);

router.delete('/:idpersona_tipo', PersonasTiposController.eliminarTipoPersona);

module.exports = router;