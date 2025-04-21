const FlowManager = require('../../../../FlowControl/FlowManager')
const BuscarHoja = require('../../../../Utiles/Funciones/Logistica/IniciarRuta/BuscarHoja')

module.exports = async function CrearRuta(userId, data, sock) {
    // Buscar la hoja de ruta correspondiente

    const resultado = await BuscarHoja(userId, data.data.id_cab);


    if (!resultado.operacion)
    {
        await sock.sendMessage(userId, { text: resultado.msg });
        FlowManager.resetFlow(userId)
        return
    }

    hojaRuta = resultado.hojaRuta

    if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
        await sock.sendMessage(userId, { text: "⚠️ No se encontró la hoja de ruta." });
        return;
    }

    const hoja = hojaRuta.Hoja_Ruta[0];
    const { ID_CAB, Fecha, Detalles = [], Hora_Salida, Cerrado } = hoja;
    const { Chofer } = hojaRuta;

    // Construir el mensaje principal
    let output = `📋 *Detalles de la hoja de ruta seleccionada*\n\n`;
    output += `🆔 *ID:* ${ID_CAB}\n📅 *Fecha:* ${Fecha}\n 🔒 *Estado:* ${Cerrado ? "Cerrado" : "Abierto"}\n`;
    output += `\n🚛 *Chofer:* ${Chofer?.Nombre || "No asignado"}\n📞 *Teléfono:* ${Chofer?.Telefono || "No disponible"}\n🔖 *Patente:* ${Chofer?.Patente || "No disponible"}\n`;

    if (Detalles.length > 0) {
        output += `\n📦 *Entregas planificadas (${Detalles.length})*\n━━━━━━━━━━━━━━━━━━\n`;
        Detalles.forEach((det, index) => {
            output += `\n📍 *Entrega ${index + 1}*\n`;
            output += `👤 *Cliente:* ${det.Cliente || "No definido"}\n📍 *Dirección:* ${det.Direccion_Entrega || "No disponible"}\n🏘️ *Localidad:* ${det.Localidad || "No disponible"}\n📄 *Comprobante:* ${det.Comprobante?.Letra || ""}-${det.Comprobante?.Punto_Venta || ""}-${det.Comprobante?.Numero || ""}\n📞 *Teléfono:* ${det.Telefono || "No disponible"}\n`;
        });
    } else {
        output += `\n⚠️ No hay entregas cargadas en esta hoja.`;
    }

    // Enviar el mensaje con los detalles
    await sock.sendMessage(userId, { text: output });

    // Preguntar si se desea confirmar
    await sock.sendMessage(userId, {
        text: "✅ ¿Desea confirmar la hoja de ruta?\n\n1️⃣ *Sí*, confirmar\n2️⃣ *No*, salir"
    });

    // Guardar estado en el FlowManager
    FlowManager.setFlow(userId, "INICIARRUTA", "ConfirmarOModificarRuta", hojaRuta);
};



/* 
// Enviar mensaje adicional al chofer
let text = `📩 *Mensaje enviado al chofer*`;
console.log(userId);
await EnviarMensaje(userId, text, sock);
*/