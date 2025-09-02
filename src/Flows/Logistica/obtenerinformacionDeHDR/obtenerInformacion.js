const FlowManager = require('../../../FlowControl/FlowManager');
const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');
const consultHDR = require('../../../Utiles/Funciones/Logistica/ReiniciarFlujo/consultHDR');

module.exports = async function obtenerInformacion(userId, message) {
    try {
        const { hojaRuta, mensaje, estado } = await consultHDR(message);

        await enviarMensaje(userId, mensaje);

        switch (estado) {
            case "encontrado":
                const msg2 = `🔁 *¿Qué deseas hacer con esta hoja de ruta?*\n\n` +
                    `Por favor, elija una opción:\n\n` +
                    `*1.* 🔄 Reiniciar toda la hoja\n[La hoja volverá al estado original]\n\n` +
                    `*2.* 🔓 Liberar roles\n[Solo los telefonos de los involucrados]\n\n` +
                    `*3.* ❌ Cancelar la operación`;

                await FlowManager.setFlow(userId, "SITUACIONHDR", "confirmarAccionHDR", hojaRuta);
                await enviarMensaje(userId, msg2);
                break;

            case "no encontrado":
                await FlowManager.resetFlow(userId);
                break;

            default:
                // Por si querés manejar futuros estados como "error", etc.
                await FlowManager.resetFlow(userId);
                break;
        }

    } catch (error) {
        console.error("❌ Error en obtenerInformacion:", error);
        await FlowManager.resetFlow(userId);
        await enviarMensaje(userId, "❌ Ocurrió un error inesperado al procesar la hoja de ruta.");
    }
};
