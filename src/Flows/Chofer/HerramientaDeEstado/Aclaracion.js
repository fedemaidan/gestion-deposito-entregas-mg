const FlowManager = require('../../../FlowControl/FlowManager');
const { actualizarDetalleActual } = require('../../../services/google/Sheets/hojaDeruta');
const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');
const { enviarErrorPorWhatsapp } = require("../../../services/Excepcion/manejoErrores");

module.exports = async function Aclaracion(userId, message) {
    try {

const esURL = /^(https?:\/\/[^\s]+)/i.test(message);
if (esURL) {
    await enviarMensaje(userId, "⚠️ la aclaracion no puede ser una imagen. Por favor, escribí una aclaración válida.");
    return;
}

        await FlowManager.getFlow(userId);
        const hojaRuta = FlowManager.userFlows[userId]?.flowData;

        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Hoja de ruta vacía o no encontrada.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const { Detalle_Actual = [] } = hoja;

        if (Detalle_Actual.length === 0) {
            await enviarMensaje(userId, "⚠️ No hay entrega activa para agregar una aclaración. Por favor, seleccioná una entrega primero.");
            return;
        }

        const detalle = Detalle_Actual[0];

        // ✅ Guardar la observación
        detalle.Observaciones = message;

        // 🔄 Actualizar flujo
        FlowManager.setFlow(userId, "ENTREGACHOFER", "EntregaNOK", hojaRuta);

        // Confirmación al usuario
        await enviarMensaje(userId, `✅ *Aclaración agregada correctamente.*\n\n*Observación:* ${detalle.Observaciones}`);


        if (typeof detalle.Imagen === 'object' && detalle.Imagen?.imagenFirebase) {
            detalle.Imagen = detalle.Imagen.imagenFirebase;
            }

        // Actualizar Google Sheet
        await actualizarDetalleActual(hojaRuta);

        // Solicitar foto
        await enviarMensaje(userId, "📸 Por favor, subí la *foto del remito* para finalizar.");

    } catch (error) {
        console.error("❌ Error en Aclaracion:", error);
        await enviarMensaje(userId, "💥 Ocurrió un error al agregar la aclaración. Por favor, intentá nuevamente.");
        await enviarErrorPorWhatsapp(error, "metal grande");
    }
};
