const mongoose = require('mongoose');

if (mongoose.models.Settings) {
    module.exports = mongoose.models.Settings;
} else {
    const settingsSchema = new mongoose.Schema({
        general: {
            storeName: { type: String, default: 'GroceryCRM' },
            currency: { type: String, default: 'INR' },
            currencySymbol: { type: String, default: '₹' },
            timezone: { type: String, default: 'Asia/Kolkata' },
            dateFormat: { type: String, default: 'DD/MM/YYYY' },
            language: { type: String, default: 'en' },
            darkMode: { type: Boolean, default: false },
            autoSave: { type: Boolean, default: true }
        },
        business: {
            name: { type: String, default: '' },
            address: { type: String, default: '' },
            phone: { type: String, default: '' },
            email: { type: String, default: '' },
            gstNumber: { type: String, default: '' },
            panNumber: { type: String, default: '' },
            registrationNumber: { type: String, default: '' },
            website: { type: String, default: '' }
        },
        notifications: {
            lowStockAlert: { type: Boolean, default: true },
            outOfStockAlert: { type: Boolean, default: true },
            expiryAlert: { type: Boolean, default: false },
            dailySalesSummary: { type: Boolean, default: false }
        },
        inventory: {
            trackInventory: { type: Boolean, default: true },
            autoDeductStock: { type: Boolean, default: true },
            allowNegativeStock: { type: Boolean, default: false },
            batchTracking: { type: Boolean, default: false }
        },
        payments: {
            enableCash: { type: Boolean, default: true },
            enableCard: { type: Boolean, default: true },
            enableUPI: { type: Boolean, default: true },
            enableCredit: { type: Boolean, default: true },
            creditLimit: { type: Number, default: 50000 },
            creditDays: { type: Number, default: 30 }
        },
        receipt: {
            headerText: { type: String, default: 'Thank you for your purchase!' },
            footerText: { type: String, default: 'Please visit again' },
            showGST: { type: Boolean, default: true },
            showBarcode: { type: Boolean, default: false },
            autoPrint: { type: Boolean, default: false },
            receiptSize: { type: String, default: 'A4' }
        },
        backup: {
            autoBackup: { type: Boolean, default: false },
            backupFrequency: { type: String, default: 'daily' },
            lastBackupDate: { type: Date, default: null }
        },
        advanced: {
            apiUrl: { type: String, default: 'http://localhost:5000/api' },
            apiLogging: { type: Boolean, default: false },
            developerMode: { type: Boolean, default: false },
            cacheDuration: { type: Number, default: 300 }
        }
    }, { timestamps: true });

    module.exports = mongoose.model('Settings', settingsSchema);
}
