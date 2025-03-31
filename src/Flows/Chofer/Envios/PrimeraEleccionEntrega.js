const GuardarEstadoChofer = require('../../../Utiles/Funciones/Chofer/GuardarEstadoChofer');
const ObtenerEstadoChofer = require('../../../Utiles/Funciones/Chofer/ObtenerEstadoChofer');

module.exports = async function PrimeraEleccionEntrega(userId, message, sock) {
    try {

        const estado = ObtenerEstadoChofer(userId)
        const hojaRuta = estado.hojaDeRuta

        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Error: Hoja de ruta no proporcionada o vacía.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const { Detalles = [] } = hoja;
        const { Chofer } = hojaRuta;

        // Filtrar entregas no entregadas
        const entregasPendientes = Detalles.filter(detalle => detalle.Estado === "No entregado");

        if (entregasPendientes.length === 0) {
            console.log("✅ Todas las entregas han sido completadas.");

            // Guardar el estado del chofer con el flujo finalizado
            //await GuardarEstadoChofer(Chofer.Telefono + "@s.whatsapp.net", hojaRuta, "EntregasFinalizadas");
            FlowManager.setFlow(userId, "ENTREGACHOFER", "EntregasFinalizadas", data)

            const mensajeFinalizado = `✅ *Todas las entregas han sido completadas.* 🚚✨\nGracias por tu trabajo, ¡hasta la próxima!`;
            await sock.sendMessage(userId, { text: mensajeFinalizado });
            return;
        }

        // Extraer el número del mensaje
        const numeroPedido = parseInt(message.match(/\d+/)?.[0], 10);
        if (isNaN(numeroPedido) || numeroPedido < 1 || numeroPedido > entregasPendientes.length) {
            console.error(`⚠️ Número fuera de rango o no válido: ${message}`);
            await sock.sendMessage(userId, { text: "⚠️ Número no válido. Por favor, ingresa un número válido de la lista." });
            return;
        }

        // Obtener el detalle según la posición (restamos 1 porque los arrays comienzan en 0)
        const detalleEncontrado = entregasPendientes[numeroPedido - 1];

        // Construir mensaje de respuesta
        const mensaje = `📌 *En proceso* \n\n🆔 *ID Detalle:* ${detalleEncontrado.ID_DET}\n🏢 *Cliente:* ${detalleEncontrado.Cliente}\n📍 *Dirección:* ${detalleEncontrado.Direccion_Entrega}\n🌆 *Localidad:* ${detalleEncontrado.Localidad}\n📄 *Estado:* ${detalleEncontrado.Estado}`;

        // Enviar mensaje de respuesta
        await sock.sendMessage(userId, { text: mensaje });
        console.log("✅ Mensaje enviado correctamente.");

        await sock.sendMessage(userId, { text: 'Cuando la entrega finalice, indícalo enviando un mensaje con el resultado de la entrega:\n- Reprogramado 📅\n- Entregado OK ✅\n- Entregado NOK ❌' });

        /*
        // Guardar nuevo estado del chofer en BD
        await GuardarEstadoChofer(Chofer.Telefono + "@s.whatsapp.net", hojaRuta, "SecuenciaEntrega");
        */

    } catch (error) {
        console.error("❌ Error en PrimeraEleccionEntrega:", error);
    }
};
