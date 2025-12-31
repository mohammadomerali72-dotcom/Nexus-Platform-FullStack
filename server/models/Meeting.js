const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Meeting = sequelize.define('Meeting', {
    title: { type: DataTypes.STRING, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    time: { type: DataTypes.TIME, allowNull: false },
    investorId: { type: DataTypes.INTEGER, allowNull: false },
    entrepreneurId: { type: DataTypes.INTEGER, allowNull: false },
    status: { 
        type: DataTypes.ENUM('pending', 'accepted', 'rejected'), 
        defaultValue: 'pending' 
    }
});

module.exports = Meeting;