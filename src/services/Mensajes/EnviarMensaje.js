const socketSingleton = require('../SockSingleton/sockSingleton');

async function enviarMensaje(userId, text) {
    try {
        const sock = await socketSingleton.getSock()
        await sock.sendMessage(userId, { text });
        console.log(`📩 Mensaje enviado a ${userId}: ${text}`);
    } catch (error) {
        console.error(`❌ Error al enviar mensaje a ${userId}:`, error);
    }
}

module.exports = enviarMensaje;