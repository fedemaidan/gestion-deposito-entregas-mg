const PrimeraEleccionEntrega = require('../Chofer/Envios/PrimeraEleccionEntrega');
const SecuenciaEntrega = require('../Chofer/Envios/SecuenciaEntrega');
const EntregaNOK = require('../Chofer/EstadosDeEntrega/EntregaNOK');
const EntregaOK = require('../Chofer/EstadosDeEntrega/EntregaOK');
const Reprogramado = require('../Chofer/EstadosDeEntrega/Reprogramado');
const Aclaracion = require('../Chofer/HerramientaDeEstado/Aclaracion');
const ModificarEntrega = require('../Chofer/Envios/ModificarEntrega');
const IniciarEntregaSteps =
{
    PrimeraEleccionEntrega,
    SecuenciaEntrega,
    EntregaNOK,
    EntregaOK,
    Reprogramado,
    Aclaracion,
    ModificarEntrega
}
module.exports = { IniciarEntregaSteps };