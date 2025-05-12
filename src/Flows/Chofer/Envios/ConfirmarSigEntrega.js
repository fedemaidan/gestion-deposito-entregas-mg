const FlowManager = require('../../../FlowControl/FlowManager');
const opcionElegida = require("../../../Utiles/Chatgpt/opcionElegida");
const enviarMensaje = require("../../../Utiles/Funciones/Logistica/IniciarRuta/EnviarMensaje");
const { IndicarActual } = require("../../../services/google/Sheets/hojaDeruta");


module.exports = async function ConfirmarSigEntrega(userId, message, sock) {
    await FlowManager.getFlow(userId);
    const hojaRuta = FlowManager.userFlows[userId]?.flowData;
    const data = await opcionElegida(message);

    const hoja = hojaRuta.Hoja_Ruta?.[0];

    switch (data.data.Eleccion) {
        case 1:
            // ✅ Confirmado, evitar que el timeout actúe y guardamos para que la funcion timeout tenga la referencia fresca.
            hojaRuta.confirmado = true;
            FlowManager.setFlow(userId, "ENTREGACHOFER", "SecuenciaEntrega", hojaRuta);

            await sock.sendMessage(userId, { text: "🚛 Continuamos con la entrega." });

            const detalleSeleccionado = hoja?.Detalle_Actual?.[0];

            if (!hoja || !detalleSeleccionado) {
                await sock.sendMessage(userId, { text: "⚠️ No se encontró la entrega actual. Intentá de nuevo o contactá soporte." });
                return;
            }

           

            // Enviar mensaje al chofer con instrucciones de resultado
            await sock.sendMessage(userId, {
                text: 'Cuando la entrega finalice, indícalo enviando un mensaje con el resultado de la entrega:\n1️⃣ Entregado OK ✅\n2️⃣ Entregado NOK ⚠️\n3️⃣ Rechazado ❌\n4️⃣ Cancelado 🚫'
            });

            // Marcar como entrega actual en Google Sheets
            await IndicarActual(hoja.ID_CAB, detalleSeleccionado.ID_DET);

            // Notificar al cliente si tiene teléfono
            if (detalleSeleccionado.Telefono) {
                const telefonoCliente = detalleSeleccionado.Telefono;
                const mensajeCliente = "📦 *Tu entrega ya está en camino.*\nNos estaremos comunicando en breve. ¡Gracias por tu paciencia!";
                await enviarMensaje(telefonoCliente + "@s.whatsapp.net", mensajeCliente, sock);
            }

            // Avanzar al siguiente paso
            FlowManager.setFlow(userId, "ENTREGACHOFER", "SecuenciaEntrega", hojaRuta);
            break;

        case 2:
        case 3:
            await sock.sendMessage(userId, { text: "❌ *Cambiando destino*" });

            const choferTelefono = hojaRuta.Chofer?.Telefono;

            if (!hoja || !choferTelefono) {
                await sock.sendMessage(userId, { text: "⚠️ No se pudo recuperar la hoja de ruta o el número del chofer." });
                return;
            }

            // Mover el detalle actual devuelta al listado general
            if (hoja.Detalle_Actual && hoja.Detalle_Actual.length > 0) {
                hoja.Detalles.unshift(...hoja.Detalle_Actual);
                hoja.Detalle_Actual = [];
            }

            // Generar mensaje con listado de entregas (incluyendo la actual reintegrada)
            let mensaje = `📋 *Listado de Entregas Pendientes*\n\n`;
            hoja.Detalles.forEach((detalle, index) => {
                mensaje += `${index + 1}. 📍 *Dirección:* ${detalle.Direccion_Entrega || "No especificada"}, *Localidad:* ${detalle.Localidad || "No especificada"}\n`;
            });

            mensaje += `\n🚛 *Elegí tu próximo destino y manos a la obra* \n🛠️ ¿Querés cambiar algo? Respondé con *MODIFICAR* o *CORREGIR*.`;

            await enviarMensaje(choferTelefono + "@s.whatsapp.net", mensaje, sock);

            // Apuntar nuevamente a PrimeraEleccionEntrega
            FlowManager.setFlow(userId, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);
            break;

        default:
            await sock.sendMessage(userId, { text: "Disculpá, no entendí tu elección. Por favor respondé nuevamente." });
            break;
    }
};
