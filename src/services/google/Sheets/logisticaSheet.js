const { updateRow } = require("../General"); // Ajustá si el path es otro
const { google } = require("googleapis");
require("dotenv").config();

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });
const sheetId = process.env.GOOGLE_SHEET_ID;

/**
 * Guarda el número del encargado de logística en la hoja Cabecera.
 * @param {string} idCabecera - ID de la hoja de ruta.
 * @param {string} telefonoLogistica - Teléfono a guardar.
 */
async function guardarTelefonoLogistica(idCabecera, telefonoLogistica) {
    const cabeceraRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "Cabecera!A1:Z",
    });

    const data = cabeceraRes.data.values;
    const headers = data[0];
    const filaIndex = data.findIndex(row => row[0] === idCabecera);

    if (filaIndex === -1) {
        throw new Error(`❌ No se encontró la cabecera con ID_CAB = ${idCabecera}`);
    }

    const fila = data[filaIndex];
    const columnaIndex = headers.indexOf("Telefono_Logistica");

    // Si no existe la columna, lanzamos un error
    if (columnaIndex === -1) {
        throw new Error(`❌ La columna "Telefono_Logistica" no existe. Verificá el header de la hoja.`);
    }

    fila[columnaIndex] = telefonoLogistica;

    await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `Cabecera!A${filaIndex + 1}:Z${filaIndex + 1}`,
        valueInputOption: "RAW",
        resource: {
            values: [fila],
        },
    });

    console.log(`📞 Teléfono de logística actualizado: ${telefonoLogistica}`);
}

/**
 * Obtiene el número del encargado de logística desde la hoja Cabecera.
 * @param {string} idCabecera - ID de la hoja de ruta.
 * @returns {string|null} - Teléfono encontrado o null.
 */
async function leerTelefonoLogistica(idCabecera) {
    const cabeceraRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: "Cabecera!A1:Z",
    });

    const data = cabeceraRes.data.values;
    const headers = data[0];
    const fila = data.find(row => row[0] === idCabecera);

    if (!fila) {
        console.warn(`⚠️ No se encontró la cabecera con ID_CAB = ${idCabecera}`);
        return null;
    }

    const indexTelefono = headers.indexOf("Telefono_Logistica");
    return indexTelefono !== -1 ? fila[indexTelefono] || null : null;
}

module.exports = {
    guardarTelefonoLogistica,
    leerTelefonoLogistica
};
