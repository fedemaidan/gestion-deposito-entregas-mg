const FlowManager = require('../FlowControl/FlowManager');
const IniciarRutaFlow = require('../Flows/Logistica/IniciarRutaFlow');
const IniciarEntregaFlow = require('../Flows/Chofer/IniciarEntregaFlow');
const defaultFlow = require('../Flows/INIT/INIT');
const SolicitarContactoFlow = require('../Flows/Cliente/SolicitarContactoFlow');
class FlowMapper {
    async handleMessage(userId, message, messageType) {
        let flow = await FlowManager.getFlow(userId);

        if (flow && flow.flowName) {
            switch (flow.flowName) {
                case 'INICIARRUTA':
                    await IniciarRutaFlow.Handle(userId, message, flow.currentStep, messageType);
                    break;

                case 'SITUACIONHDR':
                    await IniciarRutaFlow.Handle(userId, message, flow.currentStep, messageType);
                    break;

                case 'ENTREGACHOFER':
                    await IniciarEntregaFlow.Handle(userId, message, flow.currentStep, messageType);
                    break;

                case 'RECIBIRCLIENTE':
                    await SolicitarContactoFlow.Handle(userId, message, flow.currentStep, messageType);
                    break;

                case 'DEFAULT':
                    await EgresoMaterialesFlow.Handle(userId, message, flow.currentStep, messageType);
                    break;

                default:
                    await defaultFlow.handle(userId, message, messageType);
                    break;
            }
        } else {
            // Si no hay flow, arrancamos el INITFLOW
            //FlowManager.setFlow(userId, 'INITFLOW');
            await defaultFlow.Init(userId, message, messageType);
        }
    }
}
module.exports = new FlowMapper();
