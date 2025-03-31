const FlowManager = require('../../../FlowControl/FlowManager');
const GuardarEstadoChofer = require('../../../Utiles/Funciones/Chofer/GuardarEstadoChofer');

module.exports = async function SecuenciaEntrega(userId, message, sock) {
    try {

        const estado = ObtenerEstadoChofer(userId)
        
        const estado = ObtenerEstadoChofer(userId)

        const hojaRuta = estado.hojaDeRuta

        console.log(hojaRuta);

        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Error: Hoja de ruta no proporcionada o vacía.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const { Detalles = [] } = hoja;
        const { Chofer } = hojaRuta;

        // Encontrar la entrega con estado "No entregado"
        const detalleNoEntregado = Detalles.find(detalle => detalle.Estado === "No entregado");

        if (!detalleNoEntregado) {
            console.error("⚠️ No hay ninguna entrega con estado 'No entregado'.");
            return;
        }

        // Marcar la entrega como "Entrega OK"
        detalleNoEntregado.Estado = "Entrega OK";
        console.log(`✅ Entrega marcada como OK: ${detalleNoEntregado.ID_DET}`);

        // Guardar la hoja de ruta actualizada en flowData
        FlowManager.userFlows[userId].flowData = hojaRuta;

        // Filtrar entregas aún pendientes
        const entregasPendientes = Detalles.filter(detalle => detalle.Estado === "No entregado");

        if (entregasPendientes.length === 0) {
            console.log("✅ Todas las entregas han sido completadas.");
           // await GuardarEstadoChofer(Chofer.Telefono + "@s.whatsapp.net", hojaRuta, "EntregasFinalizadas");

            const mensajeFinalizado = `✅ *Todas las entregas han sido completadas.* 🚚✨\nGracias por tu trabajo, ¡hasta la próxima!`;
            await sock.sendMessage(userId, { text: mensajeFinalizado });
            FlowManager.resetFlow(userId);
            // RESETEAR FLUJO Y STEP DEL CHOFER
            return;
        }

        // Construir lista de entregas pendientes
        let mensajePendientes = `📋 *Entregas pendientes:* \n`;
        entregasPendientes.forEach((detalle, index) => {
            mensajePendientes += `\n${index + 1}. 🆔 *${detalle.ID_DET}* - 📍 ${detalle.Direccion_Entrega}, ${detalle.Localidad}`;
        });

        mensajePendientes += `\n\n⏳ *Envía el número de la siguiente entrega para continuar.*`;

        // Enviar mensaje con entregas pendientes
        await sock.sendMessage(userId, { text: mensajePendientes });

        // Volver a la función `PrimeraEleccionEntrega`
        await GuardarEstadoChofer(Chofer.Telefono + "@s.whatsapp.net", hojaRuta, "PrimeraEleccionEntrega");

    } catch (error) {
        console.error("❌ Error en SecuenciaEntrega:", error);
    }
};
