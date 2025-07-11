const FlowMapper = require('../../FlowControl/FlowMapper');
const FlowManager = require('../../FlowControl/FlowManager');
const { saveImageToStorage } = require('../Firebase/storageHandler');
const transcribeAudio = require('../Firebase/transcribeAudio');
const downloadMedia = require('../Firebase/DownloadMedia');
const resetAllFlows = require('../../Utiles/Funciones/FuncionesFlowmanager/resetAllFlows');
const enviarMensaje = require('../../services/EnviarMensaje/EnviarMensaje');

const messageResponder = async (messageType, msg, sender) => {
    
    switch (messageType) {
        case 'text':
        case 'text_extended': {
            const text = msg.message.conversation || msg.message.extendedTextMessage?.text;

            if (text?.startsWith("RESET")) {
                const partes = text.split("#");

                if (partes.length === 1) {
                    if (partes[0] === "RESET ALL") {
                        await resetAllFlows(sender);
                        console.log("⏳ RESET de TODOS los flows ejecutado.");
                    } else {
                        FlowManager.resetFlow(sender);
                        console.log("⏳ RESET del sender ejecutado.");
                    }
                } else if (partes.length === 2) {
                    const numero = partes[1].replace(/\D/g, '');
                    const userIdDestino = `${numero}@s.whatsapp.net`;
                    FlowManager.resetFlow(userIdDestino);
                    console.log(`⏳ RESET ejecutado para ${userIdDestino}`);
                }

                return;
            }

            await FlowMapper.handleMessage(sender, text, messageType);
            break;
        }

        case 'image': {
            try {
                await enviarMensaje(sender, "⏳ Analizando imagen... ⏳");

                if (!msg.message?.imageMessage) {
                    await enviarMensaje(sender, "❌ No se encontró una imagen en el mensaje.");
                    return;
                }

                const ImageMessage = msg.message.imageMessage ||
                    msg.message.imageWithCaptionMessage?.message?.imageMessage;

                const urls = await saveImageToStorage(ImageMessage, sender, "image");

                await FlowMapper.handleMessage(sender, urls, null, 'image');
            } catch (error) {
                console.error("❌ Error al procesar la imagen:", error);
                await enviarMensaje(sender, "❌ Hubo un error al procesar tu imagen.");
            }
            break;
        }

        case 'video': {
            const filePath = await downloadMedia(msg.message, 'video');
            if (filePath) {
                await enviarMensaje(sender, `🎥 Video recibido y guardado en:\n${filePath}`);
            } else {
                await enviarMensaje(sender, '❌ No pude guardar el video. Intenta nuevamente.');
            }
            break;
        }

        case 'audio': {
            try {
                await enviarMensaje(sender, "⏳ Escuchando tu mensaje... ⏳");

                if (!msg.message?.audioMessage) {
                    await enviarMensaje(sender, "❌ No se encontró un audio en el mensaje.");
                    return;
                }

                const filePath = await downloadMedia(msg, 'audio');
                const transcripcion = await transcribeAudio(filePath);

                console.log("📜 Transcripción de audio:", transcripcion);
                await FlowMapper.handleMessage(sender, transcripcion, null, messageType);
            } catch (error) {
                console.error("❌ Error al procesar el audio:", error);
                await enviarMensaje(sender, "❌ Hubo un error al procesar tu audio.");
            }
            break;
        }

        case 'document':
        case 'document-caption': {
            try {
                await enviarMensaje(sender, "⏳ Analizando documento... ⏳");

                if (!msg?.message) {
                    console.error("❌ msg.message está vacío");
                    await enviarMensaje(sender, "❌ Hubo un problema al procesar tu documento.");
                    return;
                }

                const docMessage = msg.message.documentMessage ||
                    msg.message.documentWithCaptionMessage?.message?.documentMessage;

                if (!docMessage) {
                    await enviarMensaje(sender, "❌ No se encontró un documento adjunto.");
                    return;
                }

                const transcripcion = await saveImageToStorage(docMessage, sender, "document");
                if (!transcripcion) {
                    await enviarMensaje(sender, "❌ No se pudo procesar tu documento.");
                    return;
                }

                await FlowMapper.handleMessage(sender, transcripcion, null, "document-caption");
            } catch (error) {
                console.error("❌ Error al procesar el documento:", error);
                await enviarMensaje(sender, "❌ Hubo un error al procesar tu documento.");
            }
            break;
        }

        default: {
            await enviarMensaje(sender, `❓ No entiendo este tipo de mensaje (${messageType}). Por favor, envíame texto, imagen o documento válido.`);
        }
    }
};

module.exports = messageResponder;
