const GetType = require('../../../Utiles/Mensajes/GetType');
const { saveImageToStorage } = require('../../Firebase/storageHandler');
const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');

module.exports = async function GuardarRemito(userId, message) {
    try {
        const msg = message.messages?.[0];
        const sender = msg?.key?.remoteJid;
        const messageType = await GetType(msg.message);

        switch (messageType) {
            case 'image': {
                try {
                    await enviarMensaje(sender, "⏳ Analizando imagen... ⏳");

                    if (!msg.message || !msg.message.imageMessage) {
                        await enviarMensaje(sender, "❌ No se encontró una imagen en el mensaje.");
                        return;
                    }

                    let ImageMessage = msg.message.imageMessage
                        || (msg.message.imageWithCaptionMessage?.message?.imageMessage);

                    const urls = await saveImageToStorage(ImageMessage, sender, "image");

                    return urls;

                } catch (error) {
                    console.error("❌ Error al procesar la imagen:", error);
                    await enviarMensaje(sender, "❌ Hubo un error al procesar tu imagen.");
                }
                break;
            }

            case 'document':
            case 'document-caption': {
                try {
                    await enviarMensaje(sender, "⏳ Analizando documento... ⏳");

                    if (!msg || !msg.message) {
                        console.error("❌ El objeto 'msg' no tiene la propiedad 'message'");
                        await enviarMensaje(sender, "❌ Hubo un problema al procesar tu documento.");
                        return;
                    }

                    let docMessage = msg.message.documentMessage
                        || (msg.message.documentWithCaptionMessage?.message?.documentMessage);

                    if (!docMessage) {
                        console.error("❌ El mensaje no contiene un documento válido.");
                        await enviarMensaje(sender, "❌ No se encontró un documento adjunto.");
                        return;
                    }

                    const fileUrl = docMessage.url;
                    const fileName = docMessage.fileName || "archivo.pdf";

                    console.log(`📄 Documento recibido: ${fileName}, URL: ${fileUrl}`);

                    const transcripcion = await saveImageToStorage(docMessage, sender, "document");
                    if (!transcripcion) {
                        console.error("❌ No se pudo obtener el documento.");
                        await enviarMensaje(sender, "❌ No se pudo procesar tu documento.");
                        return;
                    }

                    return transcripcion;
                } catch (error) {
                    console.error("❌ Error al procesar el documento:", error);
                    await enviarMensaje(sender, "❌ Hubo un error al procesar tu documento.");
                }
                break;
            }

            default: {
                await enviarMensaje(sender, `❓ No entiendo este tipo de mensaje (${messageType}). Por favor, vuelve a enviar la imagen o documento.`);
            }
        }
    } catch (error) {
        console.error("❌ Error general en GuardarRemito.js", error);
    }
};
