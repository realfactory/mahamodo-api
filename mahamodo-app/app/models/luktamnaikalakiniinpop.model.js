  
module.exports = (sequelize, Sequelize) => {
  
    const Luktamnaikalakiniinpop = sequelize.define("luktamnaikalakiniinpop", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      KalakiniLivePops: {
        type: Sequelize.STRING
      },
      KalakiniLivePopsText: {
        type: Sequelize.STRING
      },
      PayakornText: {
        type: Sequelize.TEXT
      },
      counsel: {
        type: Sequelize.TEXT
      },
      prompt: {
        type: Sequelize.TEXT
      }
    }, {
      tableName: 'luktamnaikalakiniinpop',
      freezeTableName: true,
      timestamps: true,
    });
  
    return Luktamnaikalakiniinpop;
  };