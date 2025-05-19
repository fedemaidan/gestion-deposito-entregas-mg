const connectToWhatsApp = require('./src/Utiles/Mensajes/whatsapp');
const messageAppendBase = require('./src/services/usuario/messageAppendBase');

const startBot = async () => {
    await messageAppendBase.limpiarTodos();
    const sock = await connectToWhatsApp();
    setInterval(() => console.log('Keep-alive'), 5 * 60 * 1000);
};

startBot();
