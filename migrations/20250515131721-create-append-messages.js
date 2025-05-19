'use strict';
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AppendMessages', {
      userId: {
        type: Sequelize.STRING,
        primaryKey: true,
        allowNull: false,
      },
      ultimoMensaje: {
        type: Sequelize.JSONB, // o Sequelize.TEXT si preferís guardarlo como string
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW'),
      }
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('AppendMessages');
  }
};
