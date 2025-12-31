const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const User = sequelize.define('User', {
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { 
        type: DataTypes.ENUM('Investor', 'Entrepreneur'), 
        allowNull: false 
    },
    // --- NEW FIELDS START HERE ---
    bio: { type: DataTypes.TEXT },
    startupHistory: { type: DataTypes.TEXT }, // For Entrepreneurs
    investmentHistory: { type: DataTypes.TEXT }, // For Investors
    preferences: { type: DataTypes.STRING }
});

module.exports = User;