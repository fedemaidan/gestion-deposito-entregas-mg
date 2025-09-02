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
    const hoja = hojaRuta?.Hoja_Ruta?.[0] || {};
    const { Detalles = [] } = hoja;

    // 👷 Chofer y vehículo
    const nombreChofer = (hojaRuta?.Chofer?.Nombre || "").trim().replace(":", "") || "(Chofer no disponible)";
    const patente = (hojaRuta?.Chofer?.Patente || hojaRuta?.Vehiculo?.Patente || "").trim() || "(Patente no disponible)";

    // 🔁 AGRUPAR por (Teléfono + Cliente + Dirección)
    // Para que un mismo cliente reciba UN solo mensaje por dirección.
    const grupos = new Map();
    for (const det of Detalles) {
        const tel = (det.Telefono || "").trim(); // viene formateado por BuscarHoja
        const cliente = (det.Cliente || "").trim().toLowerCase();
        const direccion = (det.Direccion_Entrega || "").trim().toLowerCase();
        const clave = `${tel}|${cliente}|${direccion}`;
        if (!grupos.has(clave)) grupos.set(clave, []);
        grupos.get(clave).push(det);
    }

    // 🛠️ Helpers
    const buildComprobante = (c) => {
        const s = `${c?.Letra || ''}-${c?.Punto_Venta || ''}-${c?.Numero || ''}`;
        return s.replace(/-+/g, '-').replace(/^-|-$/g, '') || '--';
    };
    const toUpperSafe = (s) => (s || '').toString().trim().toUpperCase();

    // Elegir vendedor principal del grupo (el más frecuente por nombre; fallback al head)
    const elegirVendedorPrincipal = (grupo) => {
        const head = grupo[0] || {};
        const freq = new Map();
        for (const d of grupo) {
            const name = toUpperSafe(d.Vendedor);
            if (!name) continue;
            freq.set(name, (freq.get(name) || 0) + 1);
        }
        let elegido = null;
        let max = -1;
        for (const [name, count] of freq.entries()) {
            if (count > max) { max = count; elegido = name; }
        }
        // Tel del vendedor principal
        if (elegido) {
            // busca un detalle que tenga ese vendedor con teléfono no vacío
            const match = grupo.find(d => toUpperSafe(d.Vendedor) === elegido && (d.Telefono_vendedor || "").trim() !== "");
            return {
                nombre: elegido,
                telefono: (match?.Telefono_vendedor || "").trim() || ""
            };
        }
        // Fallback al primero
        return {
            nombre: toUpperSafe(head.Vendedor) || "NO INFORMADO",
            telefono: (head.Telefono_vendedor || "").trim() || ""
        };
    };

    // Sanitizar número visible a JID de WhatsApp: solo dígitos
    const toWhatsJid = (visible) => {
        const digits = (visible || "").replace(/\D/g, "");
        if (!digits) return "";
        return `${digits}@s.whatsapp.net`;
    };

    for (const [clave, grupo] of grupos.entries()) {
        const head = grupo[0];
        const telefonoVisible = (head.Telefono || "").trim(); // legible (puede tener +, espacios)
        const telefonoJid = toWhatsJid(telefonoVisible);

        const nombreCliente = (head.Cliente || "(Nombre no disponible)").trim();
        const direccion = (head.Direccion_Entrega || "(Dirección no disponible)").trim();
        const cant = grupo.length;

        if (!telefonoVisible || !telefonoJid) {
            const aviso = `⚠️ *Falta número de teléfono del cliente:* "${nombreCliente}" (dirección: "${direccion}"). No se pudo enviar el aviso de ${cant} entrega(s).`;
            await enviarMensaje(userId, aviso);
            continue;
        }

        // 🧾 Lista de comprobantes (y vendedor) por cada DET del grupo
        const detallesTexto = grupo.map((d, i) => {
            const comp = buildComprobante(d.Comprobante);
            const vend = d.Vendedor || "No informado";
            const telVend = (d.Telefono_vendedor || "").trim() || "No disponible";
            return `🔹 *Detalle ${i + 1}*
   🧾 *Comprobante:* ${comp}
   👤 *Vendedor:* ${vend}
   📞 *Celular vendedor:* ${telVend}`;
        }).join("\n\n");

        // 👤 Vendedor principal para el pie
        const vendPrincipal = elegirVendedorPrincipal(grupo);
        const vendedorFooterNombre = vendPrincipal.nombre || "NO INFORMADO";
        const vendedorFooterTel = vendPrincipal.telefono || "No disponible";

        const plural = cant > 1;
        const mensaje =
`¡Hola *${nombreCliente}*! 🤖 Soy *metaliA*, asistente virtual de logística de *METALGRANDE*.
Tu${plural ? 's pedidos están' : ' pedido está'} programado${plural ? 's' : ''} para ser entregado${plural ? 's' : ''} *hoy* 🗓️ en *${direccion}*.

${detallesTexto}

🚚 Entrega a cargo de:
* Chofer: *${nombreChofer}*
* Patente: *${patente}*

⚠️Recordá que debes contar con personal/maquinaria idónea para la descarga del material.
En caso de que no puedas recibir tu pedido, por favor contactá a tu vendedor asignado para reprogramar la entrega.`;

        try {
            await enviarMensaje(telefonoJid, mensaje);
        } catch (error) {
            console.error(`🛑 Error al enviar mensaje para ${nombreCliente} (${telefonoVisible}):`, error);
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
  const formatearDNI = (dni) => {
    const digits = (dni || "").toString().replace(/\D+/g, "");
    return digits ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "No informado";
  };

  // === Datos del transporte ===
  const nombreChofer   = (Chofer?.Empleado || Chofer?.Nombre || "Chofer no identificado").toString().trim();
  const dniChofer      = formatearDNI(Chofer?.DNI);
  const telefonoChofer = (Chofer?.Telefono ?? "").toString().trim();
  const patenteCamion  = (Chofer?.Patente || Vehiculo?.Patente || "No especificada").toString().trim();

  // ⬅️ Marca/Modelo desde hojaRuta.Vehiculo
  const marcaFinal  = (Vehiculo?.Marca || "").toString().trim() || "—";
  const modeloFinal = (Vehiculo?.Modelo || "").toString().trim() || "—";

  // Agrupar entregas por vendedor
  for (const det of (Detalles || [])) {
    const nombreVend = (det.Vendedor || "").trim();
    const telVend = (det.Telefono_vendedor ?? "").toString().trim();
    const cliente = det.Cliente || "Cliente sin nombre";
    const comprobante = formatearComprobante(det.Comprobante);
    const celularCliente = (det.Telefono ?? "").toString().trim();

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
    // 👉 Control “como en cliente”: si no hay teléfono, aviso y sigo.
    if (!data.telefono) {
      await enviarMensaje(userId, `⚠️ No se pudo enviar mensaje a *${nombreVend}* porque no tiene teléfono asignado.`);
      continue;
    }

    const entregasTexto = data.entregas.map(e =>
      `* 🏢 ${e.cliente} - 📄 ${e.comprobante} - 📞 Celular: ${e.celularCliente}`
    ).join("\n");

    const mensaje =
`📌 Hola *${nombreVend}*. Hoy se entregarán los siguientes pedidos:
${entregasTexto}

🚚 *Información del transporte*:
👤 *Chofer*: ${nombreChofer}
🪪 *DNI*: ${dniChofer}
📞 *Teléfono del chofer*: ${telefonoChofer}
🚛 *Patente del camión*: ${patenteCamion}
⚙️ *Marca/Modelo*: ${marcaFinal} ${modeloFinal}`;

    try {
      await enviarMensaje(`${data.telefono}@s.whatsapp.net`, mensaje);
    } catch (err) {
      console.error(`❌ Error al enviar mensaje a ${nombreVend}:`, err);
      await enviarMensaje(userId, `⚠️ No se pudo notificar al vendedor *${nombreVend}*.`);
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

  // Construir mensaje por grupo con enumeración (#1, #2, ...)
  const grupos = Object.values(entregasPorDestino);
  grupos.forEach((grupo, idx) => {
    const encabezado = grupo[0] || {};
    const cliente   = encabezado.Cliente || "Sin nombre";
    const celular   = (encabezado.Telefono || "").toString().trim() || "Sin teléfono";
    const direccion = encabezado.Direccion_Entrega || "No especificada";
    const localidad = encabezado.Localidad || "No especificada";

    const cant = grupo.length || 0;
    const plural = cant === 1 ? "entrega" : "entregas";

    // Título del grupo + datos generales (📦#N ...)
    mensaje += `📦#${idx + 1} *Entregas a ${cliente}:* (${cant} ${plural}):\n`;
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
  });

  mensaje += `🚛 Por favor indicá el *número del detalle* de la entrega a realizar.`;

  await enviarMensaje(`${Chofer.Telefono}@s.whatsapp.net`, mensaje);
}