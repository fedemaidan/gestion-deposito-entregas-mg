// hojaDeruta.js
const { updateRow } = require("../General"); // ajustá el path si es otro
const moment = require("moment-timezone");
require('dotenv').config();
const { google } = require('googleapis');

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });


async function IndicarActual(idCabecera, idDetalle) {
    const sheetId = process.env.GOOGLE_SHEET_ID;

    try {
        // Obtener la hoja de detalles
        const detalleRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Detalle!A1:Z',
        });

        const detalleData = detalleRes.data.values;
        const headersDet = detalleData[0];

        // Buscar la fila que coincide con ID_CAB e ID_DET
        const filaDetalle = detalleData.slice(1).find(row => row[0] === idCabecera && row[1] === idDetalle);

        if (!filaDetalle) {
            throw new Error(`No se encontró el detalle con ID_CAB = ${idCabecera} y ID_DET = ${idDetalle}`);
        }

        // Obtener índice de la columna "Estado" (suponiendo que es la columna 14, columna 'N')
        const estadoIndex = headersDet.indexOf('Estado');
        if (estadoIndex === -1) {
            throw new Error('No se encontró la columna "Estado"');
        }

        // Actualizar la celda en la columna "Estado" con "ACTUAL"
        filaDetalle[estadoIndex] = 'ACTUAL';

        // Actualizar la hoja de Google con el nuevo valor
        await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `Detalle!A${detalleData.indexOf(filaDetalle) + 1}:Z${detalleData.indexOf(filaDetalle) + 1}`,
            valueInputOption: 'RAW',
            resource: {
                values: [filaDetalle]
            }
        });

        console.log(`✅ Se actualizó el estado de la fila con ID_CAB = ${idCabecera} y ID_DET = ${idDetalle} a "ACTUAL"`);
    } catch (error) {
        console.error('❌ Error al actualizar el estado:', error.message);
    }
}

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

    if (typeof detalle.Path !== 'string' || detalle.Path.trim().toLowerCase() === 'null' || detalle.Path.trim().toLowerCase() === 'undefined' || detalle.Path.trim() === '') {
        detalle.Path = '';
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
        detalle.Path
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

    const horaActual = moment().tz("America/Argentina/Buenos_Aires").format("HH:mm");

    const valoresCabecera = [
        data.ID_CAB,
        data.Fecha || '',
        hojaRuta.Chofer?.Nombre || '',
        hojaRuta.Chofer?.Patente || '',
        hojaRuta.Chofer?.Telefono || '',
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

    // Obtener hoja actual para conservar valores existentes
    const { cabecera: cabeceraActual } = await obtenerHojaRutaPorID(data.ID_CAB);

    const horaExistente = cabeceraActual['Hora Salida'] || '';

    // Si no tiene hora guardada aún, usamos la del objeto si vino
    const horaFinal = horaExistente || (data.Hora_Salida || '');

    const valoresCabecera = [
        data.ID_CAB,
        data.Fecha || cabeceraActual['Fecha'] || '',
        hojaRuta.Chofer?.Nombre || cabeceraActual['Chofer'] || '',
        hojaRuta.Chofer?.Telefono || cabeceraActual['Cho_Telefono'] || '',
        hojaRuta.Chofer?.Patente || cabeceraActual['Patente'] || '',
        horaFinal,
        'TRUE', // Cerrado
        cabeceraActual['Print'] || ''
    ];

    await updateRow(sheetId, valoresCabecera, 'Cabecera!A1:Z', 0, data.ID_CAB);

    console.log(`✅ Hoja de ruta cerrada. Hora de salida: ${horaFinal || 'no registrada'}`);
}


async function ResetDetalleHoja(hojaRuta) {
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!hojaRuta || !hojaRuta.Hoja_Ruta || !Array.isArray(hojaRuta.Hoja_Ruta)) {
        console.error("❌ Estructura de hoja de ruta inválida.");
        return hojaRuta;
    }

    const ruta = hojaRuta.Hoja_Ruta[0];

    if (!ruta.Detalles || !Array.isArray(ruta.Detalles)) {
        console.warn("⚠️ No hay detalles para restablecer.");
        return hojaRuta;
    }

    for (let detalle of ruta.Detalles) {
        detalle.Estado = '';
        detalle.Incidencia = '';
        detalle.Path = '';

        const valoresDetalle = [
            ruta.ID_CAB,
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
            detalle.Path
        ];

        try {
            await updateRow(sheetId, valoresDetalle, 'Detalle!A1:Z', 1, detalle.ID_DET);
            console.log(`🔁 Detalle reseteado: ${detalle.ID_DET}`);
        } catch (err) {
            console.error(`❌ Error al resetear detalle ${detalle.ID_DET}:`, err.message);
        }
    }

    return hojaRuta;
}

module.exports = {
    ResetDetalleHoja,
    IndicarActual,
    cerrarHojaDeRuta,
    actualizarDetalleActual,
    actualizarHoraSalidaCabecera,
    obtenerHojaRutaPorID
};
