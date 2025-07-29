const { google } = require('googleapis');
require('dotenv').config();

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function ResetHojaRutaCompleta(hojaRuta) {
    const sheetId = process.env.GOOGLE_SHEET_ID;

    if (!hojaRuta || !hojaRuta.Hoja_Ruta || !Array.isArray(hojaRuta.Hoja_Ruta)) {
        console.error("❌ Hoja de ruta inválida.");
        return;
    }

    const ruta = hojaRuta.Hoja_Ruta[0];
    const idCab = ruta.ID_CAB;

    // 🟨 CABECERA
    try {
        const cabResponse = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Cabecera!A1:Z',
        });

        const cabData = cabResponse.data.values;
        const headers = cabData[0];
        const filaIndex = cabData.findIndex(row => row[0] === idCab);

        if (filaIndex === -1) {
            throw new Error(`No se encontró fila con ID_CAB = ${idCab}`);
        }

        const row = cabData[filaIndex];

        const idxHoraSalida = headers.indexOf('Hora Salida');
        const idxTelefonoLogistica = headers.indexOf('Telefono_Logistica');
        const idxCerrado = headers.indexOf('Cerrado');

        if (idxHoraSalida !== -1) row[idxHoraSalida] = '';
        if (idxTelefonoLogistica !== -1) row[idxTelefonoLogistica] = '';
        if (idxCerrado !== -1) row[idxCerrado] = 'FALSE';

        await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: `Cabecera!A${filaIndex + 1}:Z${filaIndex + 1}`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: [row] }
        });

        // 🎨 Pintar de amarillo
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: sheetId,
            requestBody: {
                requests: [{
                    repeatCell: {
                        range: {
                            sheetId: 0, // ID físico de la hoja "Cabecera"
                            startRowIndex: filaIndex,
                            endRowIndex: filaIndex + 1
                        },
                        cell: {
                            userEnteredFormat: {
                                backgroundColor: { red: 1, green: 1, blue: 0 }
                            }
                        },
                        fields: 'userEnteredFormat.backgroundColor'
                    }
                }]
            }
        });

        console.log(`✅ Cabecera reseteada: ${idCab}`);
    } catch (error) {
        console.error('❌ Error al resetear cabecera:', error.message);
    }

    // 🧼 DETALLE
    try {
        const detalleRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Detalle!A1:Z',
        });

        const detData = detalleRes.data.values;
        const headers = detData[0];

        const idxObs = headers.indexOf('Observaciones');
        const idxEstado = headers.indexOf('Estado');
        const idxIncidencia = headers.indexOf('Incidencia');
        const idxImagen = headers.indexOf('Imagen');

        for (let i = 1; i < detData.length; i++) {
            const row = detData[i];
            if (row[0] !== idCab) continue;

            if (idxObs !== -1) row[idxObs] = '';
            if (idxEstado !== -1) row[idxEstado] = '';
            if (idxIncidencia !== -1) row[idxIncidencia] = '';
            if (idxImagen !== -1) row[idxImagen] = '';

            await sheets.spreadsheets.values.update({
                spreadsheetId: sheetId,
                range: `Detalle!A${i + 1}:Z${i + 1}`,
                valueInputOption: 'USER_ENTERED',
                resource: { values: [row] }
            });

            console.log(`🔁 Detalle reseteado: fila ${i + 1}`);
        }

    } catch (error) {
        console.error('❌ Error al resetear detalles:', error.message);
    }
}

module.exports = { ResetHojaRutaCompleta };
