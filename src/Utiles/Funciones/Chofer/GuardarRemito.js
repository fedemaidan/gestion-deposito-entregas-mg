const GetType = require('../../../Utiles/Mensajes/GetType');
// Asegurate de importar estas funciones en tu entorno real
// const saveImageToStorage = require(...);
// const FlowMapper = require(...);
// const downloadMedia = require(...);
// const transcribeImage = require(...);
// const transcribeAudio = require(...);

module.exports = async function GuardarRemito(userId, message, sock) {
    try {
        const msg = message.messages[0];
        const sender = msg.key.remoteJid;
        const messageType = await GetType(msg.message);

        switch (messageType) {
            case 'image': {
                try {
                    await sock.sendMessage(sender, { text: "⏳ Analizando imagen... ⏳" });

                    if (!msg.message || !msg.message.imageMessage) {
                        await sock.sendMessage(sender, { text: "❌ No se encontró una imagen en el mensaje." });
                        return;
                    }

                    let ImageMessage = msg.message.imageMessage
                        || (msg.message.imageWithCaptionMessage?.message?.imageMessage);

                    const urls = await saveImageToStorage(ImageMessage, sender, "image");

                    return urls.imagenFirebase;

                } catch (error) {
                    console.error("Error al procesar la imagen:", error);
                    await sock.sendMessage(sender, { text: "❌ Hubo un error al procesar tu imagen." });
                }
                break;
            }
            case 'document':
            case 'document-caption': {
                try {
                    await sock.sendMessage(sender, { text: "⏳ Analizando documento... ⏳" });

                    if (!msg || !msg.message) {
                        console.error("❌ El objeto 'msg' no tiene la propiedad 'message'");
                        await sock.sendMessage(sender, { text: "❌ Hubo un problema al procesar tu documento." });
                        return;
                    }

                    let docMessage = msg.message.documentMessage
                        || (msg.message.documentWithCaptionMessage?.message?.documentMessage);

                    if (!docMessage) {
                        console.error("❌ El mensaje no contiene un documento válido.");
                        await sock.sendMessage(sender, { text: "❌ No se encontró un documento adjunto." });
                        return;
                    }

                    const fileUrl = docMessage.url;
                    const fileName = docMessage.fileName || "archivo.pdf";

                    console.log(`📄 Documento recibido: ${fileName}, URL: ${fileUrl}`);

                    const transcripcion = await saveImageToStorage(docMessage, sender, "document");
                    if (!transcripcion) {
                        console.error("❌ No se pudo obtener el documento.");
                        await sock.sendMessage(sender, { text: "❌ No se pudo procesar tu documento." });
                        return;
                    }

                    return transcripcion.imagenFirebase;
                } catch (error) {
                    console.error("❌ Error al procesar el documento:", error);
                    await sock.sendMessage(sender, { text: "❌ Hubo un error al procesar tu documento." });
                }
                break;
            }

            default: {
                await sock.sendMessage(sender, {
                    text: `No entiendo este tipo de mensaje (${messageType}). Por favor, vuelve a enviar la imagen o documento.`,
                });
            }
        }
    } catch (error) {
        console.error("❌ Error en GuardarRemito.js", error);
    }
};
