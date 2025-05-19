async function enviarMensaje(telefono, text) {
    try {
        // ⚠️ CARGA DIFERIDA para romper dependencia circular
        const SockSingleton = require('../../services/SockSingleton/sockSingleton');
        const sock = SockSingleton.getSock?.();
        if (!sock) throw new Error('Sock no inicializado');

        await sock.sendMessage(telefono, { text });
        console.log(`📩 Mensaje enviado a ${telefono}: ${text}`);
    } catch (error) {
        console.error(`❌ Error al enviar mensaje a ${telefono}:`, error);
    }
}

module.exports = enviarMensaje;