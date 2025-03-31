const { estado } = require('../../../models');

const EstadoService = {
    async createEstado(data) {
        try {
            return await estado.create(data);
        } catch (error) {
            console.error('Error al crear estado:', error);
            throw error;
        }
    },

    async getEstadoById(id) {
        try {
            return await estado.findByPk(id);
        } catch (error) {
            console.error('Error al obtener estado:', error);
            throw error;
        }
    },

    async updateEstado(id, newData) {
        try {
            const estadoInstance = await estado.findByPk(id);
            if (!estadoInstance) throw new Error('Estado no encontrado');

            await estadoInstance.update(newData);
            return estadoInstance;
        } catch (error) {
            console.error('Error al actualizar estado:', error);
            throw error;
        }
    },

    async deleteEstado(id) {
        try {
            const estadoInstance = await estado.findByPk(id);
            if (!estadoInstance) throw new Error('Estado no encontrado');

            await estadoInstance.destroy();
            return { message: 'Estado eliminado correctamente' };
        } catch (error) {
            console.error('Error al eliminar estado:', error);
            throw error;
        }
    }
};

module.exports = EstadoService;
