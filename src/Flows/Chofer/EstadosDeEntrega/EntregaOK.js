const FlowManager = require('../../../FlowControl/FlowManager');
const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');
const enviarRemitoWhatsApp = require('../../../Utiles/Firebase/EnviarConformidad');
const EnviarSiguienteEntrega = require('../../../Utiles/Funciones/Chofer/EnviarSiguienteEntrega');
const { actualizarDetalleActual } = require('../../../services/google/Sheets/hojaDeruta');
const RevisarDatos = require('../../../Utiles/Funciones/Chofer/RevisarDatos');
const { enviarErrorPorWhatsapp } = require("../../../services/Excepcion/manejoErrores");

module.exports = async function EntregaOK(userId, message) {
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

        // 📦 Obtener datos actualizados
        const datosActualizados = await RevisarDatos(detalle.ID_DET, hoja.ID_CAB);

        if (datosActualizados) {
            detalle.Telefono = datosActualizados.cliente.telefono || detalle.Telefono;
            detalle.Cliente = datosActualizados.cliente.nombre || detalle.Cliente;
            detalle.Telefono_vendedor = datosActualizados.vendedor.telefono || detalle.Telefono_vendedor;
        }

        // 📸 Guardar imagen
        const webUrl = message;
        detalle.Path = webUrl.imagenFirebase;

        // ✅ Mensajes
      

        // Cliente
        if (detalle.Telefono) {
            const mensajeCliente = `✅ La entrega fue realizada con éxito. ¡Gracias por confiar tu compra a *METALGRANDE*!`;
            await enviarMensaje(`${detalle.Telefono}@s.whatsapp.net`, mensajeCliente);

            // Enviar imagen del remito
            await enviarRemitoWhatsApp(webUrl.imagenlocal, `${detalle.Telefono}@s.whatsapp.net`);

            // Finalizar flujo
            FlowManager.resetFlow(`${detalle.Telefono}@s.whatsapp.net`);
        }


        // Vendedor
        if (detalle.Telefono_vendedor) {
            const jidVendedor = `${detalle.Telefono_vendedor}@s.whatsapp.net`;
            const comprobante = `${detalle.Comprobante?.Letra || ''} ${detalle.Comprobante?.Punto_Venta || ''}-${detalle.Comprobante?.Numero || ''}`;

            const mensajeVendedor = `✅ *Entrega realizada con éxito:*
👤 *Cliente:* ${detalle.Cliente}
🧾 *Comprobante:* ${comprobante}
📌 *Dirección:* ${detalle.Direccion_Entrega || "No especificada"}
👷‍♂️ *Chofer:* ${hojaRuta.Chofer?.Nombre || "No informado"}`;

            await enviarMensaje(jidVendedor, mensajeVendedor);
            await enviarRemitoWhatsApp(webUrl.imagenlocal, jidVendedor);
        }

        // Chofer
          const mensajeChofer = "✅ Foto del comprobante  recibido y guardado correctamente.";
        await enviarMensaje(userId, mensajeChofer);

        // 🔄 Actualizar hoja
        await actualizarDetalleActual(hojaRuta);

        hoja.Detalle_Actual = [];
        hoja.Detalles_Completados.push(detalle);

        FlowManager.setFlow(userId, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);

        // Próxima entrega
        await EnviarSiguienteEntrega(userId, hojaRuta);

    } catch (error) {
        console.error("❌ Error en EntregaOK:", error);
        await enviarMensaje(userId, "💥 Ocurrió un error al subir el remito. Por favor, intentá nuevamente.");
        await enviarErrorPorWhatsapp(error, "metal grande");
    }
};