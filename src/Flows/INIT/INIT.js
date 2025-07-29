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
                    await enviarMensaje(userId, `🤖 Aún estoy en desarrollo y no puedo comprender todos los mensajes recibidos. 
Si necesitás contactar a nuestro equipo de ventas, por favor comunicate a nuestros WhatsApp de lunes a viernes de 8:00 a 17:00 y sábados de 8:00 a 13:00.

📍 *Canning:* +54 9 11 3173-1111
📍 *Monte Grande:* +54 9 11 5995-0000
📍 *San Vicente:* +54 9 11 4402-8710
📍 *Tristán Suarez:* +54 9 11 5952-3373`);
                    FlowManager.resetFlow(userId);
                    break;

                case "Info HDR":
                    FlowManager.setFlow(userId, "SITUACIONHDR", "obtenerInformacion",result);
                    await IniciarRutaFlow.Handle(userId, { data: result.data },"obtenerInformacion");
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
