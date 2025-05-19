const { AppendMessage } = require('../../../models');
const messageResponder = require('../../Utiles/Mensajes/messageResponder');

// ✅ Crear mensaje si no existe (por userId)
async function guardarSiNoExiste(userId, mensaje) {
    const yaExiste = await AppendMessage.findByPk(userId);
    if (yaExiste) {
        console.log(`⛔ Ya existe un append para ${userId}, no se guarda de nuevo.`);
        return false;
    } else {
        await AppendMessage.upsert({
            userId,
            ultimoMensaje: mensaje
        });
        await derivarMensaje(userId, mensaje);
        console.log(`💾 Append guardado para ${userId}`);
        return true;
    }
}

async function derivarMensaje(userId, mensaje) {
    const sock = require('../SockSingleton/sockSingleton').getSock();
    await messageResponder('text', mensaje, sock, userId)
}

// ✅ Obtener todos los mensajes append guardados
async function obtenerTodos() {
    return await AppendMessage.findAll();
}

// ✅ Eliminar todos los append guardados
async function limpiarTodos() {
    await AppendMessage.destroy({ where: {} });
    console.log('🧹 Tabla AppendMessages limpiada');
}

// ✅ Eliminar uno por userId (opcional)
async function eliminarPorUserId(userId) {
    await AppendMessage.destroy({ where: { userId } });
    console.log(`🗑️ Append eliminado para ${userId}`);
}

module.exports = {
    guardarSiNoExiste,
    obtenerTodos,
    limpiarTodos,
    eliminarPorUserId
};
