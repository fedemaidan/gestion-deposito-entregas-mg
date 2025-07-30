const FlowManager = require('../../../FlowControl/FlowManager');
const opcionElegida = require("../../../Utiles/Chatgpt/opcionElegida");
const enviarMensaje = require("../../../services/EnviarMensaje/EnviarMensaje");
const { IndicarActual } = require("../../../services/google/Sheets/hojaDeruta");

module.exports = async function ConfirmarSigEntrega(userId, message) {
    await FlowManager.getFlow(userId);
    const hojaRuta = FlowManager.userFlows[userId]?.flowData;
    const data = await opcionElegida(message);
    const hoja = hojaRuta?.Hoja_Ruta?.[0];

    switch (data.data.Eleccion) {
        case 1:
            hojaRuta.confirmado = true;
            FlowManager.setFlow(userId, "ENTREGACHOFER", "SecuenciaEntrega", hojaRuta);

            await enviarMensaje(userId, "🚛 Continuamos con la entrega.");

            const detalleSeleccionado = hoja?.Detalle_Actual?.[0];
            if (!hoja || !detalleSeleccionado) {
                await enviarMensaje(userId, "⚠️ No se encontró la entrega actual. Intentá de nuevo o contactá soporte.");
                return;
            }

            await enviarMensaje(userId,
                'Cuando la entrega finalice, indícalo enviando un mensaje con el resultado de la entrega:\n' +
                '1️⃣ Entregado OK ✅\n2️⃣ Entregado NOK ⚠️\n3️⃣ No entregado ❌\n4️⃣ Reprogramado 🔁'
            );

            await IndicarActual(hoja.ID_CAB, detalleSeleccionado.ID_DET,hojaRuta);

            if (detalleSeleccionado.Telefono) {
                const telefonoCliente = detalleSeleccionado.Telefono;
                const mensajeCliente = "📦 ¡Tu entrega es la próxima! Asegurate de tener personal para la descarga. ¡Gracias! ";
                await enviarMensaje(telefonoCliente + "@s.whatsapp.net", mensajeCliente);
            }

            FlowManager.setFlow(userId, "ENTREGACHOFER", "SecuenciaEntrega", hojaRuta);
            break;
        case 2:
        case 3:
            await enviarMensaje(userId, "🔀 Seleccionaste *cambiar destino*");

            const choferTelefono = hojaRuta.Chofer?.Telefono;
            if (!hoja || !choferTelefono) {
                await enviarMensaje(userId, "⚠️ No se pudo recuperar la hoja de ruta o el número del chofer.");
                return;
            }

            // Devolver la entrega actual al listado
            if (hoja.Detalle_Actual && hoja.Detalle_Actual.length > 0) {
                hoja.Detalles.unshift(...hoja.Detalle_Actual);
                hoja.Detalle_Actual = [];
            }

            // Mostrar los nuevos destinos disponibles
            let mensaje = "🧭 *Destinos disponibles:*\n\n";
            hoja.Detalles.forEach((detalle, index) => {
                const direccion = detalle.Direccion_Entrega || "No especificada";
                const localidad = detalle.Localidad || "No especificada";
                const cliente = detalle.Cliente || "Sin nombre";
                const vendedor = detalle.Vendedor || "Sin vendedor";
                const telefono = detalle.Telefono?.trim() || detalle.Telefono_vendedor?.trim() || "Sin teléfono";
                const comprobante = `${detalle.Comprobante?.Letra || ''} ${detalle.Comprobante?.Punto_Venta || ''}-${detalle.Comprobante?.Numero || ''}`.trim();

                mensaje += `${index + 1}. 🏢 *Cliente:* ${cliente}\n`;
                mensaje += `   📞 *Celular:* ${telefono}\n`;
                mensaje += `   📍 *Dirección:* ${direccion}\n`;
                mensaje += `   🌆 *Localidad:* ${localidad}\n`;
                mensaje += `   👤 *Vendedor:* ${vendedor}\n`;
                mensaje += `   🧾 *Comprobante:* ${comprobante || "No informado"}\n\n`;
            });

            mensaje += "🚛 *Por favor indicá cuál será tu próxima entrega.*";
            await enviarMensaje(`${choferTelefono}@s.whatsapp.net`, mensaje);

            FlowManager.setFlow(userId, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);
            break;

        default:
            await enviarMensaje(userId, "Disculpá, no entendí tu elección. Por favor respondé nuevamente.");
            break;
    }
};
