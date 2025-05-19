const ConfirmarSigEntrega = require("../../../Flows/Chofer/Envios/ConfirmarSigEntrega");
const socketSingleton = require('../../../services/SockSingleton/sockSingleton');
const FlowManager = require('../../../FlowControl/FlowManager');

function logConId(texto) {
    const id = Math.floor(Math.random() * 90000) + 10000;
    console.log(`${texto} [#${id}]`);
}

module.exports = function iniciarTimeoutConfirmacion(userId) {
    let tiempoLimite;

     tiempoLimite = 4.55 * 60 * 1000; // 4 minutos 33 segundos

    logConId(`⏳ Iniciando timeout de confirmación para el usuario: ${userId}`);

    setTimeout(async () => {
        let flow = await FlowManager.getFlow(userId);
        if (!flow || flow.currentStep !== "ConfirmarSigEntrega") return;

        const hojaRuta = FlowManager.userFlows[userId]?.flowData;
        if (hojaRuta?.confirmado === true) return;

        logConId("🔒 Timeout parcial alcanzado. Bloqueando paso actual...");

        // 1. Apuntar a paso “neutro” para bloquear
        await FlowManager.setFlow(userId, "ENTREGACHOFER", "Bloq", hojaRuta);

        // 2. Esperar 5 segundos y ejecutar el paso real
        setTimeout(async () => {
            // Validación extra por si ya se confirmó mientras tanto
            const flowFinal = await FlowManager.getFlow(userId);
            const hojaRutaFinal = flowFinal?.flowData;
            if (hojaRutaFinal?.confirmado === true) return;

            logConId("⏰ Timeout final: ejecutando confirmación automática.");

            const mensajeSimulado = "1";
            await ConfirmarSigEntrega(userId, mensajeSimulado);
        }, 5000);

    }, tiempoLimite);
};