const { IniciarEntregaSteps } = require('../Chofer/IniciarEntregaSteps');

const IniciarEntregaFlow = {

    async start(userId, data, sock) {

        //await sock.sendMessage(userId, { text: '📝 Recopilando datos de la hoja de ruta deseada \n Listando datos detectados:' });

        if (userId != null && sock != null) {
            if (typeof IniciarEntregaSteps["PrimeraEleccionEntrega"] === 'function') {
                await IniciarEntregaSteps["PrimeraEleccionEntrega"](userId, data, sock);
            } else {
                console.log("El step solicitado no existe");
            }
        } else {
            console.log("Ocurrio un error con los datos")
        }
    },

    async Handle(userId, message, currentStep, sock, messageType) {

        if (userId != null && sock != null) {

            // Y que EgresoMaterialSteps es un objeto que contiene tus funciones
            if (typeof IniciarEntregaSteps[currentStep] === 'function') {
                await IniciarEntregaSteps[currentStep](userId, message, sock);
            } else {
                console.log("El step solicitado no existe");
            }

        } else {
            console.log("Ocurrio un error con los datos")
        }
    }

}
module.exports = IniciarEntregaFlow