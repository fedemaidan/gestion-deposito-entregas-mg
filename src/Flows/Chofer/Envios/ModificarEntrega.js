const FlowManager = require("../../../FlowControl/FlowManager");
const { ResetDetalleHoja } = require("../../../services/google/Sheets/hojaDeruta");
const enviarMensaje = require("../../../services/EnviarMensaje/EnviarMensaje");

module.exports = async function ModificarEntrega(userId, message) {
  try {
    await FlowManager.getFlow(userId);
    const hojaRuta = FlowManager.userFlows[userId]?.flowData;

    if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
      console.error("❌ Error: Hoja de ruta no disponible.");
      return;
    }

    const hoja = hojaRuta.Hoja_Ruta[0];
    const completadas = hoja.Detalles_Completados || [];

    const eleccion = message.trim();
    if (isNaN(eleccion)) {
      await enviarMensaje(userId, "⚠️ Por favor, respondé con un número válido de la entrega a modificar.");
      return;
    }

    const indice = parseInt(eleccion) - 1;
    if (indice < 0 || indice >= completadas.length) {
      await enviarMensaje(userId, "❌ Número fuera de rango. Intentá de nuevo.");
      return;
    }

    // Mover la entrega de completadas a actual
    const entregaSeleccionada = completadas.splice(indice, 1)[0];

    // Limpiar observaciones y path
    entregaSeleccionada.Observaciones = "";
    entregaSeleccionada.Path = "";

    hoja.Detalle_Actual = [entregaSeleccionada];
    hoja.Detalles_Completados = completadas;

    await ResetDetalleHoja(hojaRuta);

    // Comprobante
    const comprobante = entregaSeleccionada.Comprobante;
    const comprobanteTexto = comprobante?.Letra && comprobante?.Punto_Venta && comprobante?.Numero
      ? `${comprobante.Letra} ${comprobante.Punto_Venta}-${comprobante.Numero}`
      : "--";

    // Mostrar info al usuario
    const mensaje = `✏️ *Modificando entrega seleccionada*

🆔 *ID Detalle:* ${entregaSeleccionada.ID_DET}
🏢 *Cliente:* ${entregaSeleccionada.Cliente}
📍 *Dirección:* ${entregaSeleccionada.Direccion_Entrega}
🌆 *Localidad:* ${entregaSeleccionada.Localidad}
📄 *Comprobante:* ${comprobanteTexto}`;

    await enviarMensaje(userId, mensaje);

    await enviarMensaje(userId,
      'indicá el nuevo resultado:\n1️⃣ Entregado OK ✅\n2️⃣ Entregado NOK ⚠️\n3️⃣ Rechazado ❌\n4️⃣ Cancelado 🚫'
    );

    await FlowManager.setFlow(userId, "ENTREGACHOFER", "SecuenciaEntrega", hojaRuta);

    console.log("✅ Entrega modificada y movida a Detalle_Actual.");

  } catch (error) {
    console.error("❌ Error en ModificarEntrega:", error);
  }
};
