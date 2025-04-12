// hojaDeruta.js

require('dotenv').config();
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function obtenerHojaRutaPorID(idCabecera) {
    const sheetId = process.env.GOOGLE_SHEET_ID;

    try {
        const [cabeceraRes, detalleRes] = await Promise.all([
            sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: 'Cabecera!A1:Z',
            }),
            sheets.spreadsheets.values.get({
                spreadsheetId: sheetId,
                range: 'Detalle!A1:Z',
            })
        ]);

        const cabeceraData = cabeceraRes.data.values;
        const detalleData = detalleRes.data.values;

        const headersCab = cabeceraData[0];
        const headersDet = detalleData[0];

        // Buscar la fila que coincide con el ID_CAB
        const filaCab = cabeceraData.find(row => row[0] === idCabecera);

        if (!filaCab) {
            throw new Error(`No se encontró la cabecera con ID_CAB = ${idCabecera}`);
        }

        // Formatear como objeto la cabecera
        const cabecera = {};
        headersCab.forEach((header, i) => {
            cabecera[header] = filaCab[i] || '';
        });

        // Filtrar los detalles que tienen ese mismo ID_CAB
        const detalles = detalleData.slice(1)
            .filter(row => row[0] === idCabecera)
            .map(row => {
                const detalleObj = {};
                headersDet.forEach((header, i) => {
                    detalleObj[header] = row[i] || '';
                });
                return detalleObj;
            });

        return { cabecera, detalles };

    } catch (error) {
        console.error('Error al obtener hoja de ruta:', error.message);
        throw error;
    }
}

module.exports = {
    obtenerHojaRutaPorID
};
