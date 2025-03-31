const FlowManager = require('../../../FlowControl/FlowManager');
const estado = require('../../../services/estado/estado');

module.exports = async function GuardarEstadoChofer(userId, hojaRuta, step) {
    try {





        FlowManager.setFlow

        /*
        if (!hojaRuta || !hojaRuta.Hoja_Ruta || hojaRuta.Hoja_Ruta.length === 0) {
            console.error("❌ Error: Hoja de ruta no proporcionada o vacía.");
            return { Success: false, msg: "Hoja de ruta no proporcionada o vacía." };
        }

        // Extraemos la primera hoja de ruta
        const hoja = hojaRuta.Hoja_Ruta[0];
        const { ID_CAB } = hoja;

        // Extraemos datos del chofer
        const chofer = hojaRuta.Chofer || {};
        const { Nombre: nombreChofer, Telefono: telefonoChofer, Patente } = chofer;

        // Construimos el objeto a guardar en la base de datos
        const estadoData = {
            userId,
            hojaDeRuta: hojaRuta,
            flow: "ENTREGACHOFER", // Puedes cambiar esto si el flujo es dinámico
            step
        };

        // Buscar si ya existe un estado para este userId
        const estadoExistente = await estado.getEstadoById(userId);

        if (estadoExistente) {
            // Si ya existe, hacemos un update
            await estado.updateEstado(userId, estadoData);
            console.log("🔄 Estado actualizado con éxito:", estadoData);
        } else {
            // Si no existe, creamos uno nuevo
            await estado.createEstado(estadoData);
            console.log("✅ Estado guardado con éxito:", estadoData);
        }

        return { Success: true, id: ID_CAB };

    */
    } catch (error) {
        console.error("❌ Error en GuardarEstadoChofer:", error);
        return { Success: false, msg: error.message };
    }

 
    
};
