const iniciarFlow = require('../../FuncionesFlowmanager/iniciarFlow');
/**
 * Inicia los flows para cada cliente en la hoja de ruta.
 * @param {Object} hojaRuta - Objeto con estructura de hoja de ruta, cabecera y detalles.
 */
async function iniciarFlowsClientes(hojaRuta) {
    if (!hojaRuta?.Hoja_Ruta || !Array.isArray(hojaRuta.Hoja_Ruta)) {
        console.error("El JSON recibido no tiene una estructura válida de Hoja_Ruta.");
        return;
    }

    const ruta = hojaRuta.Hoja_Ruta[0];
    const flow = "RECIBIRCLIENTE";
    const step = "SolicitarDatos";

    for (const detalle of ruta.Detalles) {
        const telefonoCliente = detalle.Telefono?.trim();
        const telefonoVendedor = detalle.Telefono_vendedor?.trim();

        if (telefonoCliente && telefonoVendedor) {
            try {
                await iniciarFlow(`${telefonoCliente}@s.whatsapp.net`, flow, step, hojaRuta);
            } catch (error) {
                console.error(`❌ Error iniciando flow para cliente ${telefonoCliente}:`, error);
            }
        } else {
            console.warn(`⚠️ No se inició el flow para el cliente "${detalle.Cliente}" porque falta un teléfono. Cliente: ${telefonoCliente || "no disponible"}, Vendedor: ${telefonoVendedor || "no disponible"}`);
        }
    }
}

module.exports = iniciarFlowsClientes;
