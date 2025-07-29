const FlowManager = require('../../../FlowControl/FlowManager');
const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');
const opcionHDR = require('../../../Utiles/Chatgpt/opcionHDR');
const { ResetHojaRutaCompleta } = require('../../../Utiles/Funciones/Logistica/ReiniciarFlujo/ReiniciarHDR');
const ResetFlow = require('../../../Utiles/Funciones/Logistica/ReiniciarFlujo/ResetFlow');

module.exports = async function confirmarAccionHDR(userId, message) {
    try {
           await FlowManager.getFlow(userId);
           const hojaRuta = FlowManager.userFlows[userId]?.flowData;

           const operacion = await opcionHDR(message);

           console.log("Operación seleccionada:", operacion);

            switch (operacion.data.Eleccion) 
            {
                case 1:
                    await enviarMensaje(userId, "🔄 Reiniciando la *hoja de ruta*...");
                    await ResetFlow(hojaRuta, userId);
                    await ResetHojaRutaCompleta(hojaRuta)
                    await FlowManager.resetFlow(userId);
                    break;

                case 2:
                    await enviarMensaje(userId, "🔄 Reiniciando solo *ROLES* de la hoja de ruta...");
                    await ResetFlow(hojaRuta, userId);
                    await FlowManager.resetFlow(userId);
                    break;

                case 3:
                    await enviarMensaje(userId, "❌ Cancelando la operación de reinicio de la hoja de ruta...");
                    await FlowManager.resetFlow(userId);
                    break;

                default:
                    await enviarMensaje(userId, "❌ No comprendi el mensaje. porf favor repite tu eleccion");
            }
            return;
    }
    catch (error) {
    }
};
