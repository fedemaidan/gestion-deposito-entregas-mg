const FlowMapper = require('../../FlowControl/FlowMapper');
const FlowManager = require('../../FlowControl/FlowManager');
const { saveImageToStorage } = require('../Firebase/storageHandler');
const transcribeAudio = require('../Firebase/transcribeAudio');
const downloadMedia = require('../Firebase/DownloadMedia');

const messageResponder = async (messageType, msg, sock, sender) =>
{
   
    switch (messageType) {
        case 'text':
        case 'text_extended': {
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

            //RESET CODE
                if (text.startsWith("RESET")) {
                    const partes = text.split("#");

                    // Caso 1: solo "RESET"
                    if (partes.length === 1) {
                        FlowManager.resetFlow(sender);
                        console.log("⏳⏳⏳⏳FLOW ELIMINADO CON ÉXITO para sender⏳⏳⏳⏳");
                    }
                    // Caso 2: "RESET#1122334455"
                    else if (partes.length === 2) {
                        const numero = partes[1].replace(/\D/g, '');
                        const userIdDestino = `${numero}@s.whatsapp.net`;

                        FlowManager.resetFlow(userIdDestino);
                        console.log(`⏳⏳⏳⏳FLOW ELIMINADO CON ÉXITO para ${userIdDestino}⏳⏳⏳⏳`);
                    }

                    return;
                }
            //-------------------------


            await FlowMapper.handleMessage(sender, text, sock, messageType);
            break;
        }
        case 'image': {
            try {
                await sock.sendMessage(sender, { text: "⏳ Analizando imagen... ⏳" });
                // Verificar si el mensaje tiene una imagen (no audio)
                if (!msg.message || !msg.message.imageMessage) {
                    await sock.sendMessage(sender, { text: "❌ No se encontró una imagen en el mensaje." });
                    return;
                }

                console.log("❌❌❌❌❌❌❌❌❌❌❌❌❌❌")
                console.log("ME ENCUENTRO EN EL CASE DE IMAGEN")
                console.log("❌❌❌❌❌❌❌❌❌❌❌❌❌❌")

                let ImageMessage = msg.message.imageMessage
                    || (msg.message.imageWithCaptionMessage?.message?.imageMessage);

                const urls = await saveImageToStorage(ImageMessage, sender, "image");

                // Enviar el texto extraído al flujo de procesamiento
                await FlowMapper.handleMessage(sender, urls, sock, 'image');

            } catch (error) {
                console.error("Error al procesar la imagen:", error);
                await sock.sendMessage(sender, { text: "❌ Hubo un error al procesar tu imagen." });
            }
            break;
        }
        case 'video': {
            const filePath = await DownloadMedia(msg.message, 'video');
            if (filePath) {
                await sock.sendMessage(sender, { text: `He recibido tu video y lo he guardado en: ${filePath}` });
            } else {
                await sock.sendMessage(sender, { text: 'No pude guardar el video. Intenta nuevamente.' });
            }
            
            break;
        }
        case 'audio': {
            try {
                await sock.sendMessage(sender, { text: "⏳ Escuchando tu mensaje... ⏳" });
                if (!msg.message || !msg.message.audioMessage) {
                    await sock.sendMessage(sender, { text: "❌ No se encontró un audio en el mensaje." });
                    return;
                }

                // Pasar el mensaje completo
                const filePath = await downloadMedia(msg,'audio');

                const transcripcion = await transcribeAudio(filePath);

                console.log("Esta es la transcripcion")
                console.log(transcripcion)
                await FlowMapper.handleMessage(sender, transcripcion, sock, messageType);
            } catch (error) {
                console.error("Error al procesar el audio:", error);
                await sock.sendMessage(sender, { text: "❌ Hubo un error al procesar tu audio." });
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

                // Verificar si el mensaje contiene un documento
                let docMessage = msg.message.documentMessage
                    || (msg.message.documentWithCaptionMessage?.message?.documentMessage);


                if (!docMessage) {
                    console.error("❌ El mensaje no contiene un documento válido.");
                    await sock.sendMessage(sender, { text: "❌ No se encontró un documento adjunto." });
                    return;
                }

                // Extraer la URL y el nombre del archivo
                const fileUrl = docMessage.url;
                const fileName = docMessage.fileName || "archivo.pdf";

                console.log(`📄 Documento recibido: ${fileName}, URL: ${fileUrl}`);

                // Guardar el documento y obtener su ruta
                const transcripcion = await saveImageToStorage(docMessage, sender, "document");
                if (!transcripcion) {
                    console.error("❌ No se pudo obtener el documento.");
                    await sock.sendMessage(sender, { text: "❌ No se pudo procesar tu documento." });
                    return;
                }
                // Llamar a la función de transcripción con la ruta obtenido
                // Enviar el resultado a FlowMapper
                await FlowMapper.handleMessage(sender, transcripcion, sock, "document-caption");

            } catch (error) {
                console.error("❌ Error al procesar el documento:", error);
                await sock.sendMessage(sender, { text: "❌ Hubo un error al procesar tu documento." });
            }
            break;
        }
        default: {
            await sock.sendMessage(sender, {
                text: `No entiendo este tipo de mensaje (${messageType}). Por favor, envíame texto o un comando válido.`,
            });
        }
    }
};
module.exports = messageResponder;
