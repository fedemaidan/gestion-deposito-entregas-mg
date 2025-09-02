const FlowManager = require('../../../../FlowControl/FlowManager');
const BuscarHoja = require('../../../../Utiles/Funciones/Logistica/IniciarRuta/BuscarHoja');
const FlowService = require('../../../../services/flow/flowService');
const enviarMensaje = require('../../../../services/EnviarMensaje/EnviarMensaje');
const { enviarErrorPorWhatsapp } = require("../../../../services/Excepcion/manejoErrores");

module.exports = async function CrearRuta(userId, data) {
    try {
        const resultado = await BuscarHoja(userId, data.data.id_cab);

        if (!resultado.operacion) {
            await enviarMensaje(userId, resultado.msg);
            FlowManager.resetFlow(userId);
            return;
        }

        const hojaRuta = resultado.hojaRuta;

        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            await enviarMensaje(userId, "⚠️ No se encontró la hoja de ruta.");
            return;
        }

        const hoja = hojaRuta.Hoja_Ruta[0];
        const { ID_CAB, Fecha, Detalles = [], Hora_Salida, Cerrado } = hoja;
        const { Chofer } = hojaRuta;

        if (!Chofer?.Telefono || Chofer.Telefono.trim() === "") {
            await enviarMensaje(userId, "🚫 No se encontró un número de teléfono válido para el chofer en esta hoja de ruta. Verificá los datos antes de continuar.");
            FlowManager.resetFlow(userId);
            return;
        }

        if (Cerrado) {
            await enviarMensaje(userId, "🚫 Esta hoja de ruta ya está cerrada y no se puede modificar.");
            FlowManager.resetFlow(userId);
            return;
        }

        if (Detalles.length === 0) {
            await enviarMensaje(userId, "🚫 La hoja de ruta no contiene entregas. Verificá que esté correctamente cargada.");
            FlowManager.resetFlow(userId);
            return;
        }

        const sinDireccion = Detalles.filter(det => !det.Direccion_Entrega || det.Direccion_Entrega.trim() === "");
        if (sinDireccion.length > 0) {
            const clientesSinDireccion = sinDireccion.map(det => `• ${det.Cliente || "Cliente sin nombre"} (ID_DET: ${det.ID_DET})`).join("\n");
            await enviarMensaje(userId, `🚫 Las siguientes entregas no tienen dirección de entrega:\n${clientesSinDireccion}\n\nNo se puede iniciar la hoja hasta que se completen esos datos.`);
            FlowManager.resetFlow(userId);
            return;
        }

        if (process.env.NODE_ENV == "production") {
            const choferPhone = Chofer?.Telefono?.replace(/\D/g, '');
            const userIdPhone = userId.split("@")[0].replace(/\D/g, '');

            if (choferPhone && choferPhone === userIdPhone) {
                await enviarMensaje(userId, `🚫 No está permitido que el chofer *(${Chofer?.Nombre})* inicie su propia hoja de ruta.\n\nSolo el área de logística puede hacer esto.`);
                FlowManager.resetFlow(userId);
                return;
            }
        }

        const choferId = `${Chofer.Telefono}@s.whatsapp.net`;
        const flowExistente = await FlowService.getFlowByUserId(choferId);

        if (flowExistente) {
            const conflict = await buscarHojaPorNumero(Chofer.Telefono, require('../../../../../models').Flow);

            let mensajeConflicto = `⚠️ El número *${Chofer.Telefono}* ya participa activamente en otra hoja de ruta.`;

            if (conflict) {
                mensajeConflicto += `\n\n📄 *ID_CAB:* ${conflict.idCab}`;
                mensajeConflicto += `\n🔄 *Rol ocupado:* ${conflict.rol}`;
                mensajeConflicto += `\n📅 *Fecha:* ${conflict.hojaRuta.Hoja_Ruta[0]?.Fecha || "No disponible"}`;
                mensajeConflicto += `\n🚛 *Chofer:* ${conflict.hojaRuta.Chofer?.Nombre || "Sin nombre"}`;
            }

            await enviarMensaje(userId, mensajeConflicto);
            FlowManager.resetFlow(userId);
            return;
        }

        // Encabezado
        let output = `📋 *Detalles de la hoja de ruta seleccionada*\n\n`;
        output += `🆔 *ID:* ${ID_CAB}\n📅 *Fecha:* ${Fecha}\n 🔒 *Estado:* ${Cerrado ? "Cerrado" : "Abierto"}\n`;
        output += `\n🚛 *Chofer:* ${Chofer?.Nombre || "No asignado"}\n📞 *Teléfono:* ${Chofer?.Telefono || "No disponible"}\n🔖 *Patente:* ${Chofer?.Patente || "No disponible"}\n`;

        if (Detalles.length > 0) {
            output += `\n📦 *Entregas planificadas (${Detalles.length})*\n━━━━━━━━━━━━━━━━━━\n`;

            // 🔁 AGRUPAR POR (Cliente + Dirección)
            const grupos = {};
            for (const det of Detalles) {
                const cliente = (det.Cliente || "").trim().toLowerCase();
                const direccion = (det.Direccion_Entrega || "").trim().toLowerCase();
                const clave = `${cliente}|${direccion}`;
                if (!grupos[clave]) grupos[clave] = [];
                grupos[clave].push(det);
            }

            // 🖨️ Imprimir grupos
            for (const grupo of Object.values(grupos)) {
                const head = grupo[0] || {};
                const cliente = head.Cliente || "No definido";
                const direccion = head.Direccion_Entrega || "No disponible";
                const localidad = head.Localidad || "No disponible";
                const cant = grupo.length;

                output += `\n📦 *Entregas para cliente ${cliente.toUpperCase()}* (${cant} entrega${cant > 1 ? "s" : ""})\n`;
                output += `📍 *Dirección:* ${direccion}\n`;
                output += `🏘️ *Localidad:* ${localidad}\n\n`;

                grupo.forEach((det, i) => {
                    const telefonoVendedor = det.Telefono_vendedor?.trim() || "No especificado";
                    const comprobante = `${det.Comprobante?.Letra || ""}-${det.Comprobante?.Punto_Venta || ""}-${det.Comprobante?.Numero || ""}`;

                    output += `📄 *Detalle ${i + 1}*\n`;
                    output += `🆔 *ID_DET:* ${det.ID_DET}\n`;
                    output += `📄 *Comprobante:* ${comprobante}\n`;
                    output += `📞 *Teléfono Cliente:* ${det.Telefono || "No disponible"}\n`;
                    output += `📞 *Teléfono Vendedor:* ${telefonoVendedor}\n\n`;
                });

                output += `━━━━━━━━━━━━━━━━━━\n`;
            }
        } else {
            output += `\n⚠️ No hay entregas cargadas en esta hoja.`;
        }

        await enviarMensaje(userId, output);
        await enviarMensaje(userId, "✅ ¿Deseas confirmar la hoja de ruta?\n\n1️⃣ *Sí*, confirmar\n2️⃣ *No*, salir");

        FlowManager.setFlow(userId, "INICIARRUTA", "ConfirmarOModificarRuta", hojaRuta);

    } catch (error) {
        console.error("❌ Error en CrearRuta:", error);
        await enviarMensaje(userId, "🚫 Ocurrió un error al intentar crear la ruta.");
        await enviarErrorPorWhatsapp(error, "metal grande");
        FlowManager.resetFlow(userId);
    }
};

