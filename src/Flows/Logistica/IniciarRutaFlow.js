const { IniciarRutaSteps } = require('../Logistica/IniciarRutaSteps');

const ConfirmarPedidoFlow = {

    async start(userId, data, sock) {

        await sock.sendMessage(userId, { text: '📝 Recopilando datos de la hoja de ruta deseada \n Listando datos detectados:' });
        if (userId != null && sock != null) {
            if (typeof IniciarRutaSteps["CrearRuta"] === 'function') {
                await IniciarRutaSteps["CrearRuta"](userId, data, sock);
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
            if (typeof IniciarRutaSteps[currentStep] === 'function') {
                await IniciarRutaSteps[currentStep](userId, message, sock);
            } else {
                console.log("El step solicitado no existe");
            }

        } else {
            console.log("Ocurrio un error con los datos")
        }
    }

}
module.exports = ConfirmarPedidoFlow