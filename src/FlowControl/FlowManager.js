const GuardarFlow = require('../Utiles/Funciones/FuncionesFlowmanager/GuardarFlow')
const ObtenerFlow = require('../Utiles/Funciones/FuncionesFlowmanager/ObtenerFlow')
class FlowManager {
    constructor() {
        this.userFlows = {}; // Almacena los flujos de cada usuario
    }
    // Establecer el flujo y paso inicial para un usuario

    async setFlow(userId, flowName, Step, flowData = {}) {
        console.log(Step)
        const actualFlowData = this.userFlows[userId]?.flowData || {};
        const _flowData = { ...actualFlowData, ...flowData };
        this.userFlows[userId] = { flowName, currentStep: Step, flowData: _flowData }
        await GuardarFlow(userId, _flowData, Step, flowName)
    }

    // Obtener el flujo actual de un usuario
    async getFlow(userId) {
        if (!this.userFlows[userId]) {
            const estado = await ObtenerFlow(userId);
            if (estado.Success) {
                const { flowData, currentStep, flowName } = estado.data;
                this.userFlows[userId] = { flowData, currentStep, flowName };
            }
        }
        return this.userFlows[userId] || null;
    }

    // Reiniciar el flujo de un usuario
    async resetFlow(userId) {
        await EliminarFlow(userId); // <-- llamada a la capa intermedia
        delete this.userFlows[userId];
    }
}
module.exports = new FlowManager();
