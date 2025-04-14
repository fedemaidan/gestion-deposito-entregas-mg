const FlowManager = require('../../../FlowControl/FlowManager');
const EnviarMensaje = require('../../../Utiles/Funciones/Logistica/IniciarRuta/EnviarMensaje');
const enviarRemitoWhatsApp = require('../../../Utiles/Firebase/EnviarConformidad');
const EnviarSiguienteEntrega = require('../../../Utiles/Funciones/Chofer/EnviarSiguienteEntrega');

module.exports = async function EntregaNOK(userId, message, sock) {
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
                text: "⚠️ No hay entrega activa para subir el remito. Por favor, seleccioná una entrega primero."
            });
            return;
        }

        const detalle = Detalle_Actual[0];

        // ✅ Guardamos la URL del remito en el detalle
        let webUrl = message;
        detalle.Path = webUrl;

        // ✅ CHOFER
        await EnviarMensaje(detalle.Telefono + "@s.whatsapp.net", `✅ Foto del remito y aclaración guardadas correctamente.`, sock);

        // ✅ CLIENTE - Enviamos remito y aclaración
        const mensajeCliente = `📦 Hola! Algo sucedió con la entrega. Te acerco el remito y la aclaración del chofer.\n\n📝 *Aclaración:* ${detalle.Observaciones || "Sin aclaraciones."}`;
        await EnviarMensaje(detalle.Telefono + "@s.whatsapp.net", mensajeCliente, sock);
        await enviarRemitoWhatsApp(webUrl.imagenlocal, sock, detalle.Telefono + "@s.whatsapp.net");

        // ✅ VENDEDOR - Notificamos problema
        const mensajeVendedor = `⚠️ Hubo un *problema en la entrega* al cliente *${detalle.Cliente}*.\n\n📝 *Aclaración del chofer:* ${detalle.Observaciones || "Sin observaciones."}`;
        if (detalle.Telefono_vendedor) {
            await EnviarMensaje(detalle.Telefono_vendedor + "@s.whatsapp.net", mensajeVendedor, sock);
        }

        // 🔄 Pasamos el detalle a completados
        hoja.Detalle_Actual = [];
        hoja.Detalles_Completados.push(detalle);

        // 🔄 Actualizamos el flow en memoria
        FlowManager.setFlow(userId, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);

        // 🔄 Actualizar Google Sheet si es necesario
        // await actualizarEntregaEnSheet(hoja.ID_CAB, detalle);

        // 🛵 Enviar siguiente entrega
        await EnviarSiguienteEntrega(userId, hojaRuta, sock);

    } catch (error) {
        console.error("❌ Error en EntregaNOK:", error);
        await sock.sendMessage(userId, {
            text: "💥 Ocurrió un error al procesar la entrega. Por favor, intentá nuevamente."
        });
    }
};
