const { getByChatGpt4o } = require("./Base");
const { obtenerUsuarioPorUserId } = require("../../services/usuario/usuarioBase");

const opciones = [ 
    {
        accion: "Confirmar",
        data: {
            Eleccion: "eleccion del usuario."
        }
    }
];

const OpcionEntrega = async (message, sender) => {
    try {
        const prompt = `
Sos un bot que identifica la intención del usuario y responde con una estructura de datos predeterminada.

⚠️ *Formato obligatorio*: Devuelve **únicamente** un objeto JSON EXACTAMENTE con esta estructura (sin explicaciones, sin comentarios, sin texto adicional):

${JSON.stringify(opciones, null, 2)}

Donde *valor* debe ser:
- Un número (si el usuario eligió un número, como "1", "2", etc.)
- La palabra "MODIFICAR" (si el usuario dijo "modificar", "corregir", "cambiar", o sinónimos)

📌 Requisitos:
- NO devuelvas ningún texto adicional.
- NO modifiques la estructura del JSON.
- NO cambies el nombre de las claves ni uses minúsculas.
- Si el mensaje no se entiende, devolvé el campo *Eleccion* con null.

El usuario dice: "${message}"
`;

        const response = await getByChatGpt4o(prompt);
        const respuesta = JSON.parse(response);


        return respuesta?.json_data || respuesta;

    } catch (error) {
        console.error('Error al analizar la intención:', error.message);
        return { accion: "No comprendido" };
    }
};

module.exports =  OpcionEntrega;
