const { Flow } = require('../../../../../models');
const { enviarErrorPorWhatsapp } = require('../../../../services/Excepcion/manejoErrores');

module.exports = async function consultHDR(message) {
    try {
        const { id_cab, telefonoInvolucrado } = message.data || {};

        if ((id_cab === null || id_cab === "") && (telefonoInvolucrado === null || telefonoInvolucrado === "")) {
            const errorMsg = "❌ No se proporcionó ni ID_CAB ni número de teléfono valido para buscar la hoja de ruta.";
            await enviarMensaje(userId, errorMsg);
            return { hojaRuta: null, mensaje: errorMsg, estado: "no encontrado" };
        }

        const flows = await Flow.findAll({
            where: { flow: "ENTREGACHOFER" }
        });

        for (const flow of flows) {
            const data = flow.flowData;

            if (!data || !Array.isArray(data.Hoja_Ruta)) continue;

            for (const hoja of data.Hoja_Ruta) {
                const coincidePorId = id_cab && hoja.ID_CAB === id_cab;
                const coincidePorTelefonoChofer = telefonoInvolucrado && data.Chofer?.Telefono === telefonoInvolucrado;

                const coincideEnDetalle = telefonoInvolucrado && hoja.Detalles?.some(det =>
                    det.Telefono === telefonoInvolucrado || det.Telefono_vendedor === telefonoInvolucrado
                );

                if (coincidePorId || coincidePorTelefonoChofer || coincideEnDetalle) {
                    const mensaje = `✅ *Hoja de ruta encontrada*\n\n` +
                        `🆔 *ID_CAB:* ${hoja.ID_CAB}\n` +
                        `📅 *Fecha:* ${hoja.Fecha}\n` +
                        `⏰ *Hora de salida:* ${hoja.Hora_Salida}\n` +
                        `🚛 *Chofer:* ${data.Chofer?.Nombre || "Sin nombre"}\n` +
                        `📞 *Teléfono:* ${data.Chofer?.Telefono || "No disponible"}\n` +
                        `📦 *Cantidad de entregas:* ${hoja.Detalles?.length || 0}`;

                    return {
                        hojaRuta: data,
                        mensaje,
                        estado: "encontrado",
                    };
                }
            }
        }

        const noEncontrado = `❌ No se encontró ninguna hoja de ruta relacionada con:\n` +
            `${id_cab ? `🆔 ID_CAB: *${id_cab}*\n` : ""}` +
            `${telefonoInvolucrado ? `📞 Teléfono: *${telefonoInvolucrado}*` : ""}`;
        return { hojaRuta: null, mensaje: noEncontrado, estado: "no encontrado" };

    } catch (error) {
        await enviarErrorPorWhatsapp(error, "metal grande");
        return { hojaRuta: null, mensaje: "❌ Ocurrió un error al buscar la hoja de ruta." };
    }
};