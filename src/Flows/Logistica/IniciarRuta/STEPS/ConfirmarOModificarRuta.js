const opcionElegida = require("../../../../Utiles/Chatgpt/opcionElegida");
const FlowManager = require('../../../../FlowControl/FlowManager');
const IndicarComienzo = require('../../../../Utiles/Funciones/Logistica/IniciarRuta/IndicarComienzo');
const { enviarErrorPorWhatsapp } = require("../../../../services/Excepcion/manejoErrores");
const enviarMensaje = require('../../../../services/EnviarMensaje/EnviarMensaje');

module.exports = async function ConfirmarOModificarRuta(userId, message) {
    try {
        const data = await opcionElegida(message);

        if (data.data.Eleccion == "1") {
            await enviarMensaje(userId, "🔄 Procesando...");

            const hojaDeRuta = FlowManager.userFlows[userId]?.flowData;
            const Operacion = await IndicarComienzo(hojaDeRuta, userId);

            if (Operacion.Success) {
                await enviarMensaje(userId, "✅ La operación finalizó exitosamente.");
            } else {
                await enviarMensaje(userId, Operacion.msg);
            }

            if (process.env.NODE_ENV == "production") {
                await FlowManager.resetFlow(userId);
            }

        } else if (data.data.Eleccion == "2" || data.data.Eleccion == "3") {
            await enviarMensaje(userId, "❌ La operación fue cancelada.");
            FlowManager.resetFlow(userId);
        } else {
            await enviarMensaje(userId, "Disculpa, no lo he entendido");
        }

    } catch (error) {
        console.error("Error en ConfirmarOModificarRuta:", error);
        await enviarErrorPorWhatsapp(error, "metal grande");
    }
}