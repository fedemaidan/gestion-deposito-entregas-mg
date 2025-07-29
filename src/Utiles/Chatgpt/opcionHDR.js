const { getByChatGpt4o } = require("../Chatgpt/Base");

const opcion =
{
    accion: "Confirmar",
    data:
    {
        Eleccion: "El interpreta como 1 para reiniciar todo incluida la hoja de ruta, continuar, acepto, (Emoji manito arriba) etc, 2 para solo eliminar o liberar los roles ,3 para cancelar la operacon, cancelar, detener, para, no sigas."
    }
}
async function opcionHDR(mensajeCliente) {

    prompt = `
Como bot de un sistema de control de stock, quiero identificar la intención del usuario y ejecutar la acción adecuada para gestionar correctamente la confirmación o cancelación de pedidos.

Formato de respuesta: Devuelve exclusivamente un JSON modificando los datos dependiendo de la interpretación, sin incluir texto adicional.

Advertencia:
- Si el usuario responde con "1", "toda HDR", "Todo", "👍", "✅", "✔️" o números con emojis (ej. "1️⃣"), se interpretará como confirmación y se debe asignar el valor numérico 1 en el campo "Eleccion".
- Si el usuario responde con "2", "solo roles", "liberar los numeros de telefono", "no modificar la hoja" o números con emojis (ej. "2️⃣"), se interpretará como solo roles y se debe asignar el valor numérico 2 en el campo "Eleccion".
- Si el usuario responde con "3", "No", "Cancelar", "Rechazar", "👎", "❌", "✖️" o números con emojis (ej. "3️⃣"), se interpretará como cancelación y se debe asignar el valor numérico 3 en el campo "Eleccion".
Resumen del contexto: Soy un bot encargado de gestionar el stock de productos y validar la intención del usuario con respecto a la confirmación o cancelación de pedidos.

El usuario dice: "${mensajeCliente}"

Formato de respuesta esperado (EXCLUSIVAMENTE JSON, sin texto adicional):
${JSON.stringify(opcion, null, 2)}
`;

    const response = await getByChatGpt4o(prompt);
    const respuesta = JSON.parse(response);

    if (respuesta.hasOwnProperty('json_data')) {
        return respuesta.json_data
    }
    else {
        return respuesta
    }
}
module.exports = opcionHDR;