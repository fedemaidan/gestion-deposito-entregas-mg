const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');

module.exports = async function Bloq(userId, message) {
    await enviarMensaje(userId, `Confirmando paso anterior... por favor espere.`);
};
