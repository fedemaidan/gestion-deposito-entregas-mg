const FlowManager = require('../../../FlowControl/FlowManager');
const opcionElegida = require("../../../Utiles/Chatgpt/opcionElegida");
const enviarMensaje = require("../../../services/EnviarMensaje/EnviarMensaje");
const { IndicarActual } = require("../../../services/google/Sheets/hojaDeruta");

// Helpers locales
function esPendiente(d) {
  return (!d?.Estado || String(d.Estado).trim() === "") && !d?.Tiene_Estado;
}

function formatearComprobante(comp = {}) {
  const { Letra, Punto_Venta, Numero } = comp || {};
  return (Letra && Punto_Venta && Numero) ? `${Letra} ${Punto_Venta}-${Numero}` : "--";
}

/** Revierte selección: devuelve Detalle_Actual a Detalles, limpia grupo */
function revertirSeleccion(hoja) {
  const actuales    = Array.isArray(hoja?.Detalle_Actual) ? hoja.Detalle_Actual : [];
  const grupo       = Array.isArray(hoja?.Grupo_Actual)   ? hoja.Grupo_Actual   : [];
  const existentes  = Array.isArray(hoja?.Detalles)       ? hoja.Detalles       : [];

  // Usamos Map para evitar duplicados por ID_DET
  const map = new Map();
  for (const d of existentes) map.set(d.ID_DET, d);
  for (const d of actuales)   if (d && !map.has(d.ID_DET)) map.set(d.ID_DET, d);
  for (const d of grupo)      if (d && !map.has(d.ID_DET)) map.set(d.ID_DET, d);

  hoja.Detalles = Array.from(map.values());

  // Limpiar selección actual y de grupo
  hoja.Detalle_Actual = [];
  hoja.Grupo_Actual   = [];
  hoja.Codigo_Grupo_Det = "";
}

/** Envía listado agrupado (cliente+dirección) con SOLO pendientes */
/** Envía listado agrupado (cliente+dirección) con SOLO pendientes */
async function enviarListadoAgrupado(hojaRuta) {
  const hoja = hojaRuta?.Hoja_Ruta?.[0];
  const chofer = hojaRuta?.Chofer;
  const { ID_CAB } = hoja || {};
  const pendientes = (hoja?.Detalles || []).filter(esPendiente);

  const entregasPorDestino = {};
  for (const det of pendientes) {
    const clave = `${(det.Cliente || "").trim().toLowerCase()}|${(det.Direccion_Entrega || "").trim().toLowerCase()}`;
    if (!entregasPorDestino[clave]) entregasPorDestino[clave] = [];
    entregasPorDestino[clave].push(det);
  }

  let mensaje = `🚛 Continuamos ?: *${chofer?.Nombre || "Chofer"}*. aun tenes pendientes en la Hoja de Ruta *${ID_CAB || "--"}* que incluye las siguientes entregas:\n\n`;

  // 👉 Enumeración de grupos: 📦#1, 📦#2, ...
  const grupos = Object.values(entregasPorDestino);
  grupos.forEach((grupo, idx) => {
    const head = grupo[0] || {};
    const cliente   = head.Cliente || "Sin nombre";
    const celular   = (head.Telefono || "").toString().trim() || "Sin teléfono";
    const direccion = head.Direccion_Entrega || "No especificada";
    const localidad = head.Localidad || "No especificada";
    const cant = grupo.length;

    mensaje += `📦#${idx + 1} *Entregas a ${cliente}:* (${cant} entrega${cant > 1 ? "s" : ""}):\n`;
    mensaje += `*Datos generales:*\n`;
    mensaje += `   🏢 *Cliente:* ${cliente}\n`;
    mensaje += `   📞 *Celular:* ${celular}\n`;
    mensaje += `   📍 *Dirección:* ${direccion}\n`;
    mensaje += `   🌆 *Localidad:* ${localidad}\n\n`;

    grupo.forEach((d, i) => {
      mensaje += `🔹 *DETALLE ${i + 1}*\n`;
      mensaje += `   👤 *Vendedor ${i + 1}:* ${d.Vendedor || "Sin vendedor"}\n`;
      mensaje += `   🧾 *Comprobante:* ${formatearComprobante(d.Comprobante)}\n\n`;
    });

    mensaje += `-------------------------------------\n`;
  });

  mensaje += `🚛 Por favor indicá el *número del detalle* de la entrega a realizar.\n\n🛠️ Si necesitás cambiar el estado de una entrega ya realizada, respondé con *MODIFICAR*.`;

  await enviarMensaje(`${hojaRuta?.Chofer?.Telefono}@s.whatsapp.net`, mensaje);
}

