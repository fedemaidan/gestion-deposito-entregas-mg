const FlowManager = require('../../../../FlowControl/FlowManager')
const BuscarHoja = require('../../../../Utiles/Funciones/Logistica/IniciarRuta/BuscarHoja');

module.exports = async function CrearRuta(userId, data, sock) {
    // Buscar la hoja de ruta correspondiente
    const hojaRuta = await BuscarHoja(userId, data.data.id_cabezera);

    console.log("/*/*/*/*/*/*/**/")
    console.log(hojaRuta)

    if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
        await sock.sendMessage(userId, { text: "⚠️ No se encontró la hoja de ruta." });
        return;
    }

    // Extraer la primera hoja de ruta de la lista
    const hoja = hojaRuta.Hoja_Ruta[0];
    const { ID_CAB, Fecha, Detalles = [], Hora_Salida, Cerrado } = hoja;
    const { Cliente, Vendedor, Chofer } = hojaRuta;

    // Extraer detalles relevantes (primer elemento de la lista de detalles)
    const detalle = Detalles.length > 0 ? Detalles[0] : {};
    const { Cliente: ClienteNombre, Direccion_Entrega, Localidad } = detalle;

    // Construir el mensaje
    let output = `📋 *Detalles de la hoja de ruta seleccionada*\n\n`;
    output += `🆔 *ID:* ${ID_CAB}\n📅 *Fecha:* ${Fecha}\n🕒 *Hora de salida:* ${Hora_Salida}\n🔒 *Estado:* ${Cerrado ? "Cerrado" : "Abierto"}\n`;
    output += `\n━━━━━━━━━━━━━━━━━━\n\n`;
    output += `🚛 *Chofer:* ${Chofer?.Nombre || "No asignado"}\n📞 *Teléfono:* ${Chofer?.Telefono || "No disponible"}\n🔖 *Patente:* ${Chofer?.Patente || "No disponible"}\n`;

    // Enviar el mensaje con los detalles
    await sock.sendMessage(userId, { text: output });

    // Preguntar si se desea confirmar la hoja de ruta
    await sock.sendMessage(userId, {
        text: "✅ ¿Desea confirmar la hoja de ruta?\n\n1️⃣ *Sí*, confirmar\n2️⃣ *No*, salir"
    });

    // Configurar el flujo
    FlowManager.setFlow(userId, "INICIARRUTA", "ConfirmarOModificarRuta", hojaRuta);
};



/* 
// Enviar mensaje adicional al chofer
let text = `📩 *Mensaje enviado al chofer*`;
console.log(userId);
await EnviarMensaje(userId, text, sock);
*/