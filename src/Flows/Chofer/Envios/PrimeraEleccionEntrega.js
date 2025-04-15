const FlowManager = require('../../../FlowControl/FlowManager');
const { actualizarHoraSalidaCabecera } = require('../../../services/google/Sheets/hojaDeruta');
module.exports = async function PrimeraEleccionEntrega(userId, message, sock) {
    try {
        await FlowManager.getFlow(userId);
        const hojaRuta = FlowManager.userFlows[userId]?.flowData;

        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Error: Hoja de ruta no proporcionada o vacía.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const { Detalles = [] } = hoja;
        const { Chofer } = hojaRuta;

        // Filtrar entregas pendientes
        const entregasPendientes = [...Detalles];

        // Extraer número del mensaje
        const numeroPedido = parseInt(message.match(/\d+/)?.[0], 10);
        if (isNaN(numeroPedido) || numeroPedido < 1 || numeroPedido > entregasPendientes.length) {
            await sock.sendMessage(userId, { text: "⚠️ Número no válido. Por favor, ingresá un número válido de la lista." });
            return;
        }

        // Seleccionar detalle
        const detalleSeleccionado = entregasPendientes[numeroPedido - 1];

        // Sacarlo de Detalles
        hoja.Detalles = hoja.Detalles.filter(det => det.ID_DET !== detalleSeleccionado.ID_DET);

        // Ponerlo en Detalle_Actual
        hoja.Detalle_Actual = [detalleSeleccionado];

        if (
            hoja.Detalle_Actual.length === 1 && // recién se asignó
            (!hoja.Detalles_Completados || hoja.Detalles_Completados.length === 0)
        ) {
            await actualizarHoraSalidaCabecera(hojaRuta);
        }

        // Construir texto del comprobante
        const comprobante = detalleSeleccionado.Comprobante;
        const comprobanteTexto = comprobante && comprobante.Letra && comprobante.Punto_Venta && comprobante.Numero
            ? `${comprobante.Letra} ${comprobante.Punto_Venta}-${comprobante.Numero}`
            : "--";

        // Mostrar información de entrega actual
        const mensaje = `📌 *En proceso* 

🆔 *ID Detalle:* ${detalleSeleccionado.ID_DET}
🏢 *Cliente:* ${detalleSeleccionado.Cliente}
📍 *Dirección:* ${detalleSeleccionado.Direccion_Entrega}
🌆 *Localidad:* ${detalleSeleccionado.Localidad}
📄 *Comprobante:* ${comprobanteTexto}`;

        await sock.sendMessage(userId, { text: mensaje });

        await sock.sendMessage(userId, {
            text: 'Cuando la entrega finalice, indícalo enviando un mensaje con el resultado de la entrega:\n1️⃣ Entregado OK ✅\n2️⃣ Entregado NOK ⚠️\n3️⃣ Rechazado ❌\n4️⃣ Cancelado 🚫'
        });

        FlowManager.setFlow(userId, "ENTREGACHOFER", "SecuenciaEntrega", hojaRuta);

        console.log("✅ Detalle movido a Detalle_Actual.");

    } catch (error) {
        console.error("❌ Error en PrimeraEleccionEntrega:", error);
    }
};
