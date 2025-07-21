const FlowManager = require("../../../FlowControl/FlowManager");
const { ResetDetalleHoja } = require("../../../services/google/Sheets/hojaDeruta");
const enviarMensaje = require("../../../services/EnviarMensaje/EnviarMensaje");
const { AnalizarModificacion } = require("../../../Utiles/Chatgpt/AnalizarModificacion");
const EnviarSiguienteEntrega = require("../../../Utiles/Funciones/Chofer/EnviarSiguienteEntrega");

module.exports = async function ModificarEntrega(userId, message) {
  try {


    await FlowManager.getFlow(userId);
    const hojaRuta = FlowManager.userFlows[userId]?.flowData;

    const opcion = await AnalizarModificacion(message);
    const eleccion = opcion?.Opcion;

    console.log("Opción elegida:", eleccion);

    if(eleccion === "CANCELAR") 
      {
      await enviarMensaje(userId, "🚫 Modificación cancelada. Volviendo al menú")
      EnviarSiguienteEntrega(userId, hojaRuta);
      }

    if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
      console.error("❌ Error: Hoja de ruta no disponible.");
      return;
    }

    const hoja = hojaRuta.Hoja_Ruta[0];
    const completadas = hoja.Detalles_Completados || [];

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

    // Mostrar info al chofer
    const mensaje = `✏️ Modificando entrega seleccionada

🆔 ID Detalle: ${entregaSeleccionada.ID_DET}
🏢 Cliente: ${entregaSeleccionada.Cliente}
📞 Celular: ${entregaSeleccionada.Telefono || "No informado"}
📍 Dirección: ${entregaSeleccionada.Direccion_Entrega || "No especificada"}
🌆 Localidad: ${entregaSeleccionada.Localidad || "No especificada"}
👤 Vendedor: ${entregaSeleccionada.Vendedor || "No informado"}
📄 Comprobante: ${comprobanteTexto}
📦 Estado: ${entregaSeleccionada.Estado || "Sin estado"}`;

    await enviarMensaje(userId, mensaje);

    // ✅ NUEVO: Notificar al cliente que su entrega está siendo modificada
    const telefonoCliente = entregaSeleccionada.Telefono?.trim();
    const telefonoVendedor = entregaSeleccionada.Telefono_vendedor?.trim();

    if (telefonoCliente) {
      const mensajeCliente = `⚠️ El estado de tu entrega *fue modificado* por el chofer.`;
      await enviarMensaje(`${telefonoCliente}@s.whatsapp.net`, mensajeCliente);
    } else {
      console.warn(`⚠️ Teléfono del cliente no disponible para la entrega ${entregaSeleccionada.ID_DET}`);
    }

    if (telefonoVendedor) {
      const mensajeVendedor = `📢 El estado de una entrega ya realizada *fue modificado* por el chofer del cliente *${entregaSeleccionada.Cliente}*.`;
      await enviarMensaje(`${telefonoVendedor}@s.whatsapp.net`, mensajeVendedor);
    } else {
      console.warn(`⚠️ Teléfono del vendedor no disponible para la entrega ${entregaSeleccionada.ID_DET}`);
    }

    await enviarMensaje(userId, `📦 Indicá el nuevo estado:
1️⃣ Entregado OK ✅
2️⃣ Entregado NOK ⚠️
3️⃣ No entregado ❌
4️⃣ Reprogramado 🔁`);

    await FlowManager.setFlow(userId, "ENTREGACHOFER", "SecuenciaEntrega", hojaRuta);

    console.log("✅ Entrega modificada, cliente notificado y movida a Detalle_Actual.");

  } catch (error) {
    console.error("❌ Error en ModificarEntrega:", error);
  }
};
