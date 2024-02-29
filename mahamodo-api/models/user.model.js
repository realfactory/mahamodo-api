const { Sequelize, DataTypes } = require('sequelize');

const sequelize = require('../config/connection');

const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    firstname: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    lastname: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
  }, {
    tableName: 'users',
    timestamps: false,
  });
  
  module.exports = User;
  