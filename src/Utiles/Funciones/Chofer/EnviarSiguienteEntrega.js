const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');
const FlowManager = require('../../../FlowControl/FlowManager');
const BuscarHoja = require('../../../Utiles/Funciones/Logistica/IniciarRuta/BuscarHoja');

async function EnviarSiguienteEntrega(choferNumero, hojaRuta) {
  try {
    const hoja = hojaRuta.Hoja_Ruta?.[0];
    const { Chofer } = hojaRuta;

    if (!hoja) {
      console.error("❌ Error: hojaRuta no contiene Hoja_Ruta[0]");
      return;
    }

    const { ID_CAB } = hoja;

    // 🔄 Buscar hoja actualizada desde Google Sheets
    const resultadoBusqueda = await BuscarHoja(choferNumero, ID_CAB);
    if (!resultadoBusqueda.operacion) {
      console.error("❌ No se pudo actualizar hoja:", resultadoBusqueda.msg);
      return;
    }

    const hojaRutaActualizada = resultadoBusqueda.hojaRuta;
    const nuevosDetalles = hojaRutaActualizada.Hoja_Ruta?.[0]?.Detalles || [];

    // Mezcla no destructiva de detalles (manteniendo flags locales como Tiene_Estado)
    const detallesExistentes = hoja.Detalles || [];
    const detallesExistentesMap = new Map(detallesExistentes.map(d => [d.ID_DET, d]));

    nuevosDetalles.forEach(det => {
      // Si ya lo teníamos en memoria, actualizo con lo nuevo pero preservando flags locales
      const previo = detallesExistentesMap.get(det.ID_DET);
      if (previo) {
        detallesExistentesMap.set(det.ID_DET, {
          ...det,
          // preservo banderas/props que no vienen de sheets
          Tiene_Estado: previo.Tiene_Estado ?? det.Tiene_Estado,
          Path: previo.Path ?? det.Path
        });
      } else {
        // incorporo solamente si aún no tiene estado en sheets (o vacío)
        if (!det.Estado || String(det.Estado).trim() === "") {
          detallesExistentesMap.set(det.ID_DET, det);
        }
      }
    });

    hoja.Detalles = Array.from(detallesExistentesMap.values());

    // Helpers locales
    const esPendiente = (d) =>
      (!d?.Estado || String(d.Estado).trim() === "") && !d?.Tiene_Estado;

    // 🔄 Buscar siguiente entrega dentro del mismo grupo del último completado
    const completados = hoja.Detalles_Completados || [];
    const ultimoCompletado = completados[completados.length - 1];

    if (ultimoCompletado?.codigo_grupo) {
      const siguiente = hoja.Detalles.find(d =>
        d.codigo_grupo === ultimoCompletado.codigo_grupo && esPendiente(d)
      );

      if (siguiente) {
        hoja.Detalle_Actual = [siguiente];

        const direccion = siguiente.Direccion_Entrega || "No especificada";
        const localidad = siguiente.Localidad || "No especificada";
        const cliente = siguiente.Cliente || "Sin nombre";
        const vendedor = siguiente.Vendedor || "Sin vendedor";
        const telefono = (siguiente.Telefono || siguiente.Telefono_vendedor || "").toString().trim() || "Sin teléfono";
        const comprobante = (() => {
          const c = siguiente.Comprobante || {};
          return (c.Letra && c.Punto_Venta && c.Numero) ? `${c.Letra} ${c.Punto_Venta}-${c.Numero}` : "--";
        })();

        const mensaje = `✏️ *Modificando entrega seleccionada*\n
🆔 *ID Detalle:* ${siguiente.ID_DET}
🏢 *Cliente:* ${cliente}
📞 *Celular:* ${telefono}
📍 *Dirección:* ${direccion}
🌆 *Localidad:* ${localidad}
👤 *Vendedor:* ${vendedor}
📄 *Comprobante:* ${comprobante}`;

        await enviarMensaje(`${Chofer.Telefono}@s.whatsapp.net`, mensaje);
        await FlowManager.setFlow(choferNumero, "ENTREGACHOFER", "SecuenciaEntrega", hojaRuta);
        return;
      }
    }

    // ✅ Si no quedan pendientes en general
    const pendientesGlobales = (hoja.Detalles || []).filter(esPendiente);
    if (pendientesGlobales.length === 0) {
      console.log("✅ Todas las entregas han sido completadas.");

      const mensajeFinal = `📦 *Completaste todas las entregas.*\n¿Querés cerrar la hoja de ruta o modificar alguna entrega?\n\n1️⃣ Finalizar hoja de ruta\n2️⃣ Modificar estado de entregas realizadas`;

      await enviarMensaje(choferNumero, mensajeFinal);
      await FlowManager.setFlow(choferNumero, "ENTREGACHOFER", "TerminarEntregas", hojaRuta);
      return;
    }

    // 📋 Reenviar listado agrupado (mismo formato que pediste)
    // ====== LÓGICA DE FORMATO DUPLICADA ======
    function formatearComprobante(comp = {}) {
      const { Letra, Punto_Venta, Numero } = comp || {};
      return (Letra && Punto_Venta && Numero) ? `${Letra} ${Punto_Venta}-${Numero}` : "--";
    }

    // Agrupa SOLO pendientes por cliente + dirección
    const entregasPorDestino = {};
    for (const det of pendientesGlobales) {
      const clave = `${(det.Cliente || "").trim().toLowerCase()}|${(det.Direccion_Entrega || "").trim().toLowerCase()}`;
      if (!entregasPorDestino[clave]) entregasPorDestino[clave] = [];
      entregasPorDestino[clave].push(det);
    }

    let mensaje = `🚛 Hola *${Chofer.Nombre || "Chofer"}*. Fuiste asignado a la Hoja de Ruta *${ID_CAB}* que incluye las siguientes entregas:\n\n`;

    for (const grupo of Object.values(entregasPorDestino)) {
      const head = grupo[0] || {};
      const cliente   = head.Cliente || "Sin nombre";
      const celular   = (head.Telefono || "").toString().trim() || "Sin teléfono";
      const direccion = head.Direccion_Entrega || "No especificada";
      const localidad = head.Localidad || "No especificada";
      const cant = grupo.length;

      mensaje += `📦 *Entregas a ${cliente}:* (${cant} entrega${cant > 1 ? "s" : ""}):\n`;
      mensaje += `*Datos generales:*\n`;
      mensaje += `   🏢 *Cliente:* ${cliente}\n`;
      mensaje += `   📞 *Celular:* ${celular}\n`;
      mensaje += `   📍 *Dirección:* ${direccion}\n`;
      mensaje += `   🌆 *Localidad:* ${localidad}\n\n`;

      grupo.forEach((d, idx) => {
        mensaje += `🔹 *DETALLE ${idx + 1}*\n`;
        mensaje += `   👤 *Vendedor ${idx + 1}:* ${d.Vendedor || "Sin vendedor"}\n`;
        mensaje += `   🧾 *Comprobante:* ${formatearComprobante(d.Comprobante)}\n\n`;
      });

      mensaje += `-------------------------------------\n`;
    }

    mensaje += `🚛 Por favor indicá el *número del detalle* de la entrega a realizar.\n\n🛠️ Si necesitás cambiar el estado de una entrega ya realizada, respondé con *MODIFICAR*.`;

    await enviarMensaje(`${Chofer.Telefono}@s.whatsapp.net`, mensaje);
    await FlowManager.setFlow(choferNumero, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);

  } catch (error) {
    console.error("❌ Error al enviar lista de entregas pendientes:", error);
  }
}

module.exports = EnviarSiguienteEntrega;