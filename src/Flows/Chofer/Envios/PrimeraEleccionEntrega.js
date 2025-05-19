const FlowManager = require('../../../FlowControl/FlowManager');
const { actualizarHoraSalidaCabecera } = require('../../../services/google/Sheets/hojaDeruta');
const OpcionEntrega = require('../../../Utiles/Chatgpt/OpcionEntrega');
const timeOutConfirmacion = require('../../../Utiles/Funciones/Chofer/timeOutConfirmacion');
const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');

module.exports = async function PrimeraEleccionEntrega(userId, message) {
    try {
        await FlowManager.getFlow(userId);
        const hojaRuta = FlowManager.userFlows[userId]?.flowData;

        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Error: Hoja de ruta no proporcionada o vacía.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const { Detalles = [] } = hoja;
        const { Chofer } = hojaRuta;

        const entregasPendientes = [...Detalles];

        const resultado = await OpcionEntrega(message);

        // OPCIÓN MODIFICAR
        if (resultado.data.Eleccion === "MODIFICAR") {
            await enviarMensaje(userId, "🔄 Procesando...");

            const completadas = hoja.Detalles_Completados || [];

            if (completadas.length === 0) {
                await enviarMensaje(userId, "❌ No hay entregas completadas para modificar.");
                return;
            }

            let mensajeMod = "*📋 Entregas completadas disponibles para modificar:*\n";
            completadas.forEach((det, index) => {
                const comprobante = det.Comprobante?.Letra && det.Comprobante?.Punto_Venta && det.Comprobante?.Numero
                    ? `${det.Comprobante.Letra} ${det.Comprobante.Punto_Venta}-${det.Comprobante.Numero}`
                    : "--";

                mensajeMod += `\n*${index + 1}.* 🆔 ${det.ID_DET} - 🏢 ${det.Cliente} - 📄 ${comprobante}`;
            });

            mensajeMod += `\n\n📌 *Respondé con el número de la entrega que querés modificar.*`;

            await enviarMensaje(userId, mensajeMod);

            hojaRuta.entregasCompletadas = completadas;
            await FlowManager.setFlow(userId, "ENTREGACHOFER", "ModificarEntrega", hojaRuta);
            return;
        }

        // OPCIÓN NÚMERO (SELECCIÓN DE ENTREGA)
        const numeroPedido = parseInt(resultado.data.Eleccion);
        const detalleSeleccionado = entregasPendientes[numeroPedido - 1];

        if (!detalleSeleccionado) {
            await enviarMensaje(userId, "❌ Número inválido. Por favor, seleccioná un número de entrega válido.");
            return;
        }

        hoja.Detalles = hoja.Detalles.filter(det => det.ID_DET !== detalleSeleccionado.ID_DET);
        hoja.Detalle_Actual = [detalleSeleccionado];

        if (
            hoja.Detalle_Actual.length === 1 &&
            (!hoja.Detalles_Completados || hoja.Detalles_Completados.length === 0)
        ) {
            await actualizarHoraSalidaCabecera(hojaRuta);
        }

        const comprobante = detalleSeleccionado.Comprobante;
        const comprobanteTexto = comprobante && comprobante.Letra && comprobante.Punto_Venta && comprobante.Numero
            ? `${comprobante.Letra} ${comprobante.Punto_Venta}-${comprobante.Numero}`
            : "--";

        const mensaje = `📌 *En proceso* 

🆔 *ID Detalle:* ${detalleSeleccionado.ID_DET}
🏢 *Cliente:* ${detalleSeleccionado.Cliente}
📍 *Dirección:* ${detalleSeleccionado.Direccion_Entrega}
🌆 *Localidad:* ${detalleSeleccionado.Localidad}
📄 *Comprobante:* ${comprobanteTexto}`;

        await enviarMensaje(userId, mensaje);

        // Paso siguiente: confirmación con timeout
        hojaRuta.confirmado = false;
        FlowManager.setFlow(userId, "ENTREGACHOFER", "ConfirmarSigEntrega", hojaRuta);

        // ⚠️ Aquí aún usamos sock solo para el timeout que lo necesita internamente
        timeOutConfirmacion(userId);

        await enviarMensaje(userId,
            `\n\n📌 *Por favor, confirmá tu próxima entrega respondiendo con:*\n1️⃣ *Sí, confirmar.*\n2️⃣ *No, cancelar.*\n\n⏳ *Si no se recibe una respuesta en los próximos 5 minutos, la entrega será confirmada automáticamente.*`
        );

        console.log("✅ Detalle movido a Detalle_Actual.");

    } catch (error) {
        console.error("❌ Error en PrimeraEleccionEntrega:", error);
    }
};
