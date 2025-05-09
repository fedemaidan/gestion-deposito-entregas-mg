
async function enviarMensaje(telefono, text, sock) {
    try {
        await sock.sendMessage(telefono, { text });
        console.log(`📩 Mensaje enviado a ${telefono}: ${text}`);
    } catch (error) {
        console.error(`❌ Error al enviar mensaje a ${telefono}:`, error);
    }
}

module.exports = enviarMensaje;