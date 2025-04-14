const FlowManager = require('../../../FlowControl/FlowManager');

module.exports = async function Aclaracion(userId, message, sock) {
    try {
        await FlowManager.getFlow(userId)
        const hojaRuta = FlowManager.userFlows[userId]?.flowData;

        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Hoja de ruta vacía o no encontrada.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const { Detalle_Actual = [], Detalles_Completados = [] } = hoja;

        if (Detalle_Actual.length === 0) {
            await sock.sendMessage(userId, {
                text: "⚠️ No hay entrega activa para agregar una aclaración. Por favor, seleccioná una entrega primero."
            });
            return;
        }

        const detalle = Detalle_Actual[0];

        // Actualizamos la observación del detalle con el mensaje
        detalle.Observaciones = message;

        // Opcional: Lógica para subir imagen a Firebase y obtener la URL pública si se requiere

        // 🔄 Actualizar el flow en memoria con el cambio realizado
        FlowManager.setFlow(userId, "ENTREGACHOFER", "EntregaNOK", hojaRuta);

        // Enviar confirmación al usuario
        await sock.sendMessage(userId, {
            text: `✅ *Aclaración agregada correctamente.*\n\n*Observación:* ${detalle.Observaciones}`
        });

        // Opcional: Llamar a la función que actualice los cambios en Sheets (si es necesario)
        // await actualizarEntregaEnSheet(hoja.ID_CAB, detalle);

        await sock.sendMessage(userId, {text: `📸 Por favor, subí la *foto del remito* para finalizar.`});

    } catch (error) {
        console.error("❌ Error en Aclaracion:", error);
        await sock.sendMessage(userId, {
            text: "💥 Ocurrió un error al agregar la aclaración. Por favor, intentá nuevamente."
        });
    }
};