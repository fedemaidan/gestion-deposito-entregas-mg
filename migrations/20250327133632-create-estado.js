'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('Estados', {
            id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                primaryKey: true,
                autoIncrement: true,
            },
            userId: {
                type: Sequelize.STRING,
                allowNull: false, // No puede ser null
            },
            hojaDeRuta: {
                type: Sequelize.JSON,
                allowNull: true, // Ajusta esto si es necesario
            },
            flow: {
                type: Sequelize.STRING,
                allowNull: false, // No puede ser null
            },
            step: {
                type: Sequelize.STRING,
                allowNull: false, // No puede ser null
            },
            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
        });
    },
    down: async (queryInterface, Sequelize) => {
        await queryInterface.dropTable('Estados');
    },
};
