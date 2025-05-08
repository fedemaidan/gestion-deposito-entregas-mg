const FlowManager = require('../../../FlowControl/FlowManager');
const EnviarMensaje = require('../../../Utiles/Funciones/Logistica/IniciarRuta/EnviarMensaje');
const enviarRemitoWhatsApp = require('../../../Utiles/Firebase/EnviarConformidad');
const EnviarSiguienteEntrega = require('../../../Utiles/Funciones/Chofer/EnviarSiguienteEntrega');
const { actualizarDetalleActual } = require('../../../services/google/Sheets/hojaDeruta');
const RevisarDatos = require('../../../Utiles/Funciones/Chofer/RevisarDatos');

module.exports = async function EntregaOK(userId, message, sock) {
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

        // 📦 Obtener datos actualizados de cliente y vendedor
        const datosActualizados = await RevisarDatos(detalle.ID_DET, hoja.ID_CAB);

        if (datosActualizados) {
            detalle.Telefono = datosActualizados.cliente.telefono || detalle.Telefono;
            detalle.Cliente = datosActualizados.cliente.nombre || detalle.Cliente;
            detalle.Telefono_vendedor = datosActualizados.vendedor.telefono || detalle.Telefono_vendedor;
        }

        // 📸 Subir imagen y guardar la URL
        const webUrl = message;
        detalle.Path = webUrl.imagenFirebase;

        // ✅ Mensajes
        const mensajeChofer = "✅ Foto del remito recibida y guardada correctamente.";
        const mensajeCliente = `✅ La entrega fue realizada con éxito.`;
        const mensajeVendedor = `📦 La entrega al cliente *${detalle.Cliente}* fue realizada con éxito.`;

        // Cliente
        if(detalle.Telefono) 
            {
                await EnviarMensaje(detalle.Telefono + "@s.whatsapp.net", mensajeCliente, sock);
                await enviarRemitoWhatsApp(webUrl.imagenlocal, sock, detalle.Telefono + "@s.whatsapp.net");
                FlowManager.resetFlow(detalle.Telefono + "@s.whatsapp.net")
            }

        // Vendedor
        if (detalle.Telefono_vendedor) {
            await EnviarMensaje(detalle.Telefono_vendedor + "@s.whatsapp.net", mensajeVendedor, sock);
        }

        // Chofer
        await sock.sendMessage(userId, { text: mensajeChofer });

        // 🔄 Actualizar hoja de ruta
        await actualizarDetalleActual(hojaRuta);

        hoja.Detalle_Actual = [];
        hoja.Detalles_Completados.push(detalle);

        FlowManager.setFlow(userId, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);

        await EnviarSiguienteEntrega(userId, hojaRuta, sock);

    } catch (error) {
        console.error("❌ Error en EntregaOK:", error);
        await sock.sendMessage(userId, {
            text: "💥 Ocurrió un error al subir el remito. Por favor, intentá nuevamente."
        });
    }
};
