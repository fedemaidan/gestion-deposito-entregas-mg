const ConfirmarSigEntrega = require("../../../Flows/Chofer/Envios/ConfirmarSigEntrega");
const socketSingleton = require('../../../services/SockSingleton/sockSingleton');
const FlowManager = require('../../../FlowControl/FlowManager');
module.exports = function iniciarTimeoutConfirmacion(userId) {
    let tiempoLimite= 1 * 60 * 1000; // Definir el tiempo de espera en 1 minuto por defecto
    // Definir el tiempo de espera en milisegundos
    console.log("Iniciando timeout de confirmación para el usuario:", userId);
    if(process.env.Dev_mode === "true")
        {
            tiempoLimite = 20 * 1000; // o el tiempo que quieras
        }
        else
        {
            tiempoLimite = 5 * 60 * 1000; // o el tiempo que quieras
        }
   
        console.log(tiempoLimite)
    setTimeout(async () => {
        let flow = await FlowManager.getFlow(userId);
        if (!flow || flow.currentStep !== "ConfirmarSigEntrega") return;

        await FlowManager.getFlow(userId);
        const hojaRuta = FlowManager.userFlows[userId]?.flowData;

        const sock = await socketSingleton.getSock();

        if (hojaRuta?.confirmado === false) {
            console.log("Timeout alcanzado, enviando mensaje de confirmación");
            const mensajeSimulado = "1";
            await ConfirmarSigEntrega(userId, mensajeSimulado, sock);
        }
    }, tiempoLimite);
}
