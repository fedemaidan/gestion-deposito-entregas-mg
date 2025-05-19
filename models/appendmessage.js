'use strict';
module.exports = (sequelize, DataTypes) => {
  const AppendMessage = sequelize.define('AppendMessage', {
    userId: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    ultimoMensaje: {
      type: DataTypes.JSONB,
      allowNull: false,
    }
  }, {});
  return AppendMessage;
};
