const GuardarFlow = require('../../../Utiles/Funciones/FuncionesFlowmanager/GuardarFlow');
const ObtenerFlow = require('../../../Utiles/Funciones/FuncionesFlowmanager/ObtenerFlow');
const FlowManager = require('../../../FlowControl/FlowManager');
module.exports = async function PrimeraEleccionEntrega(userId, message, sock) {
    try {
        await ObtenerFlow(userId);
        const hojaRuta = FlowManager.userFlows[userId]?.flowData;

        console.log("HOJA DE RUTA: EN PRIMERAELECCION ENTREGA:")
        console.log(hojaRuta)

        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Error: Hoja de ruta no proporcionada o vacía.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const { Detalles = [] } = hoja;
        const { Chofer } = hojaRuta;

        // Filtrar entregas no entregadas según orden original
        const entregasPendientes = Detalles.filter(detalle => detalle.Estado === "No entregado");

        if (entregasPendientes.length === 0) {
            console.log("✅ Todas las entregas han sido completadas.");

            FlowManager.resetFlow(userId);

            //Avisar logistica de trabajo terminado:

            //-------

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

        // Buscar el detalle seleccionado
        const detalleSeleccionado = entregasPendientes[numeroPedido - 1];

        // Eliminarlo del array Detalles original
        hoja.Detalles = hoja.Detalles.filter(det => det.ID_DET !== detalleSeleccionado.ID_DET);

        // Guardarlo como Detalle_Actual (siempre como array por estructura uniforme)
        hoja.Detalle_Actual = [detalleSeleccionado];

        // Enviar mensaje de detalle actual
        const mensaje = `📌 *En proceso* \n\n🆔 *ID Detalle:* ${detalleSeleccionado.ID_DET}\n🏢 *Cliente:* ${detalleSeleccionado.Cliente}\n📍 *Dirección:* ${detalleSeleccionado.Direccion_Entrega}\n🌆 *Localidad:* ${detalleSeleccionado.Localidad}\n📄 *Estado:* ${detalleSeleccionado.Estado}`;
        await sock.sendMessage(userId, { text: mensaje });

        await sock.sendMessage(userId, {
            text: 'Cuando la entrega finalice, indícalo enviando un mensaje con el resultado de la entrega:\n- Reprogramado 📅\n- Entregado OK ✅\n- Entregado NOK ❌'
        });

        // Guardar nuevo estado actualizado
        await GuardarFlow(Chofer.Telefono + "@s.whatsapp.net", hojaRuta, "SecuenciaEntrega");

        console.log("✅ Detalle seleccionado y guardado en Detalle_Actual.");

    } catch (error) {
        console.error("❌ Error en PrimeraEleccionEntrega:", error);
    }
};