module.exports = async function confirmarSigestado(userId, message) {
  await FlowManager.getFlow(userId);
  const hojaRuta = FlowManager.userFlows[userId]?.flowData;

  const data = await opcionElegida(message);
  const hoja = hojaRuta?.Hoja_Ruta?.[0];

  switch (data.data.Eleccion) {
    case 1: {
      hojaRuta.confirmado = true;

      const codigoGrupoActual =
        hoja?.Codigo_Grupo_Det ||
        hoja?.Grupo_Actual?.[0]?.codigo_grupo ||
        "";

      if (!codigoGrupoActual) {
        await enviarMensaje(userId, "❌ No se encontró un grupo seleccionado.");
        return;
      }

      const grupoActual = Array.isArray(hoja?.Grupo_Actual) ? hoja.Grupo_Actual : [];
      // Próximo pendiente del mismo grupo
      const siguienteDet = grupoActual.find(det =>
        (det?.codigo_grupo || "") === codigoGrupoActual && esPendiente(det)
      );

      if (!siguienteDet) {
        await enviarMensaje(userId, "🏁 No quedan entregas pendientes en este grupo. Te muestro el listado general.");
        // Limpio selección de grupo y muestro lista general
        revertirSeleccion(hoja); // (por si había algo en Detalle_Actual)
        await FlowManager.setFlow(userId, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);
        await enviarListadoAgrupado(hojaRuta);
        return;
      }

      // Setear Detalle_Actual con ese DET
      hoja.Detalle_Actual = [siguienteDet];

      await FlowManager.setFlow(userId, "ENTREGACHOFER", "SecuenciaEntrega", hojaRuta);

      // Mensaje de detalle
      const compTexto = formatearComprobante(siguienteDet.Comprobante);
      const mensajeDetalle =
        "📦 *Entrega a realizar:*\n\n" +
        `🆔 *ID Detalle:* ${siguienteDet.ID_DET || "--"}\n` +
        `🏢 *Cliente:* ${siguienteDet.Cliente || "--"}\n` +
        `📞 *Celular:* ${(siguienteDet.Telefono || "").toString().trim() || "Sin número"}\n` +
        `📍 *Dirección:* ${siguienteDet.Direccion_Entrega || "--"}\n` +
        `🌆 *Localidad:* ${siguienteDet.Localidad || "--"}\n` +
        `👤 *Vendedor:* ${siguienteDet.Vendedor || "No informado"}\n` +
        `📄 *Comprobante:* ${compTexto}`;

      await enviarMensaje(userId, "🚛 Continuamos con la entrega.");
      await enviarMensaje(userId, mensajeDetalle);
      await enviarMensaje(
        userId,
        'Cuando la entrega finalice, indícalo enviando un mensaje con el resultado de la entrega:\n' +
        '1️⃣ Entregado OK ✅\n2️⃣ Entregado NOK ⚠️\n3️⃣ No entregado ❌\n4️⃣ Reprogramado 🔁'
      );

      await IndicarActual(hoja.ID_CAB, siguienteDet.ID_DET, hojaRuta);

      if (siguienteDet.Telefono) {
        const tel = siguienteDet.Telefono;
        const msjCli = "📦 ¡Tu entrega es la próxima! Asegurate de tener personal para la descarga. ¡Gracias!";
        await enviarMensaje(`${tel}@s.whatsapp.net`, msjCli);
      }
      break;
    }

    // ❌ NO / cambiar destino → revertir selección y mostrar listado agrupado
    case 2:
    case 3: {
      revertirSeleccion(hoja);

      await enviarMensaje(userId, "🔀 Seleccionaste *cambiar destino*.");
      await enviarListadoAgrupado(hojaRuta);

      await FlowManager.setFlow(userId, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);
      break;
    }

    default:
      await enviarMensaje(userId, "Disculpá, no entendí tu elección. Por favor respondé nuevamente.");
      break;
  }
};
