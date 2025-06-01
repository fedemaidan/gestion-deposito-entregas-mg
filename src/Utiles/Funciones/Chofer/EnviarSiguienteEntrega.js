const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');
const FlowManager = require('../../../FlowControl/FlowManager');
const BuscarHoja = require('../../../Utiles/Funciones/Logistica/IniciarRuta/BuscarHoja');

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
            await enviarMensaje(choferNumero,
                `📦 *Completaste todas las entregas.*\n¿Querés cerrar la hoja de ruta o modificar alguna entrega?\n\n 1️⃣ Finalizar hoja de ruta\n 2️⃣ Modificar entrega anterior`
            );
            await FlowManager.setFlow(choferNumero, "ENTREGACHOFER", "TerminarEntregas", hojaRuta);
            return;
        }

        // 📋 Listado de entregas pendientes
        let mensaje = `📋 *Listado de Entregas Pendientes*\n\n`;

        hoja.Detalles.forEach((detalle, index) => {
            const direccion = detalle.Direccion_Entrega || "No especificada";
            const localidad = detalle.Localidad || "No especificada";
            const cliente = detalle.Cliente || "Sin nombre";
            const vendedor = detalle.Vendedor || "Sin vendedor";
            const telefono = detalle.Telefono || detalle.Telefono_vendedor || "Sin teléfono";

            mensaje += `*${index + 1}.* 🏢 *Cliente:* ${cliente}\n`;
            mensaje += `   📍 *Dirección:* ${direccion}\n`;
            mensaje += `   🌆 *Localidad:* ${localidad}\n`;
            mensaje += `   👤 *Vendedor:* ${vendedor}\n`;
            mensaje += `   📞 *Teléfono:* ${telefono}\n\n`;
        });


        mensaje += "\n🚛 *Elegí tu próximo destino y manos a la obra* \n🛠️ ¿Querés cambiar algo? Respondé con *MODIFICAR* o *CORREGIR*.";

        await enviarMensaje(`${Chofer.Telefono}@s.whatsapp.net`, mensaje);

    } catch (error) {
        console.error("❌ Error al enviar lista de entregas pendientes:", error);
    }
}

module.exports = EnviarSiguienteEntrega;
