const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Transaction = sequelize.define('Transaction', {
    amount: { type: DataTypes.FLOAT, allowNull: false },
    type: { type: DataTypes.ENUM('deposit', 'withdraw', 'transfer'), allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'completed', 'failed'), defaultValue: 'pending' },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    description: { type: DataTypes.STRING }
});

module.exports = Transaction;