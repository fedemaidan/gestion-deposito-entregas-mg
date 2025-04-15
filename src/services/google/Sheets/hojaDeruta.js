// hojaDeruta.js
const { updateRow } = require("../General"); // ajustá el path si es otro
const moment = require("moment");
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

async function actualizarDetalleActual(hojaRuta) {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const data = hojaRuta.Hoja_Ruta[0];
    const detalle = data.Detalle_Actual[0]; // Solo uno, como dijiste

    if (!detalle) {
        console.log('No hay Detalle_Actual para actualizar.');
        return;
    }

    const valoresDetalle = [
        data.ID_CAB,
        detalle.ID_DET || '',
        detalle.COD_CLI || '',
        detalle.Cliente || '',
        detalle.Telefono || '',
        detalle.Comprobante?.Letra || '',
        detalle.Comprobante?.Punto_Venta || '',
        detalle.Comprobante?.Numero || '',
        detalle.Direccion_Entrega || '',
        detalle.Localidad || '',
        detalle.Observaciones || '',
        detalle.Vendedor || '',
        detalle.Telefono_vendedor || '',
        detalle.Condicion_Pago || '',
        detalle.Estado || '',
        detalle.Incidencia || '',
        detalle.Path || ''
    ];

    await updateRow(sheetId, valoresDetalle, 'Detalle!A1:Z', 1, detalle.ID_DET); // ID_DET en columna B (índice 1)

    console.log(`Detalle actualizado para ID_DET: ${detalle.ID_DET}`);
}

async function actualizarHoraSalidaCabecera(hojaRuta) {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const data = hojaRuta.Hoja_Ruta[0];

    if (!data?.ID_CAB) {
        console.log("Falta ID_CAB para actualizar hora de salida.");
        return;
    }

    const horaActual = moment().format("HH:mm");

    const valoresCabecera = [
        data.ID_CAB,
        data.Fecha || '',
        hojaRuta.Chofer?.Nombre || '',
        hojaRuta.Chofer?.Telefono || '',
        hojaRuta.Chofer?.Patente || '',
        horaActual, // Hora Salida
        data.Cerrado ? 'TRUE' : 'FALSE',
        '' // Print
    ];

    await updateRow(sheetId, valoresCabecera, 'Cabecera!A1:Z', 0, data.ID_CAB);
    console.log(`🕒 Hora de salida actualizada: ${horaActual}`);
}

async function cerrarHojaDeRuta(hojaRuta) {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const data = hojaRuta.Hoja_Ruta[0];

    if (!data?.ID_CAB) {
        console.log('Falta ID_CAB para cerrar hoja de ruta.');
        return;
    }

    const valoresCabecera = [
        data.ID_CAB,
        data.Fecha || '',
        hojaRuta.Chofer?.Nombre || '',
        hojaRuta.Chofer?.Telefono || '',
        hojaRuta.Chofer?.Patente || '',
        data.Hora_Salida || '',
        'TRUE', // Cerrado = TRUE
        '' // Print (si no lo usás, dejalo así)
    ];

    await updateRow(sheetId, valoresCabecera, 'Cabecera!A1:Z', 0, data.ID_CAB);

    console.log(`✅ Hoja de ruta con ID_CAB ${data.ID_CAB} cerrada.`);
}

module.exports = {
    cerrarHojaDeRuta,
    actualizarDetalleActual,
    actualizarHoraSalidaCabecera,
    obtenerHojaRutaPorID
};
