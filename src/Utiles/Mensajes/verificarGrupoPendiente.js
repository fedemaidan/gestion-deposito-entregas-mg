const FlowManager = require("../../FlowControl/FlowManager");
const enviarMensaje = require("../../services/EnviarMensaje/EnviarMensaje");
const { IndicarActual } = require("../../services/google/Sheets/hojaDeruta");
const EnviarSiguienteEntrega = require("../Funciones/Chofer/EnviarSiguienteEntrega");

module.exports = async function verificarGrupoPendiente(userId) {
  try {
    // Cargar desde Flow
    await FlowManager.getFlow(userId);
    const hojaRuta = FlowManager.userFlows[userId]?.flowData;
    const hoja = hojaRuta?.Hoja_Ruta?.[0];

    console.log("🔎 verificarGrupoPendiente: inicio");
    console.log("🧾 Codigo_Grupo_Det:", hoja?.Codigo_Grupo_Det);

    // Guardarraíl
    if (!hojaRuta || !hoja) {
      console.warn(`⚠️ verificarGrupoPendiente: sin Hoja_Ruta válida para ${userId}`);
      await enviarMensaje(userId, "⚠️ No pude continuar con la hoja actual. Volvé a elegir un destino, por favor.");
      return;
    }

    // Código de grupo
    const codigoGrupo =
      hoja.Codigo_Grupo_Det ||
      hoja.Grupo_Actual?.[0]?.codigo_grupo ||
      "";

    if (!codigoGrupo) {
      console.warn("⚠️ verificarGrupoPendiente: sin codigoGrupo. Listando entregas nuevamente.");
      await EnviarSiguienteEntrega(userId, hojaRuta);
      await FlowManager.setFlow(userId, "ENTREGACHOFER", "PrimeraEleccionEntrega", hojaRuta);
      return;
    }

    const grupoActual = Array.isArray(hoja.Grupo_Actual) ? hoja.Grupo_Actual : [];

    // Backfill del flag para datos viejos: si no existe, lo inferimos desde Estado
    for (const d of grupoActual) {
      if (d.Tiene_Estado === undefined) {
        d.Tiene_Estado = !!(d.Estado && String(d.Estado).trim() !== "");
      }
    }

    const delGrupo = grupoActual.filter(d => (d?.codigo_grupo || "") === codigoGrupo);

    // ✅ Pendientes = los que NO están marcados como completos
    const pendientes = delGrupo.filter(d =>
      d.Tiene_Estado === false ||
      (d.Tiene_Estado === undefined && (!d.Estado || String(d.Estado).trim() === ""))
    );

    console.log(`📦 verificarGrupoPendiente: grupo=${codigoGrupo} | total=${delGrupo.length} | pendientes=${pendientes.length}`);

    if (pendientes.length > 0) {
      const siguienteDet = pendientes[0];

      // (Opcional) mover el seleccionado al frente para evitar desfasajes
      const resto = grupoActual.filter(d => d.ID_DET !== siguienteDet.ID_DET);
      hoja.Grupo_Actual = [siguienteDet, ...resto];

      // Setear próximo detalle actual
      hoja.Detalle_Actual = [siguienteDet];
      console.log("✅ Nuevo Detalle_Actual:", JSON.stringify(hoja.Detalle_Actual, null, 2));

      // Persistir ANTES de mensajear
      await FlowManager.setFlow(userId, "ENTREGACHOFER", "SecuenciaEntrega", hojaRuta);

      // Mensaje de detalle
      const comp = siguienteDet.Comprobante || {};
      const compTexto = (comp.Letra && comp.Punto_Venta && comp.Numero)
        ? `${comp.Letra} ${comp.Punto_Venta}-${comp.Numero}`
        : "--";

      const mensajeDetalle =
        "📦 *Entrega a realizar:*\n\n" +
        `🆔 *ID Detalle:* ${siguienteDet.ID_DET || "--"}\n` +
        `🏢 *Cliente:* ${siguienteDet.Cliente || "--"}\n` +
        `📞 *Celular:* ${(siguienteDet.Telefono || "").toString().trim() || "Sin número"}\n` +
        `📍 *Dirección:* ${siguienteDet.Direccion_Entrega || "--"}\n` +
        `🌆 *Localidad:* ${siguienteDet.Localidad || "--"}\n` +
        `👤 *Vendedor:* ${siguienteDet.Vendedor || "No informado"}\n` +
        `📄 *Comprobante:* ${compTexto}`;

      await enviarMensaje(userId, mensajeDetalle);
      await enviarMensaje(
        userId,
        'Cuando la entrega finalice, indicalo enviando un mensaje con el resultado de la entrega:\n' +
        '1️⃣ Entregado OK ✅\n2️⃣ Entregado NOK ⚠️\n3️⃣ No entregado ❌\n4️⃣ Reprogramado 🔁'
      );

      await IndicarActual(hoja.ID_CAB, siguienteDet.ID_DET, hojaRuta);

      if (siguienteDet.Telefono) {
        const telefonoCliente = siguienteDet.Telefono;
        const mensajeCliente = "📦 ¡Aun hay detalles pendientes en el pedido en breve, te indicaremos sus estados!";
        await enviarMensaje(`${telefonoCliente}@s.whatsapp.net`, mensajeCliente);
        console.log("📲 Mensaje enviado al cliente:", telefonoCliente);
      }

      return;
    }

    // 🏁 Grupo finalizado
    console.log("🏁 Grupo finalizado. Listando siguientes entregas.");
    await EnviarSiguienteEntrega(userId, hojaRuta);
  } catch (err) {
    console.error("❌ verificarGrupoPendiente (catch):", err);
    await enviarMensaje(userId, "⚠️ Ocurrió un problema al continuar. Intentá nuevamente.");
  }
};
