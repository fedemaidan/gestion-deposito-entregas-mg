const enviarMensaje = require('../../../../services/EnviarMensaje/EnviarMensaje');
const FlowManager = require('../../../../FlowControl/FlowManager');
const iniciarFlowsClientes = require('../IniciarRuta/IniciarClientes');
const { guardarTelefonoLogistica } = require('../../../../services/google/Sheets/logisticaSheet');

module.exports = async function IndicarComienzo(hojaRuta, userId) {
    try {
        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Error: Hoja de ruta no proporcionada o vacía.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const { ID_CAB, Detalles = [] } = hoja;
        const { Chofer } = hojaRuta;

        if (!Detalles || Detalles.length === 0) {
            console.error("❌ Error: No hay detalles en la hoja de ruta.");
            return;
        }

        await guardarTelefonoLogistica(ID_CAB, userId.split('@')[0]);
        await enviarMensajesClientes(hojaRuta, userId);
        await enviarMensajesAVendedores(Detalles, Chofer, hojaRuta.Vehiculo, userId);
        await enviarMensajeChofer(Chofer, ID_CAB, Detalles);

        if (Chofer?.Telefono) {
            FlowManager.setFlow(Chofer.Telefono + "@s.whatsapp.net", "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);
        } else {
            await enviarMensaje(userId, "⚠️ No se pudo obtener la información del chofer para esta entrega. Por favor, revisar la hoja de ruta.");
            FlowManager.resetFlow(userId);
            return;
        }

        return { Success: true, id: ID_CAB };
    } catch (error) {
        console.error("❌ Error en IndicarComienzo:", error);
        return { Success: false, msg: error.message };
    }
};

async function enviarMensajesClientes(hojaRuta, userId) {
    const hoja = hojaRuta.Hoja_Ruta[0];
    const { Detalles = [] } = hoja;
    const nombreChofer = (hojaRuta.Chofer?.Nombre?.trim().replace(":", "") || "(Chofer no disponible)");
    const patente = hojaRuta.Chofer?.Patente?.trim() || "(Patente no disponible)";

    // 🔁 AGRUPAR por (Teléfono + Cliente + Dirección)
    // Para que un mismo cliente reciba UN solo mensaje por dirección.
    const grupos = new Map();
    for (const det of Detalles) {
        const tel = (det.Telefono || "").trim(); // clave principal: a quién le escribimos
        const cliente = (det.Cliente || "").trim().toLowerCase();
        const direccion = (det.Direccion_Entrega || "").trim().toLowerCase();
        const clave = `${tel}|${cliente}|${direccion}`;
        if (!grupos.has(clave)) grupos.set(clave, []);
        grupos.get(clave).push(det);
    }

    for (const [clave, grupo] of grupos.entries()) {
        const head = grupo[0];
        const telefono = (head.Telefono || "").trim();

        const nombreCliente = head.Cliente?.trim() || "(Nombre no disponible)";
        const direccion = head.Direccion_Entrega || "(Dirección no disponible)";
        const cant = grupo.length;

        if (!telefono) {
            const aviso = `⚠️ *Falta número de teléfono del cliente:* "${nombreCliente}" (dirección: "${direccion}"). No se pudo enviar el aviso de ${cant} entrega(s).`;
            await enviarMensaje(userId, aviso);
            continue;
        }

        // 🧾 Lista de comprobantes (y vendedor) por cada DET del grupo
        const detallesTexto = grupo.map((d, i) => {
            const c = d.Comprobante || {};
            const comp = `${c.Letra || ''}-${c.Punto_Venta || ''}-${c.Numero || ''}`.replace(/-+/g, '-').replace(/^-|-$/g, '');
            const vend = d.Vendedor || "No informado";
            const telVend = (d.Telefono_vendedor || "").trim() || "No disponible";
            return `🔹 *Detalle ${i + 1}*
   🧾 *Comprobante:* ${comp || "--"}
   👤 *Vendedor:* ${vend}
   📞 *Celular vendedor:* ${telVend}`;
        }).join("\n\n");

        const plural = cant > 1;
        const mensaje = `¡Hola *${nombreCliente}*! 🤖 Soy *metaliA*, asistente virtual de logística de *METALGRANDE*.
Tu${plural ? 's pedidos están' : ' pedido está'} programado${plural ? 's' : ''} para ser entregado${plural ? 's' : ''} *hoy* 🗓️ en *${direccion}*.

${detallesTexto}

🚚 Entrega a cargo de:
* Chofer: *${nombreChofer}*
* Patente: *${patente}*

⚠️ Recordá que debés contar con personal/maquinaria idónea para la descarga del material.
Si no pudieras recibir, por favor contactá a tu vendedor asignado para reprogramar.`;

        // ✅ Un solo envío por cliente/dirección
        try {
            await enviarMensaje(`${telefono}@s.whatsapp.net`, mensaje);
        } catch (error) {
            console.error(`🛑 Error al enviar mensaje para ${nombreCliente} (${telefono}):`, error);
        }
    }

    // Mantengo tu lógica existente
    await iniciarFlowsClientes(hojaRuta);
}

async function enviarMensajesAVendedores(Detalles, Chofer, Vehiculo, userId) {
  const entregasPorVendedor = {};
  const notificadosFaltantes = new Set();

  // Helpers
  const formatearComprobante = (comp = {}) => {
    const { Letra = "", Punto_Venta = "", Numero = "" } = comp || {};
    const pv = String(Punto_Venta).trim();
    const nro = String(Numero).trim();
    const letra = String(Letra).trim();
    return `${letra} ${pv}-${nro}`.replace(/\s+/g, " ").trim();
  };
  const normalizarTel = (t) => (t || "").toString().trim() || "Sin número";
  const formatearDNI = (dni) => {
    const digits = (dni || "").toString().replace(/\D+/g, "");
    return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "No informado";
  };

  // === Datos del transporte ===
  const nombreChofer   = (Chofer?.Empleado || Chofer?.Nombre || "Chofer no identificado").toString().trim();
  const dniChofer      = formatearDNI(Chofer?.DNI);
  const telefonoChofer = normalizarTel(Chofer?.Telefono);
  const patenteCamion  = (Chofer?.Patente || Vehiculo?.Patente || "No especificada").toString().trim();

  // ⬅️ Marca/Modelo desde hojaRuta.Vehiculo
  const marcaFinal  = (Vehiculo?.Marca || "").toString().trim() || "—";
  const modeloFinal = (Vehiculo?.Modelo || "").toString().trim() || "—";

  // Agrupar entregas por vendedor
  for (const det of (Detalles || [])) {
    const nombreVend = (det.Vendedor || "").trim();
    const telVend = normalizarTel(det.Telefono_vendedor);
    const cliente = det.Cliente || "Cliente sin nombre";
    const comprobante = formatearComprobante(det.Comprobante);
    const celularCliente = normalizarTel(det.Telefono);

    if (!nombreVend) {
      if (!notificadosFaltantes.has(cliente)) {
        await enviarMensaje(userId, `⚠️ No se pudo identificar al vendedor para el cliente *${cliente}*.`);
        notificadosFaltantes.add(cliente);
      }
      continue;
    }

    if (!entregasPorVendedor[nombreVend]) {
      entregasPorVendedor[nombreVend] = { telefono: telVend, entregas: [] };
    }
    if (!entregasPorVendedor[nombreVend].telefono && telVend) {
      entregasPorVendedor[nombreVend].telefono = telVend;
    }

    entregasPorVendedor[nombreVend].entregas.push({
      cliente,
      comprobante,
      celularCliente
    });
  }

  // Enviar un mensaje por vendedor
  for (const [nombreVend, data] of Object.entries(entregasPorVendedor)) {
    const entregasTexto = data.entregas.map(e =>
      `* 🏢 ${e.cliente} - 📄 ${e.comprobante} - 📞 Celular: ${e.celularCliente}`
    ).join("\n");

    const mensaje =
`📌 Hola *${nombreVend}*. Hoy se entregarán los siguientes pedidos:
${entregasTexto}

🚚 Información del transporte:
👤 Chofer: ${nombreChofer}
🪪 DNI: ${dniChofer}
📞 Teléfono del chofer: ${telefonoChofer}
🚛 Patente del camión: ${patenteCamion}
⚙️ Marca/Modelo: ${marcaFinal} ${modeloFinal}`;

    if (data.telefono && data.telefono !== "Sin número") {
      try {
        await enviarMensaje(`${data.telefono}@s.whatsapp.net`, mensaje);
      } catch (err) {
        console.error(`❌ Error al enviar mensaje a ${nombreVend}:`, err);
        await enviarMensaje(userId, `⚠️ No se pudo notificar al vendedor *${nombreVend}*.`);
      }
    } else {
      await enviarMensaje(userId, `⚠️ No se pudo enviar mensaje a *${nombreVend}* porque no tiene teléfono asignado.`);
    }
  }
}


async function enviarMensajeChofer(Chofer, ID_CAB, Detalles) {
  if (!Chofer?.Telefono) {
    console.error("⚠️ No se pudo enviar mensaje al Chofer: Teléfono no disponible.");
    return;
  }

  let mensaje = `🚛 Hola *${Chofer.Nombre || "Chofer"}*. Fuiste asignado a la Hoja de Ruta *${ID_CAB}* que incluye las siguientes entregas:\n\n`;

  // Agrupar entregas por destino (cliente + dirección)
  const entregasPorDestino = {};
  for (const detalle of Detalles || []) {
    const clave = `${(detalle.Cliente || "").trim().toLowerCase()}|${(detalle.Direccion_Entrega || "").trim().toLowerCase()}`;
    if (!entregasPorDestino[clave]) entregasPorDestino[clave] = [];
    entregasPorDestino[clave].push(detalle);
  }

  // Construir mensaje por grupo
  for (const grupo of Object.values(entregasPorDestino)) {
    const encabezado = grupo[0] || {};
    const cliente   = encabezado.Cliente || "Sin nombre";
    const celular   = (encabezado.Telefono || "").toString().trim() || "Sin teléfono";
    const direccion = encabezado.Direccion_Entrega || "No especificada";
    const localidad = encabezado.Localidad || "No especificada";

    const cant = grupo.length || 0;
    const plural = cant === 1 ? "entrega" : "entregas";

    // Título del grupo + datos generales
    mensaje += `📦 *Entregas a ${cliente}:* (${cant} ${plural}):\n`;
    mensaje += `*Datos generales:*\n`;
    mensaje += `   🏢 *Cliente:* ${cliente}\n`;
    mensaje += `   📞 *Celular:* ${celular}\n`;
    mensaje += `   📍 *Dirección:* ${direccion}\n`;
    mensaje += `   🌆 *Localidad:* ${localidad}\n\n`;

    // Detalles dentro del grupo
    grupo.forEach((det, i) => {
      const vendedor = det.Vendedor || "Sin vendedor";
      const comp = det.Comprobante || {};
      const compTexto = (comp.Letra && comp.Punto_Venta && comp.Numero)
        ? `${comp.Letra} ${comp.Punto_Venta}-${comp.Numero}`
        : "--";

      mensaje += `🔹 *DETALLE ${i + 1}*\n`;
      mensaje += `   👤 *Vendedor ${i + 1}:* ${vendedor}\n`;
      mensaje += `   🧾 *Comprobante:* ${compTexto}\n\n`;
    });

    mensaje += `-------------------------------------\n`;
  }

  mensaje += `🚛 Por favor indicá el *número del detalle* de la entrega a realizar.`;

  await enviarMensaje(`${Chofer.Telefono}@s.whatsapp.net`, mensaje);
}