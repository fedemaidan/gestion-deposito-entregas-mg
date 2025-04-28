const FlowManager = require('../FlowControl/FlowManager');
const IniciarRutaFlow = require('../Flows/Logistica/IniciarRutaFlow');
const IniciarEntregaFlow = require('../Flows/Chofer/IniciarEntregaFlow');
const defaultFlow = require('../Flows/INIT/INIT');
const SolicitarContactoFlow = require('../Flows/Cliente/SolicitarContactoFlow');
class FlowMapper {
    async handleMessage(userId, message, sock, messageType) {

        let flow = await FlowManager.getFlow(userId);

        console.log("------------------------------------ACTUAL flow------------------------------------")
        console.log(flow)
        console.log("------------------------------------------------------------------------")

        if (flow && flow.flowName) {
            switch (flow.flowName) {
                case 'INICIARRUTA':
                    await IniciarRutaFlow.Handle(userId, message, flow.currentStep, sock, messageType);
                    break;

                case 'ENTREGACHOFER':
                    await IniciarEntregaFlow.Handle(userId, message, flow.currentStep, sock, messageType);
                    break;

                case 'RECIBIRCLIENTE':
                    await SolicitarContactoFlow.Handle(userId, message, flow.currentStep, sock, messageType);
                    break;

                case 'DEFAULT':
                    await EgresoMaterialesFlow.Handle(userId, message, flow.currentStep, sock, messageType);
                    break;

                default:
                    await defaultFlow.handle(userId, message, sock, messageType);
                    break;
            }
        } else {
            // Si no hay flow, arrancamos el INITFLOW
            //FlowManager.setFlow(userId, 'INITFLOW');
            await defaultFlow.Init(userId, message, sock, messageType);
        }
    }
}
module.exports = new FlowMapper();
