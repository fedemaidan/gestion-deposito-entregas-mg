const opcionElegida = require("../../../../Utiles/Chatgpt/opcionElegida");
const FlowManager = require('../../../../FlowControl/FlowManager')
const IndicarComienzo = require('../../../../Utiles/Funciones/Logistica/IniciarRuta/IndicarComienzo')

module.exports = async function ConfirmarOModificarRuta(userId, message, sock) {

    const data = await opcionElegida(message);

    if (data.data.Eleccion == "1") {
        await sock.sendMessage(userId, { text: "🔄 Procesando..." });

        const hojaDeRuta = FlowManager.userFlows[userId]?.flowData;
        const Operacion = await IndicarComienzo(hojaDeRuta, sock, userId)

        if (Operacion.Success) {
            await sock.sendMessage(userId, { text: "✅ La operación finalizó exitosamente." });

        } else {
            await sock.sendMessage(userId, { text: Operacion.msg });
        }
      
       FlowManager.resetFlow(userId)
    }
    else if (data.data.Eleccion == "2" || data.data.Eleccion == "3") {
        await sock.sendMessage(userId, { text: "❌ La operacion fue cancelada." });
        FlowManager.resetFlow(userId)
    }
    else
    {
        await sock.sendMessage(userId, { text: "Disculpa, no lo he entendido" });
    }
}