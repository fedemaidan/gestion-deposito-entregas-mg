const FlowManager = require('../../../FlowControl/FlowManager');
const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');
const enviarRemitoWhatsApp = require('../../../Utiles/Firebase/EnviarConformidad');
const { actualizarDetalleActual } = require('../../../services/google/Sheets/hojaDeruta');
const RevisarDatos = require('../../../Utiles/Funciones/Chofer/RevisarDatos');
const { enviarErrorPorWhatsapp } = require("../../../services/Excepcion/manejoErrores");
const verificarGrupoPendiente = require('../../../Utiles/Mensajes/verificarGrupoPendiente');

module.exports = async function EntregaNOK(userId, message) {
  try {
    await FlowManager.getFlow(userId);
    const hojaRuta = FlowManager.userFlows[userId]?.flowData;

    if (!hojaRuta?.Hoja_Ruta?.[0]) {
      console.error("❌ Hoja de ruta vacía o no encontrada.");
      return;
    }

    const hoja = hojaRuta.Hoja_Ruta[0];
    const detalle = hoja.Detalle_Actual?.[0];

    if (!detalle) {
      await enviarMensaje(userId, "⚠️ No hay entrega activa para subir el remito. Por favor, seleccioná una entrega primero.");
      return;
    }

    // 📦 Refrescar datos de cliente/vendedor
    const datosActualizados = await RevisarDatos(detalle.ID_DET, hoja.ID_CAB);
    if (datosActualizados) {
      detalle.Telefono = datosActualizados.cliente.telefono || detalle.Telefono;
      detalle.Cliente = datosActualizados.cliente.nombre || detalle.Cliente;
      detalle.Telefono_vendedor = datosActualizados.vendedor.telefono || detalle.Telefono_vendedor;
    }

    // 📸 Guardar imagen recibida
    const webUrl = message;
    detalle.Path = webUrl.imagenFirebase;

    // ✅ Mensajes
    await enviarMensaje(userId, "✅ Foto del comprobante recibida y guardada correctamente.");

    const comprobante = `${detalle.Comprobante?.Letra || ''} ${detalle.Comprobante?.Punto_Venta || ''}-${detalle.Comprobante?.Numero || ''}`;
    const nombreChofer = hojaRuta.Chofer?.Nombre || "No informado";
    const aclaracion = detalle.Observaciones || "Sin observaciones.";
    const nombreVendedor = detalle.Vendedor || "Vendedor sin nombre";

    // Cliente
    if (detalle.Telefono) {
      let mensajeCliente;
      if (detalle.Estado === "No Entregado") {
        mensajeCliente = `❌ *${detalle.Cliente}*: Nuestro chofer nos informó que tu pedido no pudo ser entregado. Por favor, comunicate con tu vendedor asignado para replanificar la entrega.`;
      } else {
        // Entregado NOK
        mensajeCliente = `⚠️ *${detalle.Cliente}*: Nuestro chofer nos informó que la entrega no pudo realizarse correctamente. Tu vendedor asignado se comunicará a la brevedad para solventar la falla lo antes posible.`;
      }
      await enviarMensaje(`${detalle.Telefono}@s.whatsapp.net`, mensajeCliente);
      await enviarRemitoWhatsApp(webUrl.imagenlocal, `${detalle.Telefono}@s.whatsapp.net`);

      if (process.env.NODE_ENV === "production") {
        FlowManager.resetFlow(`${detalle.Telefono}@s.whatsapp.net`);
      }
    }

    // Vendedor
    if (detalle.Telefono_vendedor) {
      const jidVendedor = `${detalle.Telefono_vendedor}@s.whatsapp.net`;
      let mensajeVendedor;
      if (detalle.Estado === "No Entregado") {
        mensajeVendedor = `❌ *ATENCIÓN ${nombreVendedor}:* La siguiente entrega fue marcada como *NO ENTREGADO*.
👤 *Cliente:* ${detalle.Cliente}
🧾 *Comprobante:* ${comprobante}
📌 *Dirección:* ${detalle.Direccion_Entrega || "No especificada"}
👷‍♂️ *Chofer:* ${nombreChofer}
🧑‍💼 *Vendedor a cargo:* ${nombreVendedor}
📝 *Aclaración del chofer:* ${aclaracion}
📞 *Acción:* Comunicarse con el cliente para replanificar entrega`;
detalle.Estado = "No Entregado";
      } else {
        mensajeVendedor = `⚠️ *ATENCIÓN ${nombreVendedor}:* La siguiente entrega fue marcada como *ENTREGADO NOK*.
👤 *Cliente:* ${detalle.Cliente}
🧾 *Comprobante:* ${comprobante}
📌 *Dirección:* ${detalle.Direccion_Entrega || "No especificada"}
👷‍♂️ *Chofer:* ${nombreChofer}
🧑‍💼 *Vendedor a cargo:* ${nombreVendedor}
📝 *Aclaración del chofer:* ${aclaracion}
📞 *Acción:* Comunicarse con el cliente para validar la falla y replanificar entrega`;
detalle.Estado = "Entregado NOK";
      }
      await enviarMensaje(jidVendedor, mensajeVendedor);
      await enviarRemitoWhatsApp(webUrl.imagenlocal, jidVendedor);
    }

    // ✅ Actualizar en Sheets
    await actualizarDetalleActual(hojaRuta);

    // 🔒 MARCAR COMO COMPLETO (igual que EntregaOK)
    // No cambiamos Estado acá (ya viene de SecuenciaEntrega: "Entregado NOK" o "No Entregado")
    detalle.Tiene_Estado = true;

    // 🧹 Limpiar y registrar
    hoja.Detalle_Actual = [];
    hoja.Detalles_Completados.push(detalle);

    // 📝 Persistir ANTES de decidir siguiente paso
    await FlowManager.setFlow(userId, "ENTREGACHOFER", "SecuenciaEntrega", hojaRuta);

    // ▶️ Dejar que el verificador decida: seguir con el mismo grupo o listar nuevos
    await verificarGrupoPendiente(userId);

  } catch (error) {
    console.error("❌ Error en EntregaNOK:", error);
    await enviarMensaje(userId, "💥 Ocurrió un error al procesar la entrega. Por favor, intentá nuevamente.");
    await enviarErrorPorWhatsapp(error, "metal grande");
  }
};