const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');
const { cerrarHojaDeRuta } = require('../../../services/google/Sheets/hojaDeruta');
const FlowManager = require('../../../FlowControl/FlowManager');
const BuscarHoja = require('../../../Utiles/Funciones/Logistica/IniciarRuta/BuscarHoja');
const { leerTelefonoLogistica } = require('../../../services/google/Sheets/logisticaSheet');

async function EnviarSiguienteEntrega(choferNumero, hojaRuta) {
    try {
        const hoja = hojaRuta.Hoja_Ruta?.[0];
        const { Chofer } = hojaRuta;

        if (!hoja) {
            console.error("❌ Error: hojaRuta no contiene Hoja_Ruta[0]");
            return;
        }

        const { ID_CAB } = hoja;

        // 🔄 Buscar hoja actualizada desde Google Sheets
        const resultadoBusqueda = await BuscarHoja(choferNumero, ID_CAB);
        if (!resultadoBusqueda.operacion) {
            console.error("❌ No se pudo actualizar hoja:", resultadoBusqueda.msg);
            return;
        }

        const hojaRutaActualizada = resultadoBusqueda.hojaRuta;
        const nuevosDetalles = hojaRutaActualizada.Hoja_Ruta?.[0]?.Detalles || [];

        const detallesExistentes = hoja.Detalles || [];
        const detallesExistentesMap = new Map(detallesExistentes.map(d => [d.ID_DET, d]));

        nuevosDetalles.forEach(det => {
            if (detallesExistentesMap.has(det.ID_DET)) {
                detallesExistentesMap.set(det.ID_DET, det);
            } else if (!det.Estado || det.Estado.trim() === "") {
                detallesExistentesMap.set(det.ID_DET, det);
            }
        });

        hoja.Detalles = Array.from(detallesExistentesMap.values());

        await FlowManager.setFlow(choferNumero, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);

        // ✅ Si no quedan entregas pendientes
        if (hoja.Detalles.length === 0) {
            console.log("✅ Todas las entregas han sido completadas.");
            const mensajeFinalizado = `✅ *Todas las entregas han sido completadas.* 🚚✨\nGracias por tu trabajo, ¡hasta la próxima!`;
            await enviarMensaje(choferNumero, mensajeFinalizado);

            // Notificar a logística
            const telefonoLogistica = await leerTelefonoLogistica(ID_CAB);
            if (telefonoLogistica) {
                const mensajeLogistica = `📦 El chofer *${Chofer.Nombre}* (${Chofer.Telefono}) finalizó todas las entregas de la hoja *${ID_CAB}*.`;
                await enviarMensaje(`${telefonoLogistica}@s.whatsapp.net`, mensajeLogistica);
                console.log(`📨 Notificación enviada a logística: ${telefonoLogistica}`);
            } else {
                console.warn("⚠️ No se encontró número de logística para esta hoja.");
            }

            await cerrarHojaDeRuta(hojaRuta);
            await FlowManager.resetFlow(choferNumero);
            return;
        }

        // 📋 Listado de entregas pendientes
        let mensaje = `📋 *Listado de Entregas Pendientes*\n\n`;
        hoja.Detalles.forEach((detalle, index) => {
            mensaje += `${index + 1}. 📍 *Dirección:* ${detalle.Direccion_Entrega || "No especificada"}, *Localidad:* ${detalle.Localidad || "No especificada"}\n`;
        });

        mensaje += "\n🚛 *Elegí tu próximo destino y manos a la obra* \n🛠️ ¿Querés cambiar algo? Respondé con *MODIFICAR* o *CORREGIR*.";

        await enviarMensaje(`${Chofer.Telefono}@s.whatsapp.net`, mensaje);

    } catch (error) {
        console.error("❌ Error al enviar lista de entregas pendientes:", error);
    }
}

module.exports = EnviarSiguienteEntrega;
