const { IniciarEntregaSteps } = require('../Chofer/IniciarEntregaSteps');
const enviarMensaje = require('../../services/EnviarMensaje/EnviarMensaje');

const IniciarEntregaFlow = {

    async start(userId, data) {
        if (userId != null) {
            if (typeof IniciarEntregaSteps["PrimeraEleccionEntrega"] === 'function') {
                await IniciarEntregaSteps["PrimeraEleccionEntrega"](userId, data);
            } else {
                console.log("❌ El step 'PrimeraEleccionEntrega' no existe");
            }
        } else {
            console.log("⚠️ Ocurrió un error con los datos de usuario");
        }
    },

    async Handle(userId, message, currentStep, messageType) {
        if (userId != null) {
            console.log("📌 Step actual:", currentStep);

            if (typeof IniciarEntregaSteps[currentStep] === 'function') {
                await IniciarEntregaSteps[currentStep](userId, message);
            } else {
                console.log(`❌ El step solicitado '${currentStep}' no existe`);
            }
        } else {
            console.log("⚠️ Ocurrió un error con los datos de usuario");
        }
    }
};

module.exports = IniciarEntregaFlow;
