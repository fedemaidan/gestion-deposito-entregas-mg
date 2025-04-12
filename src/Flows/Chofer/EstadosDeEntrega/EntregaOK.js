const ObtenerFlow = require('../../../Utiles/Funciones/FuncionesFlowmanager/ObtenerFlow');
const FlowManager = require('../../../FlowControl/FlowManager');
const EnviarMensaje = require('../../../Utiles/Funciones/Logistica/IniciarRuta/EnviarMensaje');
const GuardarRemito = require('../../../Utiles/Funciones/Chofer/GuardarRemito');
module.exports = async function EntregaOK(userId, message, sock) {
    try {
        await ObtenerFlow(userId);
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
        let webUrl = null;

        webUrl = await GuardarRemito(message)

        // TODO: Lógica real de subida (ejemplo con Firebase)
        // const buffer = await downloadMediaMessage(message);
        // webUrl = await uploadToFirebase(buffer, `remitos/${detalle.ID_DET}.jpg`);






        // ✅ Guardamos la URL en el JSON
        detalle.Path = webUrl;

        // 🧹 Quitamos el detalle de Detalle_Actual y lo pasamos a Detalles_Completados
        hoja.Detalle_Actual = []; // siempre debe estar vacío tras la entrega
        hoja.Detalles_Completados.push(detalle);

        // 🔄 Actualizamos el flow en memoria
        FlowManager.setFlow(userId, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);

        // 🔄 Google Sheet ----- (acá podés llamar a la función que actualice los cambios en Sheets)

        // await actualizarEntregaEnSheet(hoja.ID_CAB, detalle);

        // ✅ Mensajes
        const mensajeChofer = "✅ Foto del remito recibida y guardada correctamente.";
        const mensajeVendedor = `📦 La entrega al cliente *${detalle.Cliente}* fue realizada con éxito.`;
        const mensajeCliente = `🧾 ¡Hola! 📦 Tu entrega fue realizada con éxito. Te compartimos el remito:\n${webUrl}`;

        if (detalle.Telefono_vendedor) {
            await EnviarMensaje(detalle.Telefono_vendedor, mensajeVendedor, sock);
        }

        if (detalle.Telefono) {
            await EnviarMensaje(detalle.Telefono, mensajeCliente, sock);
        }

        await sock.sendMessage(userId, { text: mensajeChofer });

    } catch (error) {
        console.error("❌ Error en EntregaOK:", error);
        await sock.sendMessage(userId, {
            text: "💥 Ocurrió un error al subir el remito. Por favor, intentá nuevamente."
        });
    }
};
