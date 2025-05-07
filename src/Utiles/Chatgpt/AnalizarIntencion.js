const { getByChatGpt4o } = require("./Base");
const { obtenerUsuarioPorUserId } = require("../../services/usuario/usuarioBase");

const opciones = [
    {
        //permiso: "CREAR_RUTA",
        accion: "Crear ruta",
        descripcion: "Puesta en marcha por parte del encargado de logística para operar la hoja de ruta.",
        data: {
            id_cab: "Número de ID de la hoja de ruta a la que se hace referencia en el mensaje."
        }
    },
    {
        accion: "No comprendido",
        data: {
            Default: "El usuario envió un mensaje sin coherencia aparente."
        }
    }
];

const analizarIntencion = async (message, sender) => {
    try {
        const usuario = await obtenerUsuarioPorUserId(sender);
        const permisosUsuario = (usuario?.permisos || []).map(p => p.toUpperCase());

        console.log("😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕")
        console.log(usuario)
        console.log(permisosUsuario)
        console.log("😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕😕")

        const opcionesFiltradas = opciones.filter(op => {
            // Opción abierta si no requiere permiso
            if (!op.hasOwnProperty("permiso")) return true;

            // Validar si el usuario tiene ese permiso
            return permisosUsuario.includes(op.permiso.toUpperCase());
        });

        const opcionesTxt = JSON.stringify(opcionesFiltradas);
        const prompt = `
Como bot de un sistema de control de hojas de ruta, quiero identificar la intención del usuario y ejecutar la acción adecuada para gestionar correctamente las operaciones posibles.

Formato de respuesta: Devuelve únicamente un JSON con los datos cargados, sin incluir explicaciones adicionales.

Advertencia: Revisa cuidadosamente el mensaje del usuario y asegúrate de coincidir exactamente con todos los detalles del producto solicitado, como tamaño, color y tipo de material. No elijas productos basándote en coincidencias parciales.

Resumen del contexto: soy bot con el propósito de ayudar a una fábrica a controlar sus envíos.

El usuario dice: "${message}"

Tienes estas acciones posibles. Debes analizar la palabra clave del usuario: ${opcionesTxt}.
`;

        const response = await getByChatGpt4o(prompt);
        const respuesta = JSON.parse(response);

        return respuesta?.json_data || respuesta;

    } catch (error) {
        console.error('Error al analizar la intención:', error.message);
        return { accion: "No comprendido" };
    }
};

module.exports = { analizarIntencion };
