const { obtenerHojaRutaPorID } = require('../../../../services/google/Sheets/hojaDeruta');

// 🔧 Asignar códigos de grupo por (cliente+dirección)
function asignarCodigosDeGrupo(detalles) {
    const grupos = new Map();
    let contadorGrupo = 1;

    for (const det of detalles) {
        const cliente = (det.Cliente || "").trim().toLowerCase();
        const direccion = (det.Direccion_Entrega || "").trim().toLowerCase();
        const claveGrupo = `${cliente}|${direccion}`;

        if (!grupos.has(claveGrupo)) {
            grupos.set(claveGrupo, `GRUPO_${contadorGrupo.toString().padStart(3, '0')}`);
            contadorGrupo++;
        }

        det.codigo_grupo = grupos.get(claveGrupo);
    }

    return detalles;
}

// Normalizador simple para comparar textos
function norm(v = "") {
    return String(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ').trim().toUpperCase();
}

async function BuscarHoja(userId, text) {
    try {
        if (!userId || !text) {
            throw new Error("userId o text no proporcionado");
        }

        // Trae cabecera, detalles, nomina y vehiculos
        const cabeceraConDetalles = await obtenerHojaRutaPorID(text);

        if (!cabeceraConDetalles) {
            return { Success: false, msg: `No se encontró hoja con ID ${text}` };
        }

        const { cabecera, detalles, nomina = [], vehiculos = [] } = cabeceraConDetalles;

        // Matcheos:
        // 1) Chofer de cabecera con TB_NOMINA.Empleado
        const choferCab = cabecera.Chofer || "";
        const regNomina = nomina.find(n => norm(n.Empleado) === norm(choferCab)) || null;

        // 2) Patente de cabecera con TB_VEHICULOS.PATENTE
        const patenteCab = cabecera.Patente || "";
        const regVehiculo = vehiculos.find(v => norm(v.PATENTE) === norm(patenteCab)) || null;

        // Asignar códigos de grupo a los detalles
        const detallesConGrupo = asignarCodigosDeGrupo(detalles);

        // Construcción del JSON final
        const hojaRuta = {
            confirmado: false,
            Hoja_Ruta: [
                {
                    ID_CAB: text,
                    Fecha: cabecera.Fecha || "",
                    Hora_Salida: cabecera["Hora Salida"] || "",
                    Cerrado: String(cabecera.Cerrado).toUpperCase() === "TRUE",
                    Detalles: detallesConGrupo.map(det => ({
                        ID_DET: det.ID_DET || "",
                        COD_CLI: det.COD_CLI || "",
                        Cliente: det.Cliente || "",
                        Telefono: det.Cliente_Celular || "",
                        Comprobante: {
                            Letra: det.Comprobante_Letra || "",
                            Punto_Venta: det.Comprobante_PV || "",
                            Numero: det.Comprobante_Numero || "",
                        },
                        Direccion_Entrega: det.Direccion_Entrega || "",
                        Localidad: det.Localidad || "",
                        Observaciones: det.Observaciones || "",
                        Vendedor: det.Vendedor || "",
                        Telefono_vendedor: det.Vendedor_Celular || "",
                        Condicion_Pago: det["Condición_Pago"] || "",
                        Estado: det.Estado || "",
                        Incidencia: det.Incidencia || "",
                        Imagen: det.Imagen || "",
                        codigo_grupo: det.codigo_grupo || "",
                        Tiene_Estado: !!(det.Estado && String(det.Estado).trim() !== "")
                    })),
                    Codigo_Grupo_Det: "",
                    Detalle_Actual: [],
                    Detalles_Completados: []
                }
            ],
            // Chofer enriquecido + Vehículo
            Chofer: {
                Nombre: cabecera.Chofer || "",
                Telefono: cabecera.Chofer_Celular || "",
                Patente: cabecera.Patente || "",
                // ➕ Datos extra desde TB_NOMINA (si existen)
                Empleado: regNomina?.Empleado || cabecera.Chofer || "",
                DNI: regNomina?.DNI || "",
                // Podés extender acá con otros campos de TB_NOMINA si los agregan después
            },
            Vehiculo: {
                Patente: cabecera.Patente || "",
                Marca: regVehiculo?.MARCA || "",
                Modelo: regVehiculo?.MODELO || ""
                // Agregá más campos si los crean en TB_VEHICULOS
            },
            // Telefono de logística de la Cabecera por si lo necesitás centralizado
            Logistica: {
                Telefono: cabecera.Telefono_Logistica || ""
            }
        };

        if (String(cabecera.Cerrado).toUpperCase() === "TRUE") {
            return { msg: "❌ Error la hoja de ruta se encuentra cerrada", operacion: false };
        }

        return { hojaRuta, operacion: true };

    } catch (error) {
        console.error(`❌ Error al obtener la hoja`, error);
        return { Success: false, msg: error.message };
    }
}

module.exports = BuscarHoja;