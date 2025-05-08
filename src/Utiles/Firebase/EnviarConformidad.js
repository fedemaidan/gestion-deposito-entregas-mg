const path = require('path');
const fs = require('fs');

module.exports = async function enviarRemitoWhatsApp(filepath, sock, recipient, imagePath = null) {
    try {
        // Verificar existencia del archivo principal
        if (!fs.existsSync(filepath)) {
            throw new Error('❌ El archivo no existe en la ruta especificada.');
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
                fileName: path.basename(filepath)
            });
            console.log(`🖼️ Imagen enviada a ${recipient}`);
        } else {
            await sock.sendMessage(recipient, {
                document: fileBuffer,
                mimetype: mimeType,
                fileName: path.basename(filepath)
            });
            console.log(`📄 Archivo (documento) enviado a ${recipient}`);
        }

        // Enviar imagen adicional si se especifica
        if (imagePath && fs.existsSync(imagePath)) {
            const imageBuffer = fs.readFileSync(imagePath);
            const extraMimeType = getImageMimeType(imagePath);

            await sock.sendMessage(recipient, {
                image: imageBuffer,
                mimetype: extraMimeType,
                fileName: path.basename(imagePath)
            });

            console.log(`🖼️ Imagen extra enviada: ${imagePath}`);
        } else if (imagePath) {
            console.warn(`⚠️ La imagen extra no existe: ${imagePath}`);
        }

    } catch (error) {
        console.error("❌ Error enviando archivo por WhatsApp:", error.message);
    }
}

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
            return 'image/jpeg'; // Fallback
    }
}
