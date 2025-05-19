const enviarMensaje = require('../../../../services/EnviarMensaje/EnviarMensaje');
const FlowManager = require('../../../../FlowControl/FlowManager');
const iniciarFlowsClientes = require('../IniciarRuta/IniciarClientes');
const { guardarTelefonoLogistica } = require('../../../../services/google/Sheets/logisticaSheet');

module.exports = async function IndicarComienzo(hojaRuta,userId) {
    try {
        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Error: Hoja de ruta no proporcionada o vacía.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const { ID_CAB, Detalles = [] } = hoja;
        const { Vendedor, Chofer } = hojaRuta;

        if (!Detalles || Detalles.length === 0) {
            console.error("❌ Error: No hay detalles en la hoja de ruta.");
            return;
        }

        console.log("UserID:", userId);
        console.log("slipt:", userId.split('@')[0]);
        
        await guardarTelefonoLogistica(ID_CAB, userId.split('@')[0]);
        await enviarMensajesClientes(Detalles, userId);
        await enviarMensajesAVendedores(Detalles, userId);
        await enviarMensajeChofer(Chofer, ID_CAB, Detalles);

        console.log("✅ Todos los mensajes han sido enviados correctamente.");
        //SOY EL CHOFER MANITO

        // 
        if (Chofer.Telefono) {
            FlowManager.setFlow(Chofer.Telefono + "@s.whatsapp.net", "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);
        }
        else
        {
            await enviarMensaje(userId, "⚠️ No se pudo obtener la información del chofer para esta entrega. Por favor, revisar la hoja de ruta.");
            FlowManager.resetFlow(userId);
            return
        }

        return { Success: true, id: ID_CAB };
    } catch (error) {
        console.error("❌ Error en IndicarComienzo:", error);
        return { Success: false, msg: error.message };
    }
};

// 🧩 Función interna: mensaje a cada cliente
async function enviarMensajesClientes(hojaRuta, userId) {
    if (!hojaRuta?.Hoja_Ruta?.length) {
        console.warn("⚠️ Hoja de ruta no tiene datos de entregas.");
        return;
    }

    const hoja = hojaRuta.Hoja_Ruta[0];
    const { Detalles = [] } = hoja;

    for (const detalle of Detalles) {
        if (detalle.Telefono) {
            const mensaje = `📦 *Estimado/a ${detalle.Cliente},* su pedido llegará *hoy*. 📅\nLo mantendremos informado sobre su estado 🚚✨`;
            await enviarMensaje(`${detalle.Telefono}@s.whatsapp.net`, mensaje);
        } else {
            console.warn(`⚠️ Teléfono no disponible para el cliente ${detalle.Cliente}`);
            const mensajeAlUsuario = `⚠️ *Falta número de teléfono del cliente:* "${detalle.Cliente}". No se pudo enviar el aviso.`;
            await enviarMensaje(userId, mensajeAlUsuario);
        }
    }

    await iniciarFlowsClientes(hojaRuta); // ✅ se pasa la hoja completa
}

async function enviarMensajesAVendedores(Detalles, userId) {
    // Agrupar entregas por vendedor
    const entregasPorVendedor = {};
    const notificadosFaltantes = new Set();

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
            // Notificar a logística si hay un vendedor sin teléfono
            const mensajeFaltante = `⚠️ El vendedor *${nombre}* no tiene teléfono asignado en la hoja de ruta para el cliente *${cliente}*.\nSe procederá sin notificación al vendedor.`;
            await enviarMensaje(userId, mensajeFaltante);
            notificadosFaltantes.add(`${nombre}-${cliente}`);
        }
    }

    // Enviar mensaje a cada vendedor válido
    for (const [telefono, data] of Object.entries(entregasPorVendedor)) {
        const clientesTexto = Array.from(data.clientes).join(", ");
        const mensaje = `📌 *Hola ${data.nombre}*, ya está en proceso el envío de tus entregas para los siguientes clientes: *${clientesTexto}*. 📦✅`;

        try {
            await enviarMensaje(telefono + "@s.whatsapp.net", mensaje);
        } catch (err) {
            console.error(`❌ Error al enviar mensaje a ${data.nombre}:`, err);
            await enviarMensaje(userId, `⚠️ No se pudo notificar al vendedor *${data.nombre}*.`);
        }
    }
}

// 🧩 Función interna: mensaje al chofer + guardar estado
async function enviarMensajeChofer(Chofer, ID_CAB, Detalles) {
    if (Chofer?.Telefono) {
        let mensaje = `🚛 *Hola ${Chofer.Nombre}*, tenés que realizar las siguientes entregas para la hoja *${ID_CAB}*:\n\n`;

        Detalles.forEach((detalle, index) => {
            mensaje += `${index + 1}. 📍 *Dirección:* ${detalle.Direccion_Entrega || "No especificada"}, *Localidad:* ${detalle.Localidad || "No especificada"}\n`;
        });

        mensaje += "\n🚛 *Elegí tu próximo destino y manos a la obra*";
        await enviarMensaje(Chofer.Telefono + "@s.whatsapp.net", mensaje);

        console.log("ENTRO AL ENVIAR MENSAJE DEL CHOFER Y GUARDO EL ESTADO BIEN")
    } else {
        console.error("⚠️ No se pudo enviar mensaje al Chofer: Teléfono no disponible.");
    }
}



