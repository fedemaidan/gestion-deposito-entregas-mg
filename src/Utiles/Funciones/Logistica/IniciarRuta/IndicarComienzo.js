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
    const nombreChofer = (hojaRuta.Chofer?.Nombre?.trim().replace(":", "") || "(Chofer no disponible)");
    const patente = hojaRuta.Chofer?.Patente?.trim() || "(Patente no disponible)";

    // Fecha dinámica: "jueves 11 de julio"
    const fechaHoy = new Date().toLocaleDateString('es-AR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });

    for (let i = 0; i < Detalles.length; i++) {
        const detalle = Detalles[i];
        const nombreCliente = detalle.Cliente?.trim() || "(Nombre no disponible)";
        const telefono = detalle.Telefono?.trim();

        try {
            if (telefono) {
                // Mensaje principal
                const mensaje = `¡Hola *${nombreCliente}*! 🤖 Soy *metaliA*, asistente virtual de logística de *METALGRANDE*.
Tu pedido *${detalle.Comprobante?.Letra || ''}-${detalle.Comprobante?.Punto_Venta || ''}-${detalle.Comprobante?.Numero || ''}* está programado para ser entregado *hoy* 🗓️ en *${detalle.Direccion_Entrega || "(Dirección no disponible)"}*.
🚚 Entrega a cargo de:
* Chofer: *${nombreChofer}*
* Patente: *${patente}*`;

                // Mensaje adicional
                const mensajeExtra = `⚠️ Recordá que debés contar con personal/maquinaria idónea para la descarga del material.
En caso de que no puedas recibir tu pedido, por favor contactá a tu vendedor asignado para reprogramar la entrega.
👤 *Vendedor:* ${detalle.Vendedor || "No informado"}
📞 *Celular:* ${detalle.Telefono_vendedor || "No disponible"}`;

                await enviarMensaje(`${telefono}@s.whatsapp.net`, mensaje);
                await enviarMensaje(`${telefono}@s.whatsapp.net`, mensajeExtra);
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
        const nombre = det.Vendedor?.trim();
        const telefono = det.Telefono_vendedor?.trim();
        const cliente = det.Cliente;
        const comprobante = `${det.Comprobante?.Letra || ''} ${det.Comprobante?.Punto_Venta || ''}-${det.Comprobante?.Numero || ''}`;
        const celularCliente = det.Telefono?.trim() || "Sin número";

        if (nombre) {
            if (!entregasPorVendedor[nombre]) {
                entregasPorVendedor[nombre] = {
                    telefono,
                    entregas: []
                };
            }
            entregasPorVendedor[nombre].entregas.push({
                cliente,
                comprobante,
                celularCliente
            });

            // Actualizar teléfono si antes estaba vacío
            if (!entregasPorVendedor[nombre].telefono && telefono) {
                entregasPorVendedor[nombre].telefono = telefono;
            }

        } else if (!notificadosFaltantes.has(cliente)) {
            const mensajeFaltante = `⚠️ No se pudo identificar al vendedor para el cliente *${cliente}*.`;
            await enviarMensaje(userId, mensajeFaltante);
            notificadosFaltantes.add(cliente);
        }
    }

    for (const [nombre, data] of Object.entries(entregasPorVendedor)) {
        const entregasTexto = data.entregas.map(e =>
            `* 🏢 ${e.cliente} - 📄 ${e.comprobante} - 📞 Celular: ${e.celularCliente}`
        ).join("\n");

        const mensaje = `📌 Hola *${nombre}*. Ya está en proceso el envío de tus entregas para los siguientes clientes:\n${entregasTexto}\n\n🚚 Información del transporte:\n👤 *Chofer:* ${nombreChofer}\n📞 *Teléfono del chofer:* ${telefonoChofer}\n🚛 *Patente del camión:* ${patenteCamion}`;

        if (data.telefono) {
            try {
                await enviarMensaje(`${data.telefono}@s.whatsapp.net`, mensaje);
            } catch (err) {
                console.error(`❌ Error al enviar mensaje a ${nombre}:`, err);
                await enviarMensaje(userId, `⚠️ No se pudo notificar al vendedor *${nombre}*.`);
            }
        } else {
            await enviarMensaje(userId, `⚠️ No se pudo enviar mensaje a *${nombre}* porque no tiene teléfono asignado.`);
        }
    }
}

async function enviarMensajeChofer(Chofer, ID_CAB, Detalles) {
    if (Chofer?.Telefono) {
        let mensaje = `🚛 Hola *${Chofer.Nombre}*. Fuiste asignado a la Hoja de Ruta *${ID_CAB}* que incluye las siguientes entregas:\n\n`;

        Detalles.forEach((detalle, index) => {
            const cliente = detalle.Cliente || "Sin nombre";
            const celular = detalle.Telefono?.trim() || "Sin teléfono";
            const direccion = detalle.Direccion_Entrega || "No especificada";
            const localidad = detalle.Localidad || "No especificada";
            const vendedor = detalle.Vendedor || "Sin vendedor";
            const comprobante = `${detalle.Comprobante?.Letra || ''} ${detalle.Comprobante?.Punto_Venta || ''}-${detalle.Comprobante?.Numero || ''}`;

            mensaje += `${index + 1}. 🏢 *Cliente:* ${cliente}\n`;
            mensaje += `   📞 *Celular:* ${celular}\n`;
            mensaje += `   📍 *Dirección:* ${direccion}\n`;
            mensaje += `   🌆 *Localidad:* ${localidad}\n`;
            mensaje += `   👤 *Vendedor:* ${vendedor}\n`;
            mensaje += `   🧾 *Comprobante:* ${comprobante}\n\n`;
        });

        mensaje += `🚛 Por favor indicá cuál será tu primer entrega.`;
        await enviarMensaje(`${Chofer.Telefono}@s.whatsapp.net`, mensaje);
    } else {
        console.error("⚠️ No se pudo enviar mensaje al Chofer: Teléfono no disponible.");
    }
}
