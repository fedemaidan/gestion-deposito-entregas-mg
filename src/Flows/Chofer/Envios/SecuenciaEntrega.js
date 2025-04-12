const ObtenerFlow = require('../../../Utiles/Funciones/FuncionesFlowmanager/ObtenerFlow');
const FlowManager = require('../../../FlowControl/FlowManager');

module.exports = async function FinalizarEntrega(userId, message, sock) {
    try {
        await ObtenerFlow(userId);
        const hojaRuta = FlowManager.userFlows[userId]?.flowData;

        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Hoja de ruta vacía o no encontrada.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const { Detalle_Actual = [] } = hoja;

        if (Detalle_Actual.length === 0) {
            await sock.sendMessage(userId, {
                text: "⚠️ No hay entrega en curso. Por favor, seleccioná una entrega primero."
            });
            return;
        }

        const estadoNumero = parseInt(message.trim(), 10);
        const detalle = Detalle_Actual[0];

        let nuevoEstado;
        let nextStep;

        switch (estadoNumero) {
            case 1:
                nuevoEstado = "Entregado OK";
                nextStep = "EntregaOk";
                await sock.sendMessage(userId, {
                    text: `✅ Se seleccionó *${nuevoEstado}*.\n📸 Por favor, subí la *foto del remito* para finalizar.`
                });
                break;
            case 2:
                nuevoEstado = "Entregado NOK";
                nextStep = "EntregadoNok";
                await sock.sendMessage(userId, {
                    text: `⚠️ Se seleccionó *${nuevoEstado}*.\n📝 Por favor, contanos *qué pasó* con esta entrega.`
                });
                break;
            case 3:
                nuevoEstado = "No entregado";
                nextStep = "NoEntregado";
                await sock.sendMessage(userId, {
                    text: `🚫 Se seleccionó *${nuevoEstado}*.\n📝 Por favor, indicá *el motivo* por el cual no se entregó.`
                });
                break;
            case 4:
                nuevoEstado = "Reprogramado";
                nextStep = "Reprogramado";
                await sock.sendMessage(userId, {
                    text: `🔁 Se seleccionó *${nuevoEstado}*.\n📨 De acuerdo, *enviando avisos al vendedor y cliente*.`
                });
                break;
            default:
                await sock.sendMessage(userId, {
                    text: "❗ *Opción no válida.* Escribí 1, 2, 3 o 4 para indicar el resultado de la entrega.\n\n1️⃣ Entregado OK\n2️⃣ Entregado NOK\n3️⃣ No entregado\n4️⃣ Reprogramado"
                });
                return;
        }

        // ✅ Guardar el nuevo estado en el detalle actual
        detalle.Estado = nuevoEstado;

        // ✅ Avanzar el flujo y guardar la actualización
        FlowManager.setFlow(userId, "ENTREGACHOFER", nextStep, hojaRuta);

    } catch (error) {
        console.error("❌ Error en FinalizarEntrega:", error);
        await sock.sendMessage(userId, {
            text: "💥 *Ocurrió un error al finalizar la entrega.*\nPor favor, intentá nuevamente o contactá a soporte."
        });
    }
};
