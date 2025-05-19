const { IniciarRutaSteps } = require('../Logistica/IniciarRutaSteps');
const enviarMensaje = require('../../services/EnviarMensaje/EnviarMensaje');

const ConfirmarPedidoFlow = {

    async start(userId, data) {
        await enviarMensaje(userId, '📝 Recopilando datos de la hoja de ruta deseada \n Listando datos detectados:');

        if (userId != null) {
            if (typeof IniciarRutaSteps["CrearRuta"] === 'function') {
                await IniciarRutaSteps["CrearRuta"](userId, data);
            } else {
                console.log("❌ El step 'CrearRuta' no existe");
            }
        } else {
            console.log("❌ Ocurrió un error con los datos (userId inválido)");
        }
    },

    async Handle(userId, message, currentStep) {
        if (userId != null) {
            if (typeof IniciarRutaSteps[currentStep] === 'function') {
                await IniciarRutaSteps[currentStep](userId, message);
            } else {
                console.log(`❌ El step '${currentStep}' no existe`);
            }
        } else {
            console.log("❌ Ocurrió un error con los datos:");
            console.log("userId:", userId);
            console.log("message:", message);
            console.log("currentStep:", currentStep);
        }
    }

};

module.exports = ConfirmarPedidoFlow;
