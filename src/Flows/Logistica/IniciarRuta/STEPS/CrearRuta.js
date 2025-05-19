const FlowManager = require('../../../../FlowControl/FlowManager');
const BuscarHoja = require('../../../../Utiles/Funciones/Logistica/IniciarRuta/BuscarHoja');
const FlowService = require('../../../../services/flow/flowService');
const enviarMensaje = require('../../../../services/EnviarMensaje/EnviarMensaje');
const { enviarErrorPorWhatsapp } = require("../../../../services/Excepcion/manejoErrores");

module.exports = async function CrearRuta(userId, data) {
    try {
        const resultado = await BuscarHoja(userId, data.data.id_cab);

        if (!resultado.operacion) {
            await enviarMensaje(userId, resultado.msg);
            FlowManager.resetFlow(userId);
            return;
        }

        const hojaRuta = resultado.hojaRuta;

        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            await enviarMensaje(userId, "⚠️ No se encontró la hoja de ruta.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const { ID_CAB, Fecha, Detalles = [], Hora_Salida, Cerrado } = hoja;
        const { Chofer } = hojaRuta;

        if (!Chofer?.Telefono || Chofer.Telefono.trim() === "") {
            await enviarMensaje(userId, "🚫 No se encontró un número de teléfono válido para el chofer en esta hoja de ruta. Verificá los datos antes de continuar.");
            FlowManager.resetFlow(userId);
            return;
        }

        if (Cerrado) {
            await enviarMensaje(userId, "🚫 Esta hoja de ruta ya está cerrada y no se puede modificar.");
            FlowManager.resetFlow(userId);
            return;
        }

        if (Detalles.length === 0) {
            await enviarMensaje(userId, "🚫 La hoja de ruta no contiene entregas. Verificá que esté correctamente cargada.");
            FlowManager.resetFlow(userId);
            return;
        }

        const sinDireccion = Detalles.filter(det => !det.Direccion_Entrega || det.Direccion_Entrega.trim() === "");
        if (sinDireccion.length > 0) {
            const clientesSinDireccion = sinDireccion.map(det => `• ${det.Cliente || "Cliente sin nombre"} (ID_DET: ${det.ID_DET})`).join("\n");
            await enviarMensaje(userId, `🚫 Las siguientes entregas no tienen dirección de entrega:\n${clientesSinDireccion}\n\nNo se puede iniciar la hoja hasta que se completen esos datos.`);
            FlowManager.resetFlow(userId);
            return;
        }

        if (process.env.NODE_ENV == "production") {
            const choferPhone = Chofer?.Telefono?.replace(/\D/g, '');
            const userIdPhone = userId.split("@")[0].replace(/\D/g, '');

            if (choferPhone && choferPhone === userIdPhone) {
                await enviarMensaje(userId, `🚫 No está permitido que el chofer *(${Chofer?.Nombre})* inicie su propia hoja de ruta.\n\nSolo el área de logística puede hacer esto.`);
                FlowManager.resetFlow(userId);
                return;
            }
        }

        const choferId = `${Chofer.Telefono}@s.whatsapp.net`;
        const flowExistente = await FlowService.getFlowByUserId(choferId);

        if (flowExistente) {
            await enviarMensaje(userId, `⚠️ El chofer ${Chofer.Nombre} ya tiene una hoja abierta.`);
            FlowManager.resetFlow(userId);
            return;
        }

        let output = `📋 *Detalles de la hoja de ruta seleccionada*\n\n`;
        output += `🆔 *ID:* ${ID_CAB}\n📅 *Fecha:* ${Fecha}\n 🔒 *Estado:* ${Cerrado ? "Cerrado" : "Abierto"}\n`;
        output += `\n🚛 *Chofer:* ${Chofer?.Nombre || "No asignado"}\n📞 *Teléfono:* ${Chofer?.Telefono || "No disponible"}\n🔖 *Patente:* ${Chofer?.Patente || "No disponible"}\n`;

        if (Detalles.length > 0) {
            output += `\n📦 *Entregas planificadas (${Detalles.length})*\n━━━━━━━━━━━━━━━━━━\n`;
            Detalles.forEach((det, index) => {
                const telefonoVendedor = det.Telefono_vendedor?.trim() || "No especificado";
                output += `\n📍 *Entrega ${index + 1}*\n`;
                output += `👤 *Cliente:* ${det.Cliente || "No definido"}\n`;
                output += `📍 *Dirección:* ${det.Direccion_Entrega || "No disponible"}\n`;
                output += `🏘️ *Localidad:* ${det.Localidad || "No disponible"}\n`;
                output += `📄 *Comprobante:* ${det.Comprobante?.Letra || ""}-${det.Comprobante?.Punto_Venta || ""}-${det.Comprobante?.Numero || ""}\n`;
                output += `📞 *Teléfono Cliente:* ${det.Telefono || "No disponible"}\n`;
                output += `📞 *Teléfono Vendedor:* ${telefonoVendedor}\n`;
            });
        } else {
            output += `\n⚠️ No hay entregas cargadas en esta hoja.`;
        }

        await enviarMensaje(userId, output);
        await enviarMensaje(userId, "✅ ¿Desea confirmar la hoja de ruta?\n\n1️⃣ *Sí*, confirmar\n2️⃣ *No*, salir");

        FlowManager.setFlow(userId, "INICIARRUTA", "ConfirmarOModificarRuta", hojaRuta);

    } catch (error) {
        console.error("❌ Error en CrearRuta:", error);
        await enviarMensaje(userId, "🚫 Ocurrió un error al intentar crear la ruta.");
        await enviarErrorPorWhatsapp(error, "metal grande");
        FlowManager.resetFlow(userId);
    }
};
