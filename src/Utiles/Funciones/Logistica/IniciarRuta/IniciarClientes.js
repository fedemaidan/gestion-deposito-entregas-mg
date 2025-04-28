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

    const ruta = hojaRuta.Hoja_Ruta[0]; // Como solo hay una hoja de ruta
    const flow = "RECIBIRCLIENTE";
    const step = "SolicitarDatos";

    for (const detalle of ruta.Detalles) {
        const telefono = detalle.Telefono?.trim();
        if (telefono) {
            try {
                await iniciarFlow(`${telefono}@s.whatsapp.net`, flow, step, detalle);
            } catch (error) {
                console.error(`Error iniciando flow para ${telefono}:`, error);
            }
        } else {
            console.warn(`El cliente ${detalle.Cliente} no tiene número de teléfono válido.`);
        }
    }
}

module.exports = iniciarFlowsClientes;
