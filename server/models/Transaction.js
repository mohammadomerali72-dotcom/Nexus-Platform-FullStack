const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Transaction = sequelize.define('Transaction', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    amount: { type: DataTypes.FLOAT, allowNull: false },
    type: { 
        type: DataTypes.ENUM('deposit', 'withdraw', 'transfer'), 
        allowNull: false 
    },
    status: { 
        type: DataTypes.ENUM('pending', 'completed', 'failed'), 
        defaultValue: 'pending' 
    },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.STRING, allowNull: true }
});

module.exports = Transaction;