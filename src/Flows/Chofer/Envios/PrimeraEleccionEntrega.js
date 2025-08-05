const FlowManager = require('../../../FlowControl/FlowManager');
const { actualizarHoraSalidaCabecera } = require('../../../services/google/Sheets/hojaDeruta');
const OpcionEntrega = require('../../../Utiles/Chatgpt/OpcionEntrega');
const timeOutConfirmacion = require('../../../Utiles/Funciones/Chofer/timeOutConfirmacion');
const enviarMensaje = require('../../../services/EnviarMensaje/EnviarMensaje');

module.exports = async function PrimeraEleccionEntrega(userId, message) {
    try {
        await FlowManager.getFlow(userId);
        const hojaRuta = FlowManager.userFlows[userId]?.flowData;

        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Error: Hoja de ruta no proporcionada o vacía.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const { Detalles = [] } = hoja;

        const entregasPendientes = [...Detalles];
        const resultado = await OpcionEntrega(message);

        // OPCIÓN MODIFICAR (sin cambios)
        if (resultado.data.Eleccion === "MODIFICAR") {
            await enviarMensaje(userId, "🔄 Procesando...");

            const completadas = hoja.Detalles_Completados || [];

            if (completadas.length === 0) {
                await enviarMensaje(userId, "❌ No hay entregas completadas para modificar.");
                return;
            }

            let mensajeMod = "📋 *Entregas ya realizadas disponibles para modificar:*\n";

            completadas.forEach((det, index) => {
                const comprobante = det.Comprobante?.Letra && det.Comprobante?.Punto_Venta && det.Comprobante?.Numero
                    ? `${det.Comprobante.Letra} ${det.Comprobante.Punto_Venta}-${det.Comprobante.Numero}`
                    : "--";
                const estado = det.Estado || "Sin estado";

                mensajeMod += `\n${index + 1}. 🆔 ${det.ID_DET} - 🏢 ${det.Cliente} - 📄 ${comprobante} - Estado: ${estado}`;
            });

            mensajeMod += `\n\n📌 *Respondé con el número de la entrega que querés modificar o CANCELAR para volver al listado anterior sin modificar nada.*`;

            await enviarMensaje(userId, mensajeMod);

            hojaRuta.entregasCompletadas = completadas;
            await FlowManager.setFlow(userId, "ENTREGACHOFER", "ModificarEntrega", hojaRuta);
            return;
        }

        // OPCIÓN NÚMERO (SELECCIÓN DE ENTREGA agrupada)
        const numeroGrupo = parseInt(resultado.data.Eleccion);

        // Agrupar entregas por destino (cliente + dirección)
        const grupos = {};
        for (const detalle of entregasPendientes) {
            const clave = `${detalle.Cliente?.trim().toLowerCase()}|${detalle.Direccion_Entrega?.trim().toLowerCase()}`;
            if (!grupos[clave]) grupos[clave] = [];
            grupos[clave].push(detalle);
        }

        const gruposArray = Object.values(grupos);
        const grupoSeleccionado = gruposArray[numeroGrupo - 1];

        if (!grupoSeleccionado || grupoSeleccionado.length === 0) {
            await enviarMensaje(userId, "❌ Número inválido. Por favor, seleccioná un número de entrega válido.");
            return;
        }

        // 🔸 NUEVO: determinar y fijar el codigo_grupo del grupo seleccionado
        const primerDET = grupoSeleccionado[0];
        const codigoGrupoSeleccionado = primerDET?.codigo_grupo || "";
        if (!codigoGrupoSeleccionado) {
            console.warn("⚠️ Grupo seleccionado sin codigo_grupo en sus DET. No se fijará Codigo_Grupo_Det.");
        }

        // (opcional) validar consistencia de códigos dentro del grupo
        const codigosDistintos = new Set(grupoSeleccionado.map(d => d.codigo_grupo || ""));
        if (codigosDistintos.size > 1) {
            console.warn("⚠️ Grupo con códigos de grupo distintos:", Array.from(codigosDistintos));
        }

        // Mover grupo y marcar grupo actual
        hoja.Detalles = hoja.Detalles.filter(det => !grupoSeleccionado.some(sel => sel.ID_DET === det.ID_DET));
        hoja.Grupo_Actual = grupoSeleccionado;

        // 🔸 NUEVO: guardar Codigo_Grupo_Det en la hoja
        hoja.Codigo_Grupo_Det = codigoGrupoSeleccionado;
        console.log("🆔 Codigo_Grupo_Det seteado:", hoja.Codigo_Grupo_Det);

        // Si es la primera salida, registrar hora
        if (
            hoja.Grupo_Actual.length > 0 &&
            (!hoja.Detalles_Completados || hoja.Detalles_Completados.length === 0)
        ) {
            await actualizarHoraSalidaCabecera(hojaRuta);
        }

        const comprobante = primerDET.Comprobante;
        const comprobanteTexto = comprobante && comprobante.Letra && comprobante.Punto_Venta && comprobante.Numero
            ? `${comprobante.Letra} ${comprobante.Punto_Venta}-${comprobante.Numero}`
            : "--";

        let mensaje = `📦 *Entregas a realizar:* (${grupoSeleccionado.length} entrega${grupoSeleccionado.length > 1 ? 's' : ''})\n\n`;

        mensaje += `🏢 *Cliente:* ${primerDET.Cliente}\n`;
        mensaje += `📞 *Celular:* ${primerDET.Telefono?.trim() || "Sin número"}\n`;
        mensaje += `📍 *Dirección:* ${primerDET.Direccion_Entrega}\n`;
        mensaje += `🌆 *Localidad:* ${primerDET.Localidad}\n\n`;

        grupoSeleccionado.forEach((det, index) => {
            const comprobanteTextoDet = det.Comprobante && det.Comprobante.Letra && det.Comprobante.Punto_Venta && det.Comprobante.Numero
                ? `${det.Comprobante.Letra} ${det.Comprobante.Punto_Venta}-${det.Comprobante.Numero}`
                : "--";

            mensaje += `🔹 *DETALLE ${index + 1}*\n`;
            mensaje += `   🆔 *ID Detalle:* ${det.ID_DET}\n`;
            mensaje += `   👤 *Vendedor:* ${det.Vendedor || "No informado"}\n`;
            mensaje += `   🧾 *Comprobante:* ${comprobanteTextoDet}\n\n`;
        });

        // Paso siguiente: confirmación con timeout (sin cambios de texto)
        hojaRuta.confirmado = false;
        await FlowManager.setFlow(userId, "ENTREGACHOFER", "ConfirmarSigEntrega", hojaRuta);

        timeOutConfirmacion(userId);

        const mensajeconfirmacion = `📌 Por favor, confirmá tu próxima entrega respondiendo con:
        1️⃣ Sí, confirmar.
        2️⃣ No, cambiar.
        ⏳ Si no se recibe una respuesta en los próximos 5 minutos, la entrega será confirmada automáticamente.`;

        await enviarMensaje(userId, mensajeconfirmacion);

        console.log("✅ Grupo movido a Grupo_Actual.");

    } catch (error) {
        console.error("❌ Error en PrimeraEleccionEntrega:", error);
    }
};
