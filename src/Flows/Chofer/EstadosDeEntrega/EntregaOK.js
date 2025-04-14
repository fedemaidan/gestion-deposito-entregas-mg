const FlowManager = require('../../../FlowControl/FlowManager');
const EnviarMensaje = require('../../../Utiles/Funciones/Logistica/IniciarRuta/EnviarMensaje');
const enviarRemitoWhatsApp = require('../../../Utiles/Firebase/EnviarConformidad');
const EnviarSiguienteEntrega = require('../../../Utiles/Funciones/Chofer/EnviarSiguienteEntrega');


module.exports = async function EntregaOK(userId, message, sock) {
    try {
        await FlowManager.getFlow(userId)
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

        // 📸 Lógica para subir imagen a Firebase y obtener la URL pública

        let webUrl = message;
     
        // ✅ Guardamos la URL en el JSON
        detalle.Path = webUrl;
        await EnviarMensaje(detalle.Telefono + "@s.whatsapp.net", `✅ La entrega fue realizada con exito` ,sock)
        await enviarRemitoWhatsApp(webUrl.imagenlocal, sock, detalle.Telefono + "@s.whatsapp.net",)

        // 🧹 Quitamos el detalle de Detalle_Actual y lo pasamos a Detalles_Completados
        hoja.Detalle_Actual = []; // siempre debe estar vacío tras la entrega
        hoja.Detalles_Completados.push(detalle);

        // 🔄 Actualizamos el flow en memoria
        FlowManager.setFlow(userId, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);

        // 🔄 Google Sheet ----- (llamar a la función que actualice los cambios en Sheets)


        // await actualizarEntregaEnSheet(hoja.ID_CAB, detalle);


        // ✅ Mensajes
        const mensajeChofer = "✅ Foto del remito recibida y guardada correctamente.";
        const mensajeVendedor = `📦 La entrega al cliente *${detalle.Cliente}* fue realizada con éxito.`;

        if (detalle.Telefono_vendedor) {
            await EnviarMensaje(detalle.Telefono_vendedor + "@s.whatsapp.net", mensajeVendedor, sock);
        }

        await sock.sendMessage(userId, { text: mensajeChofer });

        await EnviarSiguienteEntrega(userId,hojaRuta,sock)

        FlowManager.setFlow(userId, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);

    } catch (error) {
        console.error("❌ Error en EntregaOK:", error);
        await sock.sendMessage(userId, {
            text: "💥 Ocurrió un error al subir el remito. Por favor, intentá nuevamente."
        });
    }
};
