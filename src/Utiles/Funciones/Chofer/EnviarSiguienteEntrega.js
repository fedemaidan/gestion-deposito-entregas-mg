const enviarMensaje = require('../../../Utiles/Funciones/Logistica/IniciarRuta/EnviarMensaje');
const { cerrarHojaDeRuta } = require('../../../services/google/Sheets/hojaDeruta');
const FlowManager = require('../../../FlowControl/FlowManager');
const BuscarHoja = require('../../../Utiles/Funciones/Logistica/IniciarRuta/BuscarHoja');

async function EnviarSiguienteEntrega(choferNumero, hojaRuta, sock) {
    try {
        const hoja = hojaRuta.Hoja_Ruta?.[0];
        const { Chofer } = hojaRuta;

        if (!hoja) {
            console.error("❌ Error: hojaRuta no contiene Hoja_Ruta[0]");
            return;
        }

        const { ID_CAB } = hoja;

        // 🔄 Buscar hoja actualizada desde Google Sheets (solo detalles sin estado)
        const resultadoBusqueda = await BuscarHoja(choferNumero, ID_CAB);
        if (!resultadoBusqueda.operacion) {
            console.error("❌ No se pudo actualizar hoja:", resultadoBusqueda.msg);
            return;
        }

        const hojaRutaActualizada = resultadoBusqueda.hojaRuta;
        const nuevosDetalles = hojaRutaActualizada.Hoja_Ruta?.[0]?.Detalles || [];

        const detallesExistentes = hoja.Detalles || [];
        const detallesExistentesMap = new Map(detallesExistentes.map(d => [d.ID_DET, d]));

        // Primero, actualizamos los detalles existentes con los nuevos detalles si hay modificaciones.
        nuevosDetalles.forEach(det => {
            // Si ya existe el detalle en los existentes, lo reemplazamos con la nueva versión.
            if (detallesExistentesMap.has(det.ID_DET)) {
                detallesExistentesMap.set(det.ID_DET, det);
            }
            // Si el detalle no existe, lo agregamos como un nuevo detalle.
            else if (!det.Estado || det.Estado.trim() === "") {
                detallesExistentesMap.set(det.ID_DET, det);
            }
        });

        // Convertimos el mapa de vuelta en un array para guardar los detalles
        hoja.Detalles = Array.from(detallesExistentesMap.values());

        // 💾 Guardar hoja actualizada en el flujo del chofer
        await FlowManager.setFlow(choferNumero, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);

        // Si no hay entregas pendientes, enviamos un mensaje
        if (hoja.Detalles.length === 0) {
            console.log("✅ Todas las entregas han sido completadas.");

            const mensajeFinalizado = `✅ *Todas las entregas han sido completadas.* 🚚✨\nGracias por tu trabajo, ¡hasta la próxima!`;
            await sock.sendMessage(choferNumero, { text: mensajeFinalizado });

            // Cerrar hoja de ruta en Google Sheets
            await cerrarHojaDeRuta(hojaRuta);

            await FlowManager.resetFlow(choferNumero);
            return;
        }

        // Generar mensaje con estilo unificado
        let mensaje = `📋 *Listado de Entregas Pendientes*\n\n`;

        hoja.Detalles.forEach((detalle, index) => {
            mensaje += `${index + 1}. 📍 *Dirección:* ${detalle.Direccion_Entrega || "No especificada"}, *Localidad:* ${detalle.Localidad || "No especificada"}\n`;
        });

        mensaje += "\n🚛 *Elegí tu próximo destino y manos a la obra* \n🛠️ ¿Querés cambiar algo? Respondé con *MODIFICAR* o *CORREGIR*.";

        await enviarMensaje(Chofer.Telefono + "@s.whatsapp.net", mensaje, sock);

    } catch (error) {
        console.error("❌ Error al enviar lista de entregas pendientes:", error);
    }
}

module.exports = EnviarSiguienteEntrega;
