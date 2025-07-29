const FlowManager = require('../../../FlowControl/FlowManager');
const { enviarErrorPorWhatsapp } = require("../../../services/Excepcion/manejoErrores");
const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');

module.exports = async function SolicitarDatos(userId, message) {
    try {
        await FlowManager.getFlow(userId);

        const hojaRuta = FlowManager.userFlows[userId]?.flowData;

        if (!hojaRuta || !hojaRuta.Hoja_Ruta?.length) {
            console.error("❌ Error: No se encontró la hoja de ruta en flowData.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];

        // Buscar el detalle que le corresponde a este userId
        const detalleSeleccionado = hoja.Detalles.find(det => {
            const tel = det.Telefono?.trim();
            return tel && `${tel}@s.whatsapp.net` === userId;
        });

        if (!detalleSeleccionado) {
            console.error("❌ Error: No se encontró un detalle asignado al número actual.");
            await enviarMensaje(userId, "⚠️ No se encontró una entrega asignada a este número.");
            return;
        }

        const comprobante = detalleSeleccionado.Comprobante || {};
        const comprobanteTexto = `${comprobante.Letra || ""} ${comprobante.Punto_Venta || ""}-${comprobante.Numero || ""}`;

        const mensaje = `📌 *En proceso de entrega*

🆔 *ID Detalle:* ${detalleSeleccionado.ID_DET}
🏢 *Cliente:* ${detalleSeleccionado.Cliente}
📍 *Dirección:* ${detalleSeleccionado.Direccion_Entrega}
🌆 *Localidad:* ${detalleSeleccionado.Localidad}
📄 *Comprobante:* ${comprobanteTexto}

🤖 Este número es un *bot automático*. Si querés hablar con una persona real, podés comunicarte con tu vendedor:

👤 *Vendedor:* ${detalleSeleccionado.Vendedor}
📞 *Teléfono:* ${detalleSeleccionado.Telefono_vendedor}`;

        await enviarMensaje(userId, mensaje);
    } catch (error) {
        console.error("❌ Error en SolicitarDatos:", error);
        await enviarErrorPorWhatsapp(error, "metal grande");
    }
};