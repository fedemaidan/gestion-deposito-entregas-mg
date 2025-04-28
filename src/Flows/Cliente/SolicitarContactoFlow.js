const { SolicitarContactoSteps } = require('../Cliente/SolicitarContactoSteps');

const IniciarEntregaFlow = {

    async start(userId, data, sock) {

        //await sock.sendMessage(userId, { text: '📝 Recopilando datos de la hoja de ruta deseada \n Listando datos detectados:' });

        if (userId != null && sock != null) {
            if (typeof SolicitarContactoSteps["SolicitarDatos"] === 'function') {
                await SolicitarContactoSteps["SolicitarDatos"](userId, data, sock);
            } else {
                console.log("El step solicitado no existe");
            }
        } else {
            console.log("Ocurrio un error con los datos")
        }
    },

    async Handle(userId, message, currentStep, sock, messageType) {

        if (userId != null && sock != null) {

            console.log("ACA ESTA EL STEP")
            console.log(currentStep)

            // Y que EgresoMaterialSteps es un objeto que contiene tus funciones
            if (typeof SolicitarContactoSteps[currentStep] === 'function') {
                await SolicitarContactoSteps[currentStep](userId, message, sock);
            } else {
                console.log("El step solicitado no existe");
            }

        } else {
            console.log("Ocurrio un error con los datos")
        }
    }

}
module.exports = IniciarEntregaFlow