const FlowManager = require('../../../FlowControl/FlowManager');
const AnalizarEstado = require('../../../Utiles/Funciones/Chofer/AnalizarEstado');
const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');

module.exports = async function SecuenciaEntrega(userId, message) {
    try {
        const data = await AnalizarEstado(message);

        await FlowManager.getFlow(userId);
        const hojaRuta = FlowManager.userFlows[userId]?.flowData;

        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Hoja de ruta vacía o no encontrada.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const grupoActual = hoja.Grupo_Actual || [];
        const detalleActual = hoja.Detalle_Actual || [];

        const entregaActual = grupoActual.length > 0 ? grupoActual[0] : (detalleActual.length > 0 ? detalleActual[0] : null);

        if (!entregaActual) {
            await enviarMensaje(userId, "⚠️ No hay entrega en curso. Por favor, seleccioná una entrega primero.");
            return;
        }

        let nuevoEstado;
        let nextStep;

        console.log("data.data.Eleccion", data.data.Eleccion);

        switch (data.data.Eleccion) {
            case "1":
                nuevoEstado = "Entregado OK";
                nextStep = "EntregaOK";
                await enviarMensaje(userId,
                    `✅ Se seleccionó *${nuevoEstado}*.\n📸 Por favor, subí la *foto del comprobante* con *firma, DNI y aclaración* de quien haya recibido la entrega, junto con *fecha y hora*.`);
                break;
            case "2":
                nuevoEstado = "Entregado NOK";
                nextStep = "Aclaracion";
                await enviarMensaje(userId,
                    `⚠️ Se seleccionó *${nuevoEstado}*.\n📝 Por favor, contanos *qué pasó* con esta entrega.`);
                break;
            case "3":
                nuevoEstado = "No Entregado";
                nextStep = "Aclaracion";
                await enviarMensaje(userId,
                    `❌ Se seleccionó *${nuevoEstado}*.\n📝 Por favor, indicá *el motivo* por el cual no se entregó.`);
                break;
            case "4":
                nuevoEstado = "Reprogramado";
                nextStep = "Reprogramado";
                await enviarMensaje(userId,
                    `🔁 Se seleccionó *${nuevoEstado}*.\n📨 Daré aviso al vendedor y al cliente.\n📝 Por favor, indicá *el motivo* por el cual se reprogramó.`);
                break;
            default:
                await enviarMensaje(userId,
                    `❗ *Opción no válida.* Escribí 1, 2, 3 o 4 para indicar el resultado de la entrega.\n\n1️⃣ Entregado OK ✅\n2️⃣ Entregado NOK ⚠️\n3️⃣ No Entregado ❌\n4️⃣ Reprogramado 🔁`
                );
                return;
        }

        // Solo actualiza el estado
        entregaActual.Estado = nuevoEstado;

        // Redireccionar al siguiente paso del flujo
        await FlowManager.setFlow(userId, "ENTREGACHOFER", nextStep, hojaRuta);

        console.log(`✅ Estado actualizado a "${nuevoEstado}" y redireccionado al paso ${nextStep}`);

    } catch (error) {
        console.error("❌ Error en FinalizarEntrega:", error);
        await enviarMensaje(userId, "💥 *Ocurrió un error al finalizar la entrega.*\nPor favor, intentá nuevamente o contactá a soporte.");
    }
};
