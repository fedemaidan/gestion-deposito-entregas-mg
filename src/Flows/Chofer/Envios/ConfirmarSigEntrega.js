const FlowManager = require('../../../FlowControl/FlowManager');
const opcionElegida = require("../../../Utiles/Chatgpt/opcionElegida");
const enviarMensaje = require("../../../services/EnviarMensaje/EnviarMensaje");

// Helpers locales
function formatearComprobante(comp = {}) {
  const { Letra, Punto_Venta, Numero } = comp || {};
  return (Letra && Punto_Venta && Numero) ? `${Letra} ${Punto_Venta}-${Numero}` : "--";
}

function esPendiente(d) {
  return (!d?.Estado || String(d.Estado).trim() === "") && !d?.Tiene_Estado;
}

/** Revierte selección: devuelve Detalle_Actual a Detalles, limpia grupo */
function revertirSeleccion(hoja) {
  const actuales = Array.isArray(hoja?.Detalle_Actual) ? hoja.Detalle_Actual : [];
  const grupo = Array.isArray(hoja?.Grupo_Actual) ? hoja.Grupo_Actual : [];
  const existentes = Array.isArray(hoja?.Detalles) ? hoja.Detalles : [];

  // Mapa para evitar duplicados por ID_DET
  const map = new Map();
  for (const d of existentes) map.set(d.ID_DET, d);

  // Reinsertar actuales
  for (const d of actuales) {
    if (!map.has(d.ID_DET)) map.set(d.ID_DET, d);
  }

  // 🔧 Reinsertar TODO el grupo (lo que antes faltaba)
  for (const d of grupo) {
    if (!map.has(d.ID_DET)) map.set(d.ID_DET, d);
  }

  hoja.Detalles = Array.from(map.values());
  hoja.Detalle_Actual = [];
  hoja.Grupo_Actual = [];     // limpiar selección de grupo
  hoja.Codigo_Grupo_Det = ""; // limpiar código activo
}

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

  let mensaje = `🧭 Destinos disponibles:\n\n`;

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

    grupo.forEach((d, idxDet) => {
      mensaje += `🔹 *DETALLE ${idxDet + 1}*\n`;
      mensaje += `   👤 *Vendedor ${idxDet + 1}:* ${d.Vendedor || "Sin vendedor"}\n`;
      mensaje += `   🧾 *Comprobante:* ${formatearComprobante(d.Comprobante)}\n\n`;
    });

    mensaje += `-------------------------------------\n`;
  });

  mensaje += `🚛 Por favor indicá cuál será tu próxima entrega.`;

  await enviarMensaje(`${hojaRuta?.Chofer?.Telefono}@s.whatsapp.net`, mensaje);
}

module.exports = async function ConfirmarSigEntrega(userId, message) {
  await FlowManager.getFlow(userId);

  const hojaRuta = FlowManager.userFlows[userId]?.flowData;
  const data = await opcionElegida(message);
  const hoja = hojaRuta?.Hoja_Ruta?.[0];

  switch (data.data.Eleccion) {
    case 1:
      hojaRuta.confirmado = true;
      await enviarMensaje(userId, 'Próximo destino confirmado \n 1. Indicar el estado de la entrega \n 2. Cambiar el destino');
      await FlowManager.setFlow(userId, "ENTREGACHOFER", "confirmarSigestado", hojaRuta);
      break;

    // ❌ NO / cambiar destino → revertir selección y mostrar listado agrupado
    case 2:
    case 3: {
      if (!hoja) {
        await enviarMensaje(userId, "⚠️ No se pudo recuperar la hoja de ruta.");
        return;
      }

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
