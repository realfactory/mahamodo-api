module.exports = (sequelize, DataTypes, tableName) => {
    const DynamicModel = sequelize.define(tableName, {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        }
        // Add other fields as needed based on your common schema structure
    }, {
        tableName,
        freezeTableName: true,
        timestamps: false,
    });

    return DynamicModel;
};