'use strict';

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.bulkInsert('Usuarios', [
            {
                usuario: 'Ale desarrollador',
                userId: '5491149380799@s.whatsapp.net',
                permisos: JSON.stringify(['CREAR_RUTA']),
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                usuario: 'Fede owner',
                userId: '5491162948395@s.whatsapp.net',
                permisos: JSON.stringify(['CREAR_RUTA']),
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ], {});
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('Usuarios', {
            userId: ['5491112345678@s.whatsapp.net', '5491149380799@s.whatsapp.net']
        }, {});
    }
};