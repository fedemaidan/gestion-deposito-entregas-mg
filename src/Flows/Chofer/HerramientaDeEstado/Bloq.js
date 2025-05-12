module.exports = async function Bloq(userId, message, sock) {
    await sock.sendMessage(userId, {text: `Confirmando paso anterior... porfavor espere.`});
};