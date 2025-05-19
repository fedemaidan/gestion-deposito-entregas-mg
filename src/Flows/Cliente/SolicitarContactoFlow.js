const { SolicitarContactoSteps } = require('../Cliente/SolicitarContactoSteps');

const IniciarEntregaFlow = {

    async start(userId, data) {
        
        if (userId != null) {
            if (typeof SolicitarContactoSteps["SolicitarDatos"] === 'function') {
                await SolicitarContactoSteps["SolicitarDatos"](userId, data);
            } else {
                console.log("El step solicitado no existe");
            }
        } else {
            console.log("Ocurrio un error con los datos")
        }
    },

    async Handle(userId, message, currentStep, messageType) {

        if (userId != null) {

            console.log("ACA ESTA EL STEP")
            console.log(currentStep)

            // Y que EgresoMaterialSteps es un objeto que contiene tus funciones
            if (typeof SolicitarContactoSteps[currentStep] === 'function') {
                await SolicitarContactoSteps[currentStep](userId, message);
            } else {
                console.log("El step solicitado no existe");
            }

        } else {
            console.log("Ocurrio un error con los datos")
        }
    }

}
module.exports = IniciarEntregaFlow