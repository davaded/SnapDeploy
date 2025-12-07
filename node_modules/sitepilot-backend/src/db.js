const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');

// Initialize Sequelize
// In development with 'npm run dev', we use localhost. In Docker, we use 'mysql' service name.
const sequelize = new Sequelize(
    process.env.DB_NAME || 'sitepilot',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || 'root',
    {
        host: process.env.DB_HOST || 'localhost',
        dialect: 'mysql',
        logging: false, // Set to console.log to see SQL queries
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

// Models
const Setting = sequelize.define('Setting', {
    key: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    value: {
        type: DataTypes.JSON, // Flexible storage for settings (arrays, objects)
        allowNull: false
    }
});

const Site = sequelize.define('Site', {
    host: {
        type: DataTypes.STRING,
        primaryKey: true,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('upload', 'code'), // How was it deployed?
        defaultValue: 'upload'
    },
    deployedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    size: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
});

// Implementation of sync logic
const initDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connected.');
        await sequelize.sync({ alter: true }); // Automatically updates schema
        console.log('✅ Models synced.');

        // Initialize default settings if empty
        const config = await Setting.findByPk('allowedDomains');
        if (!config && process.env.BASE_DOMAIN) {
            await Setting.create({
                key: 'allowedDomains',
                value: [process.env.BASE_DOMAIN]
            });
            console.log('Initialized default settings from env.');
        }

    } catch (error) {
        console.error('❌ Database connection failed:', error);
        // Do not exit process, allows server to run even if DB is briefly unavailable
    }
};

module.exports = { sequelize, Setting, Site, initDB };
