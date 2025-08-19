const { getByChatGpt4o } = require("../Chatgpt/Base");

const opcion =
{
    accion: "telefono",
    data:
    {
        Telefono: "Aqui va el telefono formateado o la palabra vacia osea comillas vacias si el numero era invalido como numero de telefono"
    }
}
async function formatearTelefono(mensajeCliente) {

    prompt = `
   
    Como bot de un sistema de control de envios, quiero identificar el número de teléfono del usuario y formatearlo correctamente para su uso en el sistema.
    el formato esperado SIEMPRE va a ser un numero de telefono de Argentina, con el formato: 5491146384795 o 5491152391793.

    Advertencia:
    - Si el usuario proporciona un número de teléfono, este debe ser formateado eliminando cualquier carácter no numérico y asegurando que tenga el prefijo internacional correcto.
    - Si el usuario no proporciona un número de teléfono válido, se debe devolver en la estructura del json dada en el apartado "Telefono:" la palabra vacia "".
    -Si el telefono tiene mas 13 digitos, se debe devolver la palabra ERROR.


    Formato de respuesta: Devuelve exclusivamente un JSON modificando los datos dependiendo de la interpretación, sin incluir texto adicional.
    Dicho json debe seguir esta estructura a continuacion:
     ${JSON.stringify(opcion, null, 2)}

     El posible a formatear telefono es: ${mensajeCliente}
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
module.exports = formatearTelefono;