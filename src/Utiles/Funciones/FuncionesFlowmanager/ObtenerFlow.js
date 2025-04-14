const FlowService = require('../../../services/flow/flowService');

module.exports = async function ObtenerFlow(userId) {
    try {
        if (!userId) {
            console.error("❌ Error: userId no proporcionado.");
            return { Success: false, msg: "userId no proporcionado." };
        }

        // Obtener el flow desde la base
        const flowData = await FlowService.getFlowByUserId(userId);

        if (!flowData) {
            console.log("🚫 No se encontró flow para el userId:", userId);
            return { Success: false, msg: "No se encontró flow para este usuario." };
        }

        // Pisar el flow actual en memoria con el de base de datos
        const { flowname, step, hojaDeRuta } = flowData;

        console.log("✅ Flow encontrado y pisado en FlowManager:", flowData);
        return { Success: true, data: flowData };
    } catch (error) {
        console.error("❌ Error en ObtenerFlow:", error);
        return { Success: false, msg: error.message };
    }
};
