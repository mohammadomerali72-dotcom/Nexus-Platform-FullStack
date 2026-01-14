const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Document = sequelize.define('Document', {
    fileName: { type: DataTypes.STRING, allowNull: false },
    fileType: { type: DataTypes.STRING },
    filePath: { type: DataTypes.STRING, allowNull: false },
    uploadedBy: { type: DataTypes.INTEGER, allowNull: false }, // User ID
    status: { 
        type: DataTypes.ENUM('Pending', 'Approved', 'Signed'), 
        defaultValue: 'Pending' 
    },
    signature: { type: DataTypes.STRING, allowNull: true } // Stores signature image path
});

module.exports = Document;