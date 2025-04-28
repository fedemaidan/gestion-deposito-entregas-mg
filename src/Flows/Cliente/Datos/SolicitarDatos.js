const FlowManager = require('../../../FlowControl/FlowManager');

module.exports = async function SolicitarDatos(userId, message, sock) {
    try {
        await FlowManager.getFlow(userId);

        const detalleSeleccionado = FlowManager.userFlows[userId]?.flowData;

        if (!detalleSeleccionado) {
            console.error("❌ Error: Detalle del cliente no disponible en flowData.");
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

        await sock.sendMessage(userId, { text: mensaje });
    } catch (error) {
        console.error("❌ Error en SolicitarDatos:", error);
    }
};