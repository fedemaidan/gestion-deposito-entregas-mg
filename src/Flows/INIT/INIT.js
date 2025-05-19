const { analizarIntencion } = require('../../Utiles/Chatgpt/AnalizarIntencion');
const IniciarRutaFlow = require('../Logistica/IniciarRutaFlow');
const FlowManager = require('../../FlowControl/FlowManager');
const { enviarErrorPorWhatsapp } = require("../../services/Excepcion/manejoErrores");
const enviarMensaje = require("../../services/EnviarMensaje/EnviarMensaje");

const defaultFlow = {
    async Init(userId, message, messageType) {
        try {
            let result;

            await enviarMensaje(userId, "⏳ Analizando mensaje ⏳");

            if (messageType === "text" || messageType === "text_extended" || messageType === "audio") {
                result = await analizarIntencion(message, userId);
            } else {
                result = message;
            }

            console.log(JSON.stringify(result, null, 2));

            switch (result.accion) {
                case "Crear ruta":
                    await IniciarRutaFlow.start(userId, { data: result.data });
                    break;

                case "No comprendido":
                    await enviarMensaje(userId, "😕 No comprendí tu mensaje,❌ o no poseés los permisos necesarios para esta acción. Por favor, repetilo.");
                    FlowManager.resetFlow(userId);
                    break;

                case "NoRegistrado":
                    console.log("NO REGISTRADO");
                    break;
            }

            return;
        } catch (err) {
            console.error('❌ Error analizando la intención:', err.message);
            await enviarErrorPorWhatsapp(err, "metal grande");
            return { accion: 'DESCONOCIDO' };
        }
    },

    async handle(userId, message) {
        await enviarMensaje(userId, 'No entendí tu mensaje, por favor repetilo.');
    },
};

module.exports = defaultFlow;
