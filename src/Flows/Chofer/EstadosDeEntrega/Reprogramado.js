const FlowManager = require('../../../FlowControl/FlowManager');
const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');
const EnviarSiguienteEntrega = require('../../../Utiles/Funciones/Chofer/EnviarSiguienteEntrega');
const { actualizarDetalleActual } = require('../../../services/google/Sheets/hojaDeruta');
const RevisarDatos = require('../../../Utiles/Funciones/Chofer/RevisarDatos');
const { enviarErrorPorWhatsapp } = require("../../../services/Excepcion/manejoErrores");

module.exports = async function Reprogramado(userId, message) {
    try {
        await FlowManager.getFlow(userId);
        const hojaRuta = FlowManager.userFlows[userId]?.flowData;

        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Hoja de ruta vacía o no encontrada.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const { Detalle_Actual = [], Detalles_Completados = [] } = hoja;

        if (Detalle_Actual.length === 0) {
            await enviarMensaje(userId, "⚠️ No hay entrega activa para reprogramar. Por favor, seleccioná una entrega primero.");
            return;
        }

        const detalle = Detalle_Actual[0];

        // 📦 Obtener datos actualizados
        const datosActualizados = await RevisarDatos(detalle.ID_DET, hoja.ID_CAB);

        if (datosActualizados) {
            detalle.Telefono = datosActualizados.cliente.telefono || detalle.Telefono;
            detalle.Cliente = datosActualizados.cliente.nombre || detalle.Cliente;
            detalle.Telefono_vendedor = datosActualizados.vendedor.telefono || detalle.Telefono_vendedor;
        }

        // Guardar motivo de reprogramación
        detalle.Observaciones = message;

        // 🔄 Actualizar hoja en Sheets
        await actualizarDetalleActual(hojaRuta);

        hoja.Detalle_Actual = [];
        hoja.Detalles_Completados.push(detalle);

        FlowManager.setFlow(userId, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);

        // ✅ MENSAJES

        const comprobante = `${detalle.Comprobante?.Letra || ''} ${detalle.Comprobante?.Punto_Venta || ''}-${detalle.Comprobante?.Numero || ''}`;
        const nombreChofer = hojaRuta.Chofer?.Nombre || "No informado";
        const aclaracion = detalle.Observaciones || "Sin motivo especificado.";

        // Chofer
        await enviarMensaje(userId, "🔁 La entrega fue marcada como *reprogramada*.");

        // Vendedor
        const nombreVendedor = detalle.Vendedor || "Vendedor sin nombre";
const mensajeVendedor = `🔁 *ATENCIÓN ${nombreVendedor}:* La siguiente entrega fue *REPROGRAMADA*.
👤 *Cliente:* ${detalle.Cliente}
🧾 *Comprobante:* ${comprobante}
📌 *Dirección:* ${detalle.Direccion_Entrega || "No especificada"}
👷‍♂️ *Chofer:* ${nombreChofer}
🧑‍💼 *Vendedor a cargo:* ${nombreVendedor}
📝 *Motivo:* ${aclaracion}
📞 *Acción:* Comunicarse con el cliente para dar aviso que su entrega se replanifica`;

        if (detalle.Telefono_vendedor) {
            await enviarMensaje(`${detalle.Telefono_vendedor}@s.whatsapp.net`, mensajeVendedor);
        }

        // Cliente
        const mensajeCliente = `🔁 *${detalle.Cliente}*: Tuvimos que *REPROGRAMAR* la entrega de tu pedido. Te avisaremos la nueva fecha. Si lo necesitás, podés comunicarte con tu vendedor asignado. ¡Gracias!`;

        if (detalle.Telefono) {
            await enviarMensaje(`${detalle.Telefono}@s.whatsapp.net`, mensajeCliente);
            FlowManager.resetFlow(`${detalle.Telefono}@s.whatsapp.net`);
        }

        // Siguiente entrega
        await EnviarSiguienteEntrega(userId, hojaRuta);

    } catch (error) {
        console.error("❌ Error en Reprogramado:", error);
        await enviarMensaje(userId, "💥 Ocurrió un error al reprogramar la entrega. Por favor, intentá nuevamente.");
        await enviarErrorPorWhatsapp(error, "metal grande");
    }
};