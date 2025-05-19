const FlowManager = require('../../../FlowControl/FlowManager');
const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');
const enviarRemitoWhatsApp = require('../../../Utiles/Firebase/EnviarConformidad');
const EnviarSiguienteEntrega = require('../../../Utiles/Funciones/Chofer/EnviarSiguienteEntrega');
const { actualizarDetalleActual } = require('../../../services/google/Sheets/hojaDeruta');
const RevisarDatos = require('../../../Utiles/Funciones/Chofer/RevisarDatos');
const { enviarErrorPorWhatsapp } = require("../../../services/Excepcion/manejoErrores");

module.exports = async function EntregaNOK(userId, message) {
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
            await enviarMensaje(userId, "⚠️ No hay entrega activa para subir el remito. Por favor, seleccioná una entrega primero.");
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

        // ✅ CHOFER
        await enviarMensaje(userId, "✅ Foto del remito y aclaración guardadas correctamente.");

        // ✅ CLIENTE
        if (detalle.Telefono) {
            const mensajeCliente = `📦 Hola! Algo sucedió con la entrega. Te acerco el remito y la aclaración del chofer.\n\n📝 *Aclaración:* ${detalle.Observaciones || "Sin aclaraciones."}`;
            await enviarMensaje(`${detalle.Telefono}@s.whatsapp.net`, mensajeCliente);
            await enviarRemitoWhatsApp(webUrl.imagenlocal, null, `${detalle.Telefono}@s.whatsapp.net`);
            FlowManager.resetFlow(`${detalle.Telefono}@s.whatsapp.net`);
        }

        // ✅ VENDEDOR
        const mensajeVendedor = `⚠️ Hubo un *problema en la entrega* al cliente *${detalle.Cliente}*.\n\n📝 *Aclaración del chofer:* ${detalle.Observaciones || "Sin observaciones."}`;
        if (detalle.Telefono_vendedor) {
            await enviarRemitoWhatsApp(webUrl.imagenlocal, null, `${detalle.Telefono_vendedor}@s.whatsapp.net`);
            await enviarMensaje(`${detalle.Telefono_vendedor}@s.whatsapp.net`, mensajeVendedor);
        }

        // 🔄 Actualizar hoja
        await actualizarDetalleActual(hojaRuta);

        hoja.Detalle_Actual = [];
        hoja.Detalles_Completados.push(detalle);

        FlowManager.setFlow(userId, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);

        // 🛵 Siguiente entrega
        await EnviarSiguienteEntrega(userId, hojaRuta);

    } catch (error) {
        console.error("❌ Error en EntregaNOK:", error);
        await enviarMensaje(userId, "💥 Ocurrió un error al procesar la entrega. Por favor, intentá nuevamente.");
        await enviarErrorPorWhatsapp(error, "metal grande");
    }
};

