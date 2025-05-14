const connectToWhatsApp = require('./src/Utiles/Mensajes/whatsapp');



const startBot = async () => {
    const sock = await connectToWhatsApp();

    setInterval(() => console.log('Keep-alive'), 5 * 60 * 1000);
};

startBot();
