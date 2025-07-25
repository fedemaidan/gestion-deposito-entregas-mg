const enviarMensaje = require("../../../services/EnviarMensaje/EnviarMensaje");
const { cerrarHojaDeRuta } = require("../../../services/google/Sheets/hojaDeruta");
const FlowManager = require("../../../FlowControl/FlowManager");
const { leerTelefonoLogistica } = require("../../../services/google/Sheets/logisticaSheet");
const opcionElegida = require("../../../Utiles/Chatgpt/opcionElegida");

module.exports = async function TerminarEntregas(userId, message) {
  try {
    const flowData = await FlowManager.getFlow(userId);
    const hojaRuta = flowData?.flowData;
    if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
      console.error("❌ Hoja de ruta no disponible.");
      return;
    }

    const hoja = hojaRuta.Hoja_Ruta[0];
    const ID_CAB = hoja.ID_CAB;
    const chofer = hojaRuta.Chofer;
    const data = await opcionElegida(message)

    switch (data.data.Eleccion) {
      case 1: // Finalizar
        const mensajeFinalizado = `✅ Completaste con todas las entregas asignadas.
        💡 Recordá retornar a base todos los comprobantes de esta hoja de ruta. ¡Hasta mañana!
        🚛✨`;
        await enviarMensaje(userId, mensajeFinalizado);

        const telefonoLogistica = await leerTelefonoLogistica(ID_CAB);
        if (telefonoLogistica) {
          const mensajeLogistica = `📦 El chofer *${chofer.Nombre}* (${chofer.Telefono}) finalizó todas las entregas de la hoja *${ID_CAB}*.`;
          await enviarMensaje(`${telefonoLogistica}@s.whatsapp.net`, mensajeLogistica);
          console.log(`📨 Notificación enviada a logística: ${telefonoLogistica}`);
        } else {
          console.warn("⚠️ No se encontró número de logística para esta hoja.");
        }

        await cerrarHojaDeRuta(hojaRuta);
        await FlowManager.resetFlow(userId);
        break;

      case 2: //modificar
      case 3:
        await enviarMensaje(userId, "🔄 Procesando...");

        const completadas = hoja.Detalles_Completados || [];

        if (completadas.length === 0) {
          await enviarMensaje(userId, "❌ No hay entregas completadas para modificar.");
          return;
        }

        let mensajeMod = "*📋 Entregas completadas disponibles para modificar:*\n";

        completadas.forEach((det, index) => {
          const comprobante = det.Comprobante?.Letra && det.Comprobante?.Punto_Venta && det.Comprobante?.Numero
            ? `${det.Comprobante.Letra} ${det.Comprobante.Punto_Venta}-${det.Comprobante.Numero}`
            : "--";
          const estado = det.Estado || "Sin estado";

          mensajeMod += `\n${index + 1}. 🆔 ${det.ID_DET} - 🏢 ${det.Cliente} - 📄 ${comprobante} - Estado: ${estado}`;
        });

        mensajeMod += `\n\n📌 *Respondé con el número de la entrega que querés modificar o CANCELAR para volver al listado anterior sin modificar nada.*`;
        
        await enviarMensaje(userId, mensajeMod);

        hojaRuta.entregasCompletadas = completadas;
        await FlowManager.setFlow(userId, "ENTREGACHOFER", "ModificarEntrega", hojaRuta);
        return;

      default:
        await enviarMensaje(userId, "⚠️ Por favor, respondé con \"1, si\" para finalizar o \"2, no\" para modificar una entrega.");
        break;
    }
  } catch (error) {
    console.error("❌ Error en TerminarEntregas:", error);
  }
}
