const FlowManager = require('../../../../FlowControl/FlowManager');
const enviarMensaje = require('../../../../services/EnviarMensaje/EnviarMensaje');

module.exports = async function resetFlow(Hdr, userId) {
    try {
        if (!Hdr || !Hdr.Hoja_Ruta || !Array.isArray(Hdr.Hoja_Ruta)) {
            await enviarMensaje(userId, "❌ La hoja de ruta es inválida o no contiene entregas.");
            return;
        }

        const resetSet = new Set();

        // 1. Chofer
        if (Hdr.Chofer?.Telefono) {
            resetSet.add(Hdr.Chofer.Telefono);
        }

        // 2. Clientes y Vendedores de todos los detalles
        Hdr.Hoja_Ruta.forEach(hdr => {
            hdr.Detalles.forEach(det => {
                if (det.Telefono) resetSet.add(det.Telefono);
                if (det.Telefono_vendedor) resetSet.add(det.Telefono_vendedor);
            });
        });

        let resultados = [];

        for (const tel of resetSet) {
            const jid = tel.includes("@s.whatsapp.net") ? tel : `${tel}@s.whatsapp.net`;

            const res = await FlowManager.resetFlow(jid);
            resultados.push(`🔄 Reiniciado: ${jid}`);
        }

        const resumen = `✅ Roles reiniciados correctamente para ${resultados.length} involucrado(s).\n\n` + resultados.join("\n");
        await enviarMensaje(userId, resumen);

    } catch (error) {
        console.error(error);
        await enviarMensaje(userId, "⚠️ Ocurrió un error al intentar reiniciar los flujos.");
    }
};