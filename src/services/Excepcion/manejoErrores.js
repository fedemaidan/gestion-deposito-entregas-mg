const EnviarMensaje = require("../../services/EnviarMensaje/EnviarMensaje");

async function enviarErrorPorWhatsapp(err, sistema = 'Sistema desconocido') {
    const mensaje = `
❗ *Error capturado en:* ${sistema}
🧾 *Mensaje:* ${err.message}
🧩 *Tipo:* ${err.name}
🗺️ *Stack:* 
\`\`\`
${err.stack}
\`\`\`
🕒 ${new Date().toLocaleString()}
`;
    const ale = "5491149380799@s.whatsapp.net"
     await EnviarMensaje(ale, mensaje);

    if(process.env.NODE_ENV == "production")
        {
        const fede ="5491162948395@s.whatsapp.net"
        await EnviarMensaje(fede, mensaje);
        }
}
module.exports = {
    enviarErrorPorWhatsapp,
};
