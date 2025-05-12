const FlowManager = require('../../../FlowControl/FlowManager');
const { actualizarHoraSalidaCabecera } = require('../../../services/google/Sheets/hojaDeruta');
const OpcionEntrega = require('../../../Utiles/Chatgpt/OpcionEntrega');
const timeOutConfirmacion = require('../../../Utiles/Funciones/Chofer/timeOutConfirmacion');

module.exports = async function PrimeraEleccionEntrega(userId, message, sock) {
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

        // Filtrar entregas pendientes
        const entregasPendientes = [...Detalles];

        // Interpretar mensaje del usuario
        const resultado = await OpcionEntrega(message);

        if (resultado.data.Eleccion === "MODIFICAR") {
            // No es un número, probablemente puso "MODIFICAR"
            await sock.sendMessage(userId, { text: "🔄 Procesando..." });

            const completadas = hoja.Detalles_Completados || [];

            if (completadas.length === 0) {
                await sock.sendMessage(userId, {
                    text: "❌ No hay entregas completadas para modificar."
                });
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

            await sock.sendMessage(userId, { text: mensajeMod });

            hojaRuta.entregasCompletadas = completadas;
            await FlowManager.setFlow(userId, "ENTREGACHOFER", "ModificarEntrega", hojaRuta);
            return;
        } 
//---------------------------------------------------------------------------------------- MODIFICAR
        else
//---------------------------------------------------------------------------------------- SLECCIONAR SIGUIENTE   
         {
            // Es un número válido
            const numeroPedido = parseInt(resultado.data.Eleccion);
            const detalleSeleccionado = entregasPendientes[numeroPedido - 1];

            if (!detalleSeleccionado) {
                await sock.sendMessage(userId, {
                    text: "❌ Número inválido. Por favor, seleccioná un número de entrega válido."
                });
                return;
            }

            // Sacarlo de Detalles
            hoja.Detalles = hoja.Detalles.filter(det => det.ID_DET !== detalleSeleccionado.ID_DET);

            // Ponerlo en Detalle_Actual
            hoja.Detalle_Actual = [detalleSeleccionado];

            if (
                hoja.Detalle_Actual.length === 1 &&
                (!hoja.Detalles_Completados || hoja.Detalles_Completados.length === 0)
            ) {
                await actualizarHoraSalidaCabecera(hojaRuta);
            }

            // Construir texto del comprobante
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

            await sock.sendMessage(userId, { text: mensaje });

            //siguiente step de confirmacion y lanzmiento del timer. 5 minutos
            hojaRuta.confirmado = false; //reinicio la verificacion de confirmacion
            FlowManager.setFlow(userId, "ENTREGACHOFER", "ConfirmarSigEntrega", hojaRuta);
            timeOutConfirmacion(userId, sock);

            await sock.sendMessage(userId, {text:`\n\n📌 *Por favor, confirmá tu próxima entrega respondiendo con:*\n1️⃣ *Sí, confirmar.*\n2️⃣ *No, cancelar.*\n\n⏳ *Si no se recibe una respuesta en los próximos 5 minutos, la entrega será confirmada automáticamente.*`});

            console.log("✅ Detalle movido a Detalle_Actual.");
        }

    } catch (error) {
        console.error("❌ Error en PrimeraEleccionEntrega:", error);
    }
};
