const FlowManager = require('../../../FlowControl/FlowManager');
const EnviarMensaje = require('../../../Utiles/Funciones/Logistica/IniciarRuta/EnviarMensaje');
const EnviarSiguienteEntrega = require('../../../Utiles/Funciones/Chofer/EnviarSiguienteEntrega');
const { actualizarDetalleActual } = require('../../../services/google/Sheets/hojaDeruta');

module.exports = async function Reprogramado(userId, message, sock) {
    try {
        await FlowManager.getFlow(userId);
        const hojaRuta = FlowManager.userFlows[userId]?.flowData;

        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Hoja de ruta vacía o no encontrada.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const { Detalle_Actual = [], Detalles_Completados = [] } = hoja;

        if (Detalle_Actual.length === 0) {
            await sock.sendMessage(userId, {
                text: "⚠️ No hay entrega activa para reprogramar. Por favor, seleccioná una entrega primero."
            });
            return;
        }

        const detalle = Detalle_Actual[0];

        // ✅ Guardamos el motivo de la reprogramación como observación
        detalle.Observaciones = message;


        await actualizarDetalleActual(hojaRuta)
        // 🧹 Quitamos el detalle de Detalle_Actual y lo pasamos a Detalles_Completados
        hoja.Detalle_Actual = []; // debe estar vacío tras la entrega
        hoja.Detalles_Completados.push(detalle);

      
        // ✅ MENSAJES

        // Chofer
        await sock.sendMessage(userId, { text: "🔁 La entrega fue marcada como *reprogramada*." });

        // Vendedor
        const mensajeVendedor = `📦 La entrega al cliente *${detalle.Cliente}* fue reprogramada.\n📝 *Motivo:* ${message}`;
        if (detalle.Telefono_vendedor) {
            await EnviarMensaje(detalle.Telefono_vendedor + "@s.whatsapp.net", mensajeVendedor, sock);
        }

        // Cliente
        const mensajeCliente = `📦 Hola! La entrega programada para hoy fue reprogramada.\n📝 *Motivo:* ${message}`;
        if (detalle.Telefono) {
            await EnviarMensaje(detalle.Telefono + "@s.whatsapp.net", mensajeCliente, sock);
        }

        // Siguiente entrega
        
        await EnviarSiguienteEntrega(userId, hojaRuta, sock);

        // 🔄 Actualizamos el flow en memoria
        FlowManager.setFlow(userId, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);

    } catch (error) {
        console.error("❌ Error en Reprogramado:", error);
        await sock.sendMessage(userId, {
            text: "💥 Ocurrió un error al reprogramar la entrega. Por favor, intentá nuevamente."
        });
    }
};