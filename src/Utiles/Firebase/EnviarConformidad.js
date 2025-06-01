const path = require('path');
const fs = require('fs');

module.exports = async function enviarRemitoWhatsApp(filepath, recipient, imagePath = null) {
    try {
        const SockSingleton = require('../../services/SockSingleton/sockSingleton');
        const sock = SockSingleton.getSock?.();
        if (!sock) throw new Error('Sock no inicializado');

        // Validar recipient
        if (!recipient || typeof recipient !== 'string') {
            throw new Error(`❌ Recipient inválido (tipo incorrecto o nulo): ${recipient}`);
        }
        if (!recipient.includes('@s.whatsapp.net')) {
            throw new Error(`❌ Recipient no contiene JID válido (@s.whatsapp.net): ${recipient}`);
        }

        // Verificar existencia del archivo principal
        if (!fs.existsSync(filepath)) {
            throw new Error(`❌ El archivo no existe en la ruta especificada: ${filepath}`);
        }

        const fileBuffer = fs.readFileSync(filepath);
        const ext = path.extname(filepath).toLowerCase();
        const isImage = ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
        const mimeType = isImage ? getImageMimeType(filepath) : 'application/pdf';

        // Enviar archivo como imagen o documento
        if (isImage) {
            await sock.sendMessage(recipient, {
                image: fileBuffer,
                mimetype: mimeType,
                fileName: path.basename(filepath),
                jpegThumbnail: undefined
            });
            console.log(`🖼️ Imagen enviada a ${recipient}`);
        } else {
            await sock.sendMessage(recipient, {
                document: fileBuffer,
                mimetype: mimeType,
                fileName: path.basename(filepath)
            });
            console.log(`📄 Documento enviado a ${recipient}`);
        }

        // Enviar imagen adicional si se especifica
        if (imagePath && fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            const extraMimeType = getImageMimeType(imagePath);

            await sock.sendMessage(recipient, {
                image: imageBuffer,
                mimetype: extraMimeType,
                fileName: path.basename(imagePath),
                jpegThumbnail: undefined
            });

            console.log(`🖼️ Imagen extra enviada a ${recipient}: ${imagePath}`);
        } else if (imagePath) {
            console.warn(`⚠️ Imagen extra no encontrada: ${imagePath}`);
        }

    } catch (error) {
        console.error("❌ Error enviando archivo por WhatsApp:", error.message);
        console.error("📛 Stack:", error.stack);
    }
};

function getImageMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.png':
            return 'image/png';
        case '.gif':
            return 'image/gif';
        default:
            return 'image/jpeg';
    }
}