const { obtenerHojaRutaPorID } = require('../../../../services/google/Sheets/hojaDeruta');

async function BuscarHoja(userId, text) {
    try {
        if (!userId || !text) {
            throw new Error("userId o text no proporcionado");
        }

        // Buscar hoja en Google Sheets por ID_CAB
        const cabeceraConDetalles = await obtenerHojaRutaPorID(text);

        if (!cabeceraConDetalles) {
            return { Success: false, msg: `No se encontró hoja con ID ${text}` };
        }

        // Estructura del JSON final
        const hojaRuta = {
            Hoja_Ruta: [
                {
                    ID_CAB: text,
                    Fecha: cabeceraConDetalles.cabecera.Fecha || "",
                    Hora_Salida: cabeceraConDetalles.cabecera.Hora_Salida || "",
                    Cerrado: cabeceraConDetalles.cabecera.Cerrado === "TRUE",
                    Detalles: cabeceraConDetalles.detalles.map(det => ({
                        ID_DET: det.ID_DET || "",
                        COD_CLI: det.COD_CLI || "",
                        Cliente: det.Cliente || "",
                        Telefono: det.Cli_Telefono || "",
                        Comprobante: {
                            Letra: det.Comprobante_Letra || "",
                            Punto_Venta: det.Comprobante_PV || "",
                            Numero: det.Comprobante_Numero || "",
                        },
                        Direccion_Entrega: det.Direccion_Entrega || "",
                        Localidad: det.Localidad || "",
                        Observaciones: det.Observaciones || "",
                        Vendedor: det.Vendedor || "",
                        Telefono_vendedor: det.Ven_Telefono || "",
                        Condicion_Pago: det.Condición_Pago|| "",
                        Estado: det.Estado || "",
                        Incidencia: det.Incidencia || "",
                        Path: det.Path || "",
                    })),
                    Detalle_Actual: [], // <- aquí iran la actual entrega
                    Detalles_Completados: [] // <- aquí podés ir empujando los entregados
                }
            ],
            Chofer: {
                Nombre: cabeceraConDetalles.cabecera.Chofer || "",
                Telefono: cabeceraConDetalles.cabecera.Cho_Telefono || "",
                Patente: cabeceraConDetalles.cabecera.Patente || ""
            }
        };

        if (cabeceraConDetalles.cabecera.Cerrado === "TRUE") {
            return { msg: "❌ Error la hoja de ruta se encuentra cerrada", operacion:false };
        }

        return { hojaRuta: hojaRuta, operacion:true };

    } catch (error) {
        console.error(`❌ Error al obtener la hoja`, error);
        return { Success: false, msg: error.message };
    }
}

module.exports = BuscarHoja;