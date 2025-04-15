const enviarMensaje = require('../../../Utiles/Funciones/Logistica/IniciarRuta/EnviarMensaje');
const { cerrarHojaDeRuta } = require('../../../services/google/Sheets/hojaDeruta');
const FlowManager = require('../../../FlowControl/FlowManager');

async function EnviarSiguienteEntrega(choferNumero, hojaRuta, sock) {
    try {
        const hoja = hojaRuta.Hoja_Ruta?.[0];
        const { Chofer } = hojaRuta;

        if (!hoja) {
            console.error("❌ Error: hojaRuta no contiene Hoja_Ruta[0]");
            return;
        }

        const { Detalles = [] } = hoja;

        // Si no hay entregas pendientes, enviamos un mensaje
        if (Detalles.length === 0) {
            console.log("✅ Todas las entregas han sido completadas.");

            const mensajeFinalizado = `✅ *Todas las entregas han sido completadas.* 🚚✨\nGracias por tu trabajo, ¡hasta la próxima!`;
            await sock.sendMessage(choferNumero, { text: mensajeFinalizado });

            // Cerrar hoja de ruta en Google Sheets
            await cerrarHojaDeRuta(hojaRuta);

            await FlowManager.resetFlow(userId);
            return;
        }

        // Generar mensaje con estilo unificado
        let mensaje = `📋 *Listado de Entregas Pendientes*\n\n`;

        Detalles.forEach((detalle, index) => {
            mensaje += `${index + 1}. 📍 *Dirección:* ${detalle.Direccion_Entrega || "No especificada"}, *Localidad:* ${detalle.Localidad || "No especificada"}\n`;
        });

        mensaje += "\n🚛 *Elegí tu próximo destino y manos a la obra*";

        await enviarMensaje(Chofer.Telefono + "@s.whatsapp.net", mensaje, sock);

    } catch (error) {
        console.error("❌ Error al enviar lista de entregas pendientes:", error);
    }
}

module.exports = EnviarSiguienteEntrega;
