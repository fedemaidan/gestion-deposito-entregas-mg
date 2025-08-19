const { obtenerHojaRutaPorID } = require('../../../../services/google/Sheets/hojaDeruta');
const formatearTelefono = require('../../../Chatgpt/formatearTelefono');

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

// ☎️ Siempre devuelve un string: número formateado o "ERROR"
async function telefonoFormateadoOrERROR(valor) {
  console.log(`Formateando teléfono: ${valor}`);
  const original = (valor ?? "").toString().trim();

  // Si viene vacío, devolvemos vacío (no tocamos nada)
  if (!original) return "";

  try {
    const r = await formatearTelefono(original);
    const telRaw = r?.data?.Telefono;

    // Si la API devolvió exactamente "", conservar ""
    if (telRaw === "") return "";

    // Si devolvió "ERROR" (por compatibilidad con versiones anteriores), lo convertimos a ""
    if (typeof telRaw === "string" && telRaw.toUpperCase() === "ERROR") return "";

    // Si llega un string no vacío, lo devolvemos trim
    if (typeof telRaw === "string" && telRaw.trim() !== "") return telRaw.trim();

    // Cualquier otro caso raro => vacío
    return "";
  } catch {
    // Ante cualquier excepción, devolvemos vacío para no romper el flujo
    return "";
  }
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

        // ☎️ Formatear teléfonos de Chofer y Logística
        const telChoferFmt = await telefonoFormateadoOrERROR(cabecera.Chofer_Celular || "");
        const telLogisticaFmt = await telefonoFormateadoOrERROR(cabecera.Telefono_Logistica || "");

        // ☎️ Formatear teléfonos de cada Detalle (cliente y vendedor)
        const detallesFormateados = await Promise.all(
            detallesConGrupo.map(async det => {
                const telClienteFmt = await telefonoFormateadoOrERROR(det.Cliente_Celular || "");
                const telVendedorFmt = await telefonoFormateadoOrERROR(det.Vendedor_Celular || "");

                return {
                    ID_DET: det.ID_DET || "",
                    COD_CLI: det.COD_CLI || "",
                    Cliente: det.Cliente || "",
                    Telefono: telClienteFmt,
                    Comprobante: {
                        Letra: det.Comprobante_Letra || "",
                        Punto_Venta: det.Comprobante_PV || "",
                        Numero: det.Comprobante_Numero || "",
                    },
                    Direccion_Entrega: det.Direccion_Entrega || "",
                    Localidad: det.Localidad || "",
                    Observaciones: det.Observaciones || "",
                    Vendedor: det.Vendedor || "",
                    Telefono_vendedor: telVendedorFmt,
                    Condicion_Pago: det["Condición_Pago"] || "",
                    Estado: det.Estado || "",
                    Incidencia: det.Incidencia || "",
                    Imagen: det.Imagen || "",
                    codigo_grupo: det.codigo_grupo || "",
                    Tiene_Estado: !!(det.Estado && String(det.Estado).trim() !== "")
                };
            })
        );

        // Construcción del JSON final (misma estructura)
        const hojaRuta = {
            confirmado: false,
            Hoja_Ruta: [
                {
                    ID_CAB: text,
                    Fecha: cabecera.Fecha || "",
                    Hora_Salida: cabecera["Hora Salida"] || "",
                    Cerrado: String(cabecera.Cerrado).toUpperCase() === "TRUE",
                    Detalles: detallesFormateados,
                    Codigo_Grupo_Det: "",
                    Detalle_Actual: [],
                    Detalles_Completados: []
                }
            ],
            Chofer: {
                Nombre: cabecera.Chofer || "",
                Telefono: telChoferFmt,
                Patente: cabecera.Patente || "",
                Empleado: regNomina?.Empleado || cabecera.Chofer || "",
                DNI: regNomina?.DNI || "",
            },
            Vehiculo: {
                Patente: cabecera.Patente || "",
                Marca: regVehiculo?.MARCA || "",
                Modelo: regVehiculo?.MODELO || ""
            },
            Logistica: {
                Telefono: telLogisticaFmt
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
