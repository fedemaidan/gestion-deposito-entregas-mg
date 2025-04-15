const enviarMensaje = require('../IniciarRuta/EnviarMensaje');
const FlowManager = require('../../../../FlowControl/FlowManager');

module.exports = async function IndicarComienzo(hojaRuta, sock) {
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

        await enviarMensajesClientes(Detalles, sock);
        await enviarMensajeVendedor(Vendedor, ID_CAB, Detalles, sock);
        await enviarMensajeChofer(Chofer, ID_CAB, Detalles, hojaRuta, sock);

        console.log("✅ Todos los mensajes han sido enviados correctamente.");
        //SOY EL CHOFER MANITO

        FlowManager.setFlow(Chofer.Telefono + "@s.whatsapp.net", "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);

        return { Success: true, id: ID_CAB };
    } catch (error) {
        console.error("❌ Error en IndicarComienzo:", error);
        return { Success: false, msg: error.message };
    }
};

// 🧩 Función interna: mensaje a cada cliente
async function enviarMensajesClientes(Detalles, sock) {
    for (const detalle of Detalles) {
        if (detalle.Telefono) {
            const mensaje = `📦 *Estimado/a ${detalle.Cliente},* su pedido llegará *hoy*. 📅\nLo mantendremos informado sobre su estado 🚚✨`;
            await enviarMensaje(detalle.Telefono + "@s.whatsapp.net", mensaje, sock);
        } else {
            console.warn(`⚠️ Teléfono no disponible para el cliente ${detalle.Cliente}`);
        }
    }
}

// 🧩 Función interna: mensaje al vendedor
async function enviarMensajeVendedor(Vendedor, ID_CAB, Detalles, sock) {
    if (Vendedor?.Telefono) {
        const clientes = [...new Set(Detalles.map(d => d.Cliente))].join(", ");
        const mensaje = `📌 *Atención ${Vendedor.Nombre}*, la hoja *${ID_CAB}* ya está en proceso de envío con entregas a los siguientes clientes: *${clientes}*. 📦✅`;
        await enviarMensaje(Vendedor.Telefono + "@s.whatsapp.net", mensaje, sock);
    } else {
        console.error("⚠️ No se pudo enviar mensaje al Vendedor: Teléfono no disponible.");
    }
}

// 🧩 Función interna: mensaje al chofer + guardar estado
async function enviarMensajeChofer(Chofer, ID_CAB, Detalles, hojaRuta, sock) {
    if (Chofer?.Telefono) {
        let mensaje = `🚛 *Hola ${Chofer.Nombre}*, tenés que realizar las siguientes entregas para la hoja *${ID_CAB}*:\n\n`;

        Detalles.forEach((detalle, index) => {
            mensaje += `${index + 1}. 📍 *Dirección:* ${detalle.Direccion_Entrega || "No especificada"}, *Localidad:* ${detalle.Localidad || "No especificada"}\n`;
        });

        mensaje += "\n🚛 *Elegí tu próximo destino y manos a la obra*";
        await enviarMensaje(Chofer.Telefono + "@s.whatsapp.net", mensaje, sock);

        console.log("ENTRO AL ENVIAR MENSAJE DEL CHOFER Y GUARDO EL ESTADO BIEN")

    

    } else {
        console.error("⚠️ No se pudo enviar mensaje al Chofer: Teléfono no disponible.");
    }
}



