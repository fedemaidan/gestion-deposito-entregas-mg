const { getByChatGpt4o } = require("./Base");

const opciones = [
    {
        Opcion: "respuesta de chat gpt aca",
        accion: "Replica",
        descripcion: "El usuario a escrito o un numero o una palabra clave debes replicarla en Opcion"
    },
];

const AnalizarModificacion = async (message) => {
    try {

        const opcionesTxt = JSON.stringify(opciones, null, 2);

        const prompt = `
Sos un bot de logística. Tu tarea es analizar el mensaje del usuario para saber qué acción desea realizar con respecto a una entrega ya completada.

Las opciones disponibles son:

${opcionesTxt}

El usuario escribió: "${message}"

Analiza la intencion y responde de manera coherente eligiendo la opcion adecuada. ⚠️ Respondé solamente con un JSON como este: { "Opcion": número_correspondiente }
SI el mensaje dice Cancelar o Cancelar Modificación o parecidos, devuelve { "Opcion": CANCELAR }.

No incluyas explicaciones ni texto adicional.
`;

        const response = await getByChatGpt4o(prompt);
        const respuesta = JSON.parse(response);

        console.log("Respuesta de ChatGPT:", respuesta);

        return respuesta?.json_data || respuesta;

    } catch (error) {
        console.error('Error al analizar la intención:', error.message);
        return { Opcion: -1 }; // -1 para "no comprendido"
    }
};

module.exports = { AnalizarModificacion };
