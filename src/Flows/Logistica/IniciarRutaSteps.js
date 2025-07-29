const ConfirmarOModificarRuta = require('../Logistica/IniciarRuta/STEPS/ConfirmarOModificarRuta');
const CrearRuta = require('../Logistica/IniciarRuta/STEPS/CrearRuta');
const obtenerInformacion = require('../Logistica/obtenerinformacionDeHDR/obtenerInformacion');
const confirmarAccionHDR = require('./obtenerinformacionDeHDR/confirmarAccionHdr');

const IniciarRutaSteps =
{
    ConfirmarOModificarRuta,
    CrearRuta,
    obtenerInformacion,
    confirmarAccionHDR
}
module.exports = { IniciarRutaSteps };