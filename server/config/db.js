const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize('nexus_db', 'root', '', {
    host: 'localhost',
    dialect: 'mysql'
});

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ XAMPP MySQL Connected...');
    } catch (err) {
        console.error('❌ Database Connection Error:', err);
    }
};

module.exports = { sequelize, connectDB };