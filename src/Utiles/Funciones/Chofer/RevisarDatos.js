const { obtenerHojaRutaPorID } = require('../../../services/google/Sheets/hojaDeruta');

async function RevisarDatos(ID_DET, ID_CAB) {
    try {
        const { detalles } = await obtenerHojaRutaPorID(ID_CAB);

        if (!detalles || detalles.length === 0) {
            console.error("❌ No se encontraron detalles para el ID_CAB proporcionado.");
            return null;
        }

        const detalle = detalles.find(d => d.ID_DET === ID_DET);

        if (!detalle) {
            console.error(`❌ No se encontró el detalle con ID_DET = ${ID_DET}`);
            return null;
        }

        // 🔍 Cliente y vendedor con nombres correctos de columnas
        const cliente = {
            nombre: detalle.Cliente || "",
            telefono: detalle.Cli_Telefono || ""
        };

        const vendedor = {
            nombre: detalle.Vendedor || "",
            telefono: detalle.Ven_Telefono || ""
        };

        return { cliente, vendedor };

    } catch (error) {
        console.error("❌ Error al obtener datos actualizados:", error);
        return null;
    }
}

module.exports = RevisarDatos;
