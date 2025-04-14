const fs = require('fs');
const openai = require('../Chatgpt/openai');
const { obtenerTodosLosMateriales } = require('../BDServices/Funciones/FuncionesMaterial');


module.exports = async function transcribeAudio(filePath) {
    const stock = await obtenerTodosLosMateriales()
    const db_json = JSON.stringify(stock);
    const prompt = "Sos un experto transcribiendo audios. Ten en cuenta que el usuario tiene la siguiente base de datos: " + db_json;

    try {
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(filePath),
            model: "whisper-1",
            prompt: prompt
        });

        return transcription.text;
    } catch (error) {
        console.error('Error transcribiendo audio:', error.response?.data || error.message);
        throw error;
    }
}