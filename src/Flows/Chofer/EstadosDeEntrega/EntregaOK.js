const FlowManager = require('../../../FlowControl/FlowManager');
const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');
const enviarRemitoWhatsApp = require('../../../Utiles/Firebase/EnviarConformidad');
const { actualizarDetalleActual } = require('../../../services/google/Sheets/hojaDeruta');
const RevisarDatos = require('../../../Utiles/Funciones/Chofer/RevisarDatos');
const { enviarErrorPorWhatsapp } = require("../../../services/Excepcion/manejoErrores");
const verificarGrupoPendiente = require('../../../Utiles/Mensajes/verificarGrupoPendiente');

module.exports = async function EntregaOK(userId, message) {
    try {
        await FlowManager.getFlow(userId);
        const hojaRuta = FlowManager.userFlows[userId]?.flowData;

        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Hoja de ruta vacía o no encontrada.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const detalle = hoja.Detalle_Actual?.[0];

        if (!detalle) {
            await enviarMensaje(userId, "⚠️ No hay entrega activa para subir el remito. Por favor, seleccioná una entrega primero.");
            return;
        }

        // 📦 Obtener datos actualizados
        const datosActualizados = await RevisarDatos(detalle.ID_DET, hoja.ID_CAB);

        if (datosActualizados) {
            detalle.Telefono = datosActualizados.cliente.telefono || detalle.Telefono;
            detalle.Cliente = datosActualizados.cliente.nombre || detalle.Cliente;
            detalle.Telefono_vendedor = datosActualizados.vendedor.telefono || detalle.Telefono_vendedor;
        }

        // 📸 Guardar imagen en el detalle actual
        const webUrl = message;
        detalle.Path = webUrl.imagenFirebase;
        detalle.Tiene_Estado = true;   
        // Cliente
        if (detalle.Telefono) {
            const mensajeCliente = `✅ La entrega fue realizada con éxito. ¡Gracias por confiar tu compra a *METALGRANDE*!`;
            await enviarMensaje(`${detalle.Telefono}@s.whatsapp.net`, mensajeCliente);
            await enviarRemitoWhatsApp(webUrl.imagenlocal, `${detalle.Telefono}@s.whatsapp.net`);
            
            
            if(process.env.NODE_ENV == "production")
                {
                    FlowManager.resetFlow(`${detalle.Telefono}@s.whatsapp.net`);
                }
        }

        // Vendedor
        if (detalle.Telefono_vendedor) {
            const jidVendedor = `${detalle.Telefono_vendedor}@s.whatsapp.net`;
            const comprobante = `${detalle.Comprobante?.Letra || ''} ${detalle.Comprobante?.Punto_Venta || ''}-${detalle.Comprobante?.Numero || ''}`;
            const nombreVendedor = detalle.Vendedor || "Vendedor sin nombre";
            const nombreChofer = hojaRuta.Chofer?.Nombre || "No informado";

            const mensajeVendedor = `✅ *Entrega realizada con éxito*
🧑‍💼 *Vendedor a cargo:* ${nombreVendedor}
👤 *Cliente:* ${detalle.Cliente}
🧾 *Comprobante:* ${comprobante}
📌 *Dirección:* ${detalle.Direccion_Entrega || "No especificada"}
👷‍♂️ *Chofer:* ${nombreChofer}
`;
detalle.Estado = "Entregado OK";
            await enviarMensaje(jidVendedor, mensajeVendedor);
            await enviarRemitoWhatsApp(webUrl.imagenlocal, jidVendedor);
        }

        // Chofer
        const mensajeChofer = "✅ Foto del comprobante recibida y guardada correctamente.";
        await enviarMensaje(userId, mensajeChofer);

        // ✅ Actualizar el detalle actual en Google Sheets
        await actualizarDetalleActual(hojaRuta);

        // 🧹 Limpiar Detalle_Actual
        hoja.Detalle_Actual = [];

        // 🧮 Registrar como completado
        hoja.Detalles_Completados.push(detalle);


        await FlowManager.setFlow(userId, "ENTREGACHOFER", "SecuenciaEntrega", hojaRuta);
        // 📦 Próxima entrega o volver a elegir
        await verificarGrupoPendiente(userId);

    } catch (error) {
        console.error("❌ Error en EntregaOK:", error);
        await enviarMensaje(userId, "💥 Ocurrió un error al subir el remito. Por favor, intentá nuevamente.");
        await enviarErrorPorWhatsapp(error, "metal grande");
    }
};
