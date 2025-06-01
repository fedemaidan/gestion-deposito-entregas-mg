const enviarMensaje = require('../../../../services/EnviarMensaje/EnviarMensaje');
const FlowManager = require('../../../../FlowControl/FlowManager');
const iniciarFlowsClientes = require('../IniciarRuta/IniciarClientes');
const { guardarTelefonoLogistica } = require('../../../../services/google/Sheets/logisticaSheet');

module.exports = async function IndicarComienzo(hojaRuta, userId) {
    try {
        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Error: Hoja de ruta no proporcionada o vacía.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const { ID_CAB, Detalles = [] } = hoja;
        const { Chofer } = hojaRuta;

        if (!Detalles || Detalles.length === 0) {
            console.error("❌ Error: No hay detalles en la hoja de ruta.");
            return;
        }

        await guardarTelefonoLogistica(ID_CAB, userId.split('@')[0]);
        await enviarMensajesClientes(hojaRuta, userId);
        await enviarMensajesAVendedores(Detalles, Chofer, userId);
        await enviarMensajeChofer(Chofer, ID_CAB, Detalles);

        if (Chofer?.Telefono) {
            FlowManager.setFlow(Chofer.Telefono + "@s.whatsapp.net", "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);
        } else {
            await enviarMensaje(userId, "⚠️ No se pudo obtener la información del chofer para esta entrega. Por favor, revisar la hoja de ruta.");
            FlowManager.resetFlow(userId);
            return;
        }

        return { Success: true, id: ID_CAB };
    } catch (error) {
        console.error("❌ Error en IndicarComienzo:", error);
        return { Success: false, msg: error.message };
    }
};

async function enviarMensajesClientes(hojaRuta, userId) {
    const hoja = hojaRuta.Hoja_Ruta[0];
    const { Detalles = [] } = hoja;

    for (let i = 0; i < Detalles.length; i++) {
        const detalle = Detalles[i];
        const nombreCliente = detalle.Cliente?.trim() || "(Nombre no disponible)";
        const telefono = detalle.Telefono?.trim();

        try {
            if (telefono) {
                const mensaje = `📦 *Estimado/a ${nombreCliente},* su pedido llegará *hoy*. 📅\nLo mantendremos informado sobre su estado 🚚✨`;
                await enviarMensaje(`${telefono}@s.whatsapp.net`, mensaje);
            } else {
                const mensajeAlUsuario = `⚠️ *Falta número de teléfono del cliente:* "${nombreCliente}". No se pudo enviar el aviso.`;
                await enviarMensaje(userId, mensajeAlUsuario);
            }
        } catch (error) {
            console.error(`🛑 Error al enviar mensaje para ${nombreCliente}:`, error);
        }
    }

    await iniciarFlowsClientes(hojaRuta);
}

async function enviarMensajesAVendedores(Detalles, Chofer, userId) {
    const entregasPorVendedor = {};
    const notificadosFaltantes = new Set();

    const nombreChofer = Chofer?.Nombre || "Chofer no identificado";
    const telefonoChofer = Chofer?.Telefono || "Sin número";
    const patenteCamion = Chofer?.Patente || "No especificada";

    for (const det of Detalles) {
        const nombre = det.Vendedor;
        const telefono = det.Telefono_vendedor;
        const cliente = det.Cliente;

        if (telefono) {
            if (!entregasPorVendedor[telefono]) {
                entregasPorVendedor[telefono] = {
                    nombre,
                    clientes: new Set()
                };
            }
            entregasPorVendedor[telefono].clientes.add(cliente);
        } else if (nombre && !notificadosFaltantes.has(`${nombre}-${cliente}`)) {
            const mensajeFaltante = `⚠️ El vendedor *${nombre}* no tiene teléfono asignado en la hoja de ruta para el cliente *${cliente}*.\nSe procederá sin notificación al vendedor.`;
            await enviarMensaje(userId, mensajeFaltante);
            notificadosFaltantes.add(`${nombre}-${cliente}`);
        }
    }

    for (const [telefono, data] of Object.entries(entregasPorVendedor)) {
        const clientesTexto = Array.from(data.clientes).map(c => `• ${c}`).join("\n");
        const mensaje = `📌 *Hola ${data.nombre}*, ya está en proceso el envío de tus entregas para los siguientes clientes:\n${clientesTexto}\n\n🚚 Información del transporte:\n👤 *Chofer:* ${nombreChofer}\n📞 *Teléfono del chofer:* ${telefonoChofer}\n🚛 *Patente del camión:* ${patenteCamion}`;

        try {
            await enviarMensaje(`${telefono}@s.whatsapp.net`, mensaje);
        } catch (err) {
            console.error(`❌ Error al enviar mensaje a ${data.nombre}:`, err);
            await enviarMensaje(userId, `⚠️ No se pudo notificar al vendedor *${data.nombre}*.`);
        }
    }
}

async function enviarMensajeChofer(Chofer, ID_CAB, Detalles) {
    if (Chofer?.Telefono) {
        let mensaje = `🚛 *Hola ${Chofer.Nombre}*, tenés que realizar las siguientes entregas para la hoja *${ID_CAB}*:\n\n`;

        Detalles.forEach((detalle, index) => {
            const direccion = detalle.Direccion_Entrega || "No especificada";
            const localidad = detalle.Localidad || "No especificada";
            const cliente = detalle.Cliente || "Sin nombre";
            const vendedor = detalle.Vendedor || "Sin vendedor";
            const telefono = detalle.Telefono || detalle.Telefono_vendedor || "Sin teléfono";

            mensaje += `*${index + 1}.* 🏢 *Cliente:* ${cliente}\n`;
            mensaje += `   📍 *Dirección:* ${direccion}\n`;
            mensaje += `   🌆 *Localidad:* ${localidad}\n`;
            mensaje += `   👤 *Vendedor:* ${vendedor}\n`;
            mensaje += `   📞 *Teléfono:* ${telefono}\n\n`;
        });

        mensaje += "🚛 *Elegí tu próximo destino y manos a la obra*";
        await enviarMensaje(`${Chofer.Telefono}@s.whatsapp.net`, mensaje);
    } else {
        console.error("⚠️ No se pudo enviar mensaje al Chofer: Teléfono no disponible.");
    }
}
