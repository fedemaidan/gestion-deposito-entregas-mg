const { getByChatGpt4o } = require("./Base");
const FlowManager = require('../../FlowControl/FlowManager')

const opciones = [
    {
        accion: "Crear ruta",
        descripcion: "puesta en marcha por parte del encargado de logistica para operar la hoja de ruta.",
        cargo:"logistica",
        data:
        {
           id_cabezera: "numero de id de la hoja de ruta a la que se hace referencia en el mensaje."
        }
    },
    {
        accion: "No comprendido",
        data:
        {
            Default: "El usuario envio un mensaje sin coherencia aparente.",
        }
    }
];

// Servicio para analizar la intención del mensaje
const analizarIntencion = async (message, sender) => {
    try
    {
  
        const opcionesTxt = JSON.stringify(opciones);
        prompt = `
Como bot de un sistema de control de hojas de ruta, quiero identificar la intención del usuario y ejecutar la acción adecuada para gestionar correctamente las operaciones posibles.

Formato de respuesta: Devuelve únicamente un JSON con los datos cargados, sin incluir explicaciones adicionales.

Advertencia: Revisa cuidadosamente el mensaje del usuario y asegúrate de coincidir exactamente con todos los detalles del producto solicitado, como tamaño, color y tipo de material. No elijas productos basándote en coincidencias parciales.

Resumen del contexto: soy bot bot con el proposito de ayudar a una fabrica a controlar sus envios.

El usuario dice: "${message}"

Tienes estas acciones posibles debes analizar la palabra clave del usuario: ${opcionesTxt}.
`;
        const response = await getByChatGpt4o(prompt);
        const respuesta = JSON.parse(response);

        if (respuesta.hasOwnProperty('json_data'))
        {
            return respuesta.json_data
        }
        else
        {
            return respuesta
        }
    } catch (error) {
        console.error('Error al analizar la intención:', error.message);
        return 'desconocido'; // Intención predeterminada en caso de error
    }
};

module.exports = { analizarIntencion };


/*
        esto se logra mediante hojas de ruta sin embargo cada usuario cuenta con flujos diferentes.
*/