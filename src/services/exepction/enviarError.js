
async function enviarError(text,sock) {
    try {
        const ale = "5491149380799@s.whatsapp.net"
        //const fede ="5491162948395@s.whatsapp.net"

        await sock.sendMessage(ale, { text });
        //await sock.sendMessage(fede, { text });

    } catch (error) {
        console.error(`❌❌❌❌`, error);
    }
}
module.exports = enviarError;