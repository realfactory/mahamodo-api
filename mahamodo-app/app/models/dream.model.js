module.exports = (sequelize, Sequelize) => {
  
  const Dream = sequelize.define("dream", {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    sdream: {
      type: Sequelize.STRING
    },
    PayakornText: {
      type: Sequelize.STRING
    },
    Lot: {
      type: Sequelize.STRING
    }
  }, {
    tableName: 'dream',
    freezeTableName: true,
    timestamps: false,
  });

  return Dream;
};