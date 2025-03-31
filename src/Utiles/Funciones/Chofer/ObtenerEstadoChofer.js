const estado = require('../../../services/estado/estado');
const FlowManager = require('../../../FlowControl/FlowManager');
module.exports = async function ObtenerEstadoChofer(userId) {
    try {
        if (!userId) {
            console.error("❌ Error: userId no proporcionado.");
            return { Success: false, msg: "userId no proporcionado." };
        }

        // Buscar el estado en la base de datos por userId
        const estadoChofer = await estado.getEstadoByUserId(userId);

        if (!estadoChofer) {
            console.log("🚫 No se encontró estado para el userId:", userId);
            return { Success: false, msg: "No se encontró estado para este usuario." };
        }

        console.log("✅ Estado encontrado:", estadoChofer);







        return estadoChofer;
    } catch (error) {
        console.error("❌ Error en ObtenerEstadoChofer:", error);
    }
};