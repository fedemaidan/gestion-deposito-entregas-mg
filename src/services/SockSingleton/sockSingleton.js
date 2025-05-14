const GetMessageType = require("../../Utiles/Mensajes/GetType");
const messageResponder = require("../../Utiles/Mensajes/messageResponder");

class SockSingleton {

    constructor() {
        if (!SockSingleton.instance) {
            this.sock = {}; // Se guardará la instancia única de sock
            SockSingleton.instance = this;
        }
        return SockSingleton.instance;
    }

    async setSock(sockInstance) {
        this.sock = sockInstance;

   this.sock.ev.on('messages.upsert', async (message) => {
        
        console.log('New message:', message);
        if (message.type !== 'notify') return;
        
        const msg = message.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const sender = msg.key.remoteJid;
        const messageType = GetMessageType(msg.message);

        await messageResponder(messageType, msg, this.sock, sender);

    });
        setInterval(async () => await sock.sendPresenceUpdate('available'), 10 * 60 * 1000);
    }

    // Obtiene la instancia del sock
    getSock() {
        return this.sock;
    }

    getInstance () {
        return SockSingleton.instance;
    }   

}

module.exports = new SockSingleton();
