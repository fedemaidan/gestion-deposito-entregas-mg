const FlowManager = require('../../../FlowControl/FlowManager');

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

        // Mostrar información de entrega actual
        const mensaje = `📌 *En proceso* \n\n🆔 *ID Detalle:* ${detalleSeleccionado.ID_DET}\n🏢 *Cliente:* ${detalleSeleccionado.Cliente}\n📍 *Dirección:* ${detalleSeleccionado.Direccion_Entrega}\n🌆 *Localidad:* ${detalleSeleccionado.Localidad}\n📄 *Estado:* ${detalleSeleccionado.Estado}`;
        await sock.sendMessage(userId, { text: mensaje });

        await sock.sendMessage(userId, {
            text: 'Cuando la entrega finalice, indícalo enviando un mensaje con el resultado de la entrega:\n1️⃣ Entregado OK ✅\n2️⃣ Entregado NOK ❌\n3️⃣ No entregado 🚫\n4️⃣ Reprogramado 🔁'
        });

        FlowManager.setFlow(userId, "ENTREGACHOFER", "SecuenciaEntrega", hojaRuta);

        console.log("✅ Detalle movido a Detalle_Actual.");

    } catch (error) {
        console.error("❌ Error en PrimeraEleccionEntrega:", error);
    }
};