const { getByChatGpt4o } = require("../../Chatgpt/Base");


const opcion =
{
    accion: "Confirmar",
    data:
    {
        Eleccion: "El interpreta como 1 para Si, continuar, acepto, (Emoji manito arriba) etc, 2 para no, detener, para, No (emoji manito abajo) etc,3 para cancelar la operacon, cancelar, detener, para, no sigas."
    }
};

async function opcionElegida(mensajeCliente) {

        prompt = `
Como bot de un sistema de entregas, quiero identificar la intención del usuario y ejecutar la acción adecuada para registrar el estado de una entrega.

Formato de respuesta: Devuelve exclusivamente un JSON modificando los datos dependiendo de la interpretación, sin incluir texto adicional.

Advertencia:
- Si el usuario responde con "1", "Sí", "Entregado", "Entregado OK", "EntregaOk", "Entrega OK", "👍", "✅", "✔️", "1️⃣", se interpretará como *entrega exitosa* y se debe asignar el valor "1" en el campo "Eleccion".
- Si el usuario responde con "2", "Entregado mal", "Entregado NOK", "EntregadoNok", "Problema", "Reclamo", "❌", "2️⃣", se interpretará como *entregado con problemas* y se debe asignar el valor "2" en el campo "Eleccion".
- Si el usuario responde con "3", "No entregado", "No se entregó", "Fallo", "No pudo ser", "🚫", "3️⃣", se interpretará como *no entregado* y se debe asignar el valor "3" en el campo "Eleccion".
- Si el usuario responde con "4", "Reprogramar", "Más tarde", "Otro día", "Reprogramado", "🔁", "4️⃣", se interpretará como *reprogramado* y se debe asignar el valor "4" en el campo "Eleccion".

Resumen del contexto: Soy un bot encargado de registrar el resultado de una entrega y necesito identificar claramente el estado de la misma según lo que dice el usuario.

El usuario dice: "${mensajeCliente}"

Formato de respuesta esperado (EXCLUSIVAMENTE JSON, sin texto adicional):
${JSON.stringify(opcion, null, 2)}
`;
        const response = await getByChatGpt4o(prompt);
        const respuesta = JSON.parse(response);

        if (respuesta.hasOwnProperty('json_data')) {
            return respuesta.json_data;
        } else {
            return respuesta;
        }
}

module.exports = opcionElegida;