async function buscarHojaPorNumero(numero, Flow) {
    console.log(`🔍 Buscando número: ${numero}`);

    try {
        const flows = await Flow.findAll({
            where: {
                flow: ["ENTREGACHOFER", "RECIBIRCLIENTE"]
            }
        });

        for (const flow of flows) {
            const data = flow.flowData;
            const flowTipo = flow.flow;

            if (!data?.Hoja_Ruta?.length) continue;

            for (const hoja of data.Hoja_Ruta) {
                const telChofer = data.Chofer?.Telefono;
                const esChofer = telChofer === numero;

                if (esChofer && flowTipo === "ENTREGACHOFER") {
                    return {
                        hojaRuta: data,
                        rol: 'Chofer',
                        idCab: hoja.ID_CAB,
                        telefono: numero,
                    };
                }

                const matchCliente = hoja.Detalles?.find(det => det.Telefono === numero);
                if (matchCliente && flowTipo === "RECIBIRCLIENTE") {
                    return {
                        hojaRuta: data,
                        rol: 'Cliente',
                        idCab: hoja.ID_CAB,
                        telefono: numero,
                    };
                }
            }
        }

        return null;
    } catch (error) {
        console.error("💥 Error dentro de buscarHojaPorNumero:", error);
        return null;
    }
}
