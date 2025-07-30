const PrimeraEleccionEntrega = require('../Chofer/Envios/PrimeraEleccionEntrega');
const SecuenciaEntrega = require('../Chofer/Envios/SecuenciaEntrega');
const EntregaNOK = require('../Chofer/EstadosDeEntrega/EntregaNOK');
const EntregaOK = require('../Chofer/EstadosDeEntrega/EntregaOK');
const Reprogramado = require('../Chofer/EstadosDeEntrega/Reprogramado');
const Aclaracion = require('../Chofer/HerramientaDeEstado/Aclaracion');
const ModificarEntrega = require('../Chofer/Envios/ModificarEntrega');
const ConfirmarSigEntrega = require('../Chofer/Envios/ConfirmarSigEntrega');
const Bloq = require('../Chofer/HerramientaDeEstado/Bloq');
const TerminarEntregas = require('../Chofer/Envios/TerminarEntregas');
const confirmarSigestado = require('./Envios/confirmarSigestado');

const IniciarEntregaSteps =
{
    PrimeraEleccionEntrega,
    SecuenciaEntrega,
    EntregaNOK,
    EntregaOK,
    Reprogramado,
    Aclaracion,
    ModificarEntrega,
    ConfirmarSigEntrega,
    Bloq,
    TerminarEntregas,
    confirmarSigestado
}
module.exports = { IniciarEntregaSteps };