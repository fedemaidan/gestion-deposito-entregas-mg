const FlowManager = require('../../../../FlowControl/FlowManager')
const BuscarHoja = require('../../../../Utiles/Funciones/Logistica/IniciarRuta/BuscarHoja')
const FlowService = require('../../../../services/flow/flowService')
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
    //------------------------------------------------------------------------------------------
    // 🔍 VALIDACIONES ANTES DE CONTINUAR
    // 1. Que no esté cerrada la hoja de ruta
    if (Cerrado) {
        await sock.sendMessage(userId, { text: "🚫 Esta hoja de ruta ya está cerrada y no se puede modificar." });
        FlowManager.resetFlow(userId);
        return;
    }

    // 2. Que tenga al menos un detalle
    if (Detalles.length === 0) {
        await sock.sendMessage(userId, { text: "🚫 La hoja de ruta no contiene entregas. Verificá que esté correctamente cargada." });
        FlowManager.resetFlow(userId);
        return;
    }

    // 3. Que todas las entregas tengan dirección
    const sinDireccion = Detalles.filter(det => !det.Direccion_Entrega || det.Direccion_Entrega.trim() === "");
    if (sinDireccion.length > 0) {
        const clientesSinDireccion = sinDireccion.map(det => `• ${det.Cliente || "Cliente sin nombre"} (ID_DET: ${det.ID_DET})`).join("\n");
        await sock.sendMessage(userId, {
            text: `🚫 Las siguientes entregas no tienen dirección de entrega:\n${clientesSinDireccion}\n\nNo se puede iniciar la hoja hasta que se completen esos datos.`
        });
        FlowManager.resetFlow(userId);
        return;
    }

    if (process.env.Dev_mode === "false") {          
    // 4. ❌ El chofer NO PUEDE iniciar su propia hoja de ruta (es ilegal)
    const choferPhone = Chofer?.Telefono?.replace(/\D/g, '');
    const userIdPhone = userId.split("@")[0].replace(/\D/g, '');

    if (choferPhone && choferPhone === userIdPhone) {
        await sock.sendMessage(userId, {
            text: `🚫 No está permitido que el chofer *(${Chofer?.Nombre})* inicie su propia hoja de ruta.\n\nSolo el área de logística puede hacer esto.`
        });
        FlowManager.resetFlow(userId);
        return;
    }
    //------------------------------------------------------------------------------------------
    }  

    // ACA CHAT VA EL IF CON EL TELEFONO DEL CHOFER:
    const choferId = `${Chofer.Telefono}@s.whatsapp.net`;
    const flowExistente = await FlowService.getFlowByUserId(choferId);

    if (flowExistente) {
        await sock.sendMessage(userId, { text: `⚠️ El chofer ${Chofer.Nombre} ya tiene una hoja abierta..` });
        FlowManager.resetFlow(userId)
        return;
    }
    //------------------------------------------------------------


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