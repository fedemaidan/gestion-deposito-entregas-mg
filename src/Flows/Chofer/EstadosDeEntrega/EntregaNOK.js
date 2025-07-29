const FlowManager = require('../../../FlowControl/FlowManager');
const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');
const enviarRemitoWhatsApp = require('../../../Utiles/Firebase/EnviarConformidad');
const EnviarSiguienteEntrega = require('../../../Utiles/Funciones/Chofer/EnviarSiguienteEntrega');
const { actualizarDetalleActual } = require('../../../services/google/Sheets/hojaDeruta');
const RevisarDatos = require('../../../Utiles/Funciones/Chofer/RevisarDatos');
const { enviarErrorPorWhatsapp } = require("../../../services/Excepcion/manejoErrores");

// ... importaciones y declaración del módulo
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
        await enviarMensaje(userId, "✅ Foto del comprobante  recibido y guardado correctamente.");

        const comprobante = `${detalle.Comprobante?.Letra || ''} ${detalle.Comprobante?.Punto_Venta || ''}-${detalle.Comprobante?.Numero || ''}`;
        const nombreChofer = hojaRuta.Chofer?.Nombre || "No informado";
        const aclaracion = detalle.Observaciones || "Sin observaciones.";

        // ✅ CLIENTE
        if (detalle.Telefono) {
            let mensajeCliente;
            if (detalle.Estado === "No Entregado") {
                mensajeCliente = `❌ *${detalle.Cliente}*: Nuestro chofer nos informó que tu pedido no pudo ser entregado. Por favor, comunicate con tu vendedor asignado para replanificar la entrega.`;
            } else {
                mensajeCliente = `⚠️ *${detalle.Cliente}*: Nuestro chofer nos informó que la entrega no pudo realizarse correctamente. Tu vendedor asignado se comunicará a la brevedad para solventar la falla lo antes posible.`;
            }

            await enviarMensaje(`${detalle.Telefono}@s.whatsapp.net`, mensajeCliente);
            await enviarRemitoWhatsApp(webUrl.imagenlocal, `${detalle.Telefono}@s.whatsapp.net`);
            FlowManager.resetFlow(`${detalle.Telefono}@s.whatsapp.net`);
        }

        // ✅ VENDEDOR
if (detalle.Telefono_vendedor) {
    const jidVendedor = `${detalle.Telefono_vendedor}@s.whatsapp.net`;
    let mensajeVendedor;

    const nombreVendedor = detalle.Vendedor || "Vendedor sin nombre";

    if (detalle.Estado === "No Entregado") {
        mensajeVendedor = `❌ *ATENCIÓN ${nombreVendedor}:* La siguiente entrega fue marcada como *NO ENTREGADO*.
👤 *Cliente:* ${detalle.Cliente}
🧾 *Comprobante:* ${comprobante}
📌 *Dirección:* ${detalle.Direccion_Entrega || "No especificada"}
👷‍♂️ *Chofer:* ${nombreChofer}
🧑‍💼 *Vendedor a cargo:* ${nombreVendedor}
📝 *Aclaración del chofer:* ${aclaracion}
📞 *Acción:* Comunicarse con el cliente para replanificar entrega`;
    } else {
        mensajeVendedor = `⚠️ *ATENCIÓN ${nombreVendedor}:* La siguiente entrega fue marcada como *ENTREGADO NOK*.
👤 *Cliente:* ${detalle.Cliente}
🧾 *Comprobante:* ${comprobante}
📌 *Dirección:* ${detalle.Direccion_Entrega || "No especificada"}
👷‍♂️ *Chofer:* ${nombreChofer}
🧑‍💼 *Vendedor a cargo:* ${nombreVendedor}
📝 *Aclaración del chofer:* ${aclaracion}
📞 *Acción:* Comunicarse con el cliente para validar la falla y replanificar entrega`;
    }

    await enviarMensaje(jidVendedor, mensajeVendedor);
    await enviarRemitoWhatsApp(webUrl.imagenlocal, jidVendedor);
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
