const { Flow  } = require('../../../../models');
const FlowManager = require('../../../FlowControl/FlowManager');

async function resetAllFlows() {
    try {

        const allFlows = await Flow.findAll({ attributes: ['userId'] });

        if (!allFlows.length) {
            console.log('ℹ️ No hay flows activos para resetear.');
            return { message: 'No hay flows para resetear.' };
        }

        for (const flow of allFlows) {
            const userId = flow.userId;
            console.log(`🔄 Reseteando flow para userId: ${userId}`);
            await FlowManager.resetFlow(userId);
        }

        await Flow.destroy({ where: {}, truncate: true });

        console.log('✅ Todos los flows fueron reseteados correctamente.');
        return { message: 'Todos los flows fueron reseteados correctamente.' };
    } catch (error) {
        console.error('🛑 Error al resetear los flows:', error);
        throw error;
    }
}

module.exports = resetAllFlows;
