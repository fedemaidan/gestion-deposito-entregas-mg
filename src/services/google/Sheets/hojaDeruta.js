const { updateRow } = require("../General");
const moment = require("moment-timezone");
require('dotenv').config();
const { google } = require('googleapis');
const enviarMensaje = require("../../EnviarMensaje/EnviarMensaje");

const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const sheets = google.sheets({ version: 'v4', auth });

// ✅ Función auxiliar
async function notificarChoferError(hojaRuta, mensaje) {
    try {
        const telefono = hojaRuta?.Chofer?.Telefono;
        if (!telefono) {
            console.warn("⚠️ No se pudo enviar el mensaje: teléfono del chofer no disponible.");
            return;
        }
        const jid = telefono.includes('@s.whatsapp.net') ? telefono : `${telefono}@s.whatsapp.net`;
        await enviarMensaje(jid, mensaje);
    } catch (err) {
        console.error("❌ Error al notificar al chofer:", err.message);
    }
}

async function obtenerHojaRutaPorID(idCabecera, hojaderuta) {
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
            console.warn(msg)
            return null;
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


async function IndicarActual(idCabecera, idDetalle, hojaderuta) {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    try {
        const detalleRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Detalle!A1:Z',
        });

        const detalleData = detalleRes.data.values;
        const headersDet = detalleData[0];

        const filaDetalle = detalleData.slice(1).find(row => row[0] === idCabecera && row[1] === idDetalle);

        if (!filaDetalle) {
            const msg = `⚠️ No se encontró el detalle con ID_CAB = *${idCabecera}* e ID_DET = *${idDetalle}*. Es posible que haya sido eliminado del Sheet.`;
            console.warn(msg);
            await notificarChoferError(hojaderuta, msg);
            return;
        }

        const estadoIndex = headersDet.indexOf('Estado');
        if (estadoIndex === -1) {
            throw new Error('No se encontró la columna "Estado"');
        }

        filaDetalle[estadoIndex] = 'ACTUAL';

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
        await notificarChoferError(hojaderuta, `❌ Error al actualizar estado del detalle *${idDetalle}*: ${error.message}, Contacta a logistica`);
    }
}

async function actualizarDetalleActual(hojaRuta) {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    const data = hojaRuta.Hoja_Ruta[0];
    const detalle = data.Detalle_Actual[0];

    if (!detalle) {
        console.log('No hay Detalle_Actual para actualizar.');
        return;
    }

    if (typeof detalle.Path !== 'string' || ['null', 'undefined', ''].includes(detalle.Path.trim().toLowerCase())) {
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

    try {
        await updateRow(sheetId, valoresDetalle, 'Detalle!A1:Z', 1, detalle.ID_DET);
        console.log(`Detalle actualizado para ID_DET: ${detalle.ID_DET}`);
    } catch (error) {
        console.error(`❌ Error al actualizar detalle ${detalle.ID_DET}:`, error.message);
        await notificarChoferError(hojaRuta, `❌ No se pudo actualizar la entrega *${detalle.ID_DET}*. Contactá a logistica. \nFaltante detalle o ID_cab.`);
    }
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
        horaActual,
        data.Cerrado ? 'TRUE' : 'FALSE',
        ''
    ];

    try {
        await updateRow(sheetId, valoresCabecera, 'Cabecera!A1:Z', 0, data.ID_CAB);
        console.log(`🕒 Hora de salida actualizada: ${horaActual}`);
    } catch (error) {
        console.error('❌ Error al actualizar hora de salida:', error.message);
        await notificarChoferError(hojaRuta, `❌ No se pudo registrar la hora de salida de la hoja *${data.ID_CAB}*. Falta Id_cab`);
    }
}

async function cerrarHojaDeRuta(hojaRuta) {
    const data = hojaRuta.Hoja_Ruta[0];
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!data?.ID_CAB) {
        console.log('Falta ID_CAB para cerrar hoja de ruta.');
        return;
    }

    try {
        const cabeceraRes = await sheets.spreadsheets.values.get({
            spreadsheetId: sheetId,
            range: 'Cabecera!A1:Z',
        });

        const rows = cabeceraRes.data.values;
        const headers = rows[0];
        const filaIndex = rows.findIndex(row => row[0] === data.ID_CAB);

        if (filaIndex === -1) {
            throw new Error(`❌ No se encontró fila con ID_CAB = ${data.ID_CAB}`);
        }

        const colCerrado = headers.indexOf("Cerrado");
        if (colCerrado === -1) {
            throw new Error(`❌ No se encontró columna "Cerrado"`);
        }

        const letraColumna = String.fromCharCode(65 + colCerrado); // A = 65
        const celda = `Cabecera!${letraColumna}${filaIndex + 1}`;

        await sheets.spreadsheets.values.update({
            spreadsheetId: sheetId,
            range: celda,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [["TRUE"]],
            },
        });

        console.log(`✅ Cerrado actualizado en ${celda}`);
    } catch (error) {
        console.error('❌ Error al cerrar hoja de ruta:', error.message);
        await notificarChoferError(hojaRuta, `❌ No se pudo cerrar la hoja de ruta *${data.ID_CAB}* correctamente. Conctacte a logistica`);
    }
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
            await notificarChoferError(hojaRuta, `❌ No se pudo restablecer la entrega *${detalle.ID_DET}*. Verificá con logistica.`);
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
