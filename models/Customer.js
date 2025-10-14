const mongoose = require('mongoose');

// Prevent model recompilation error
if (mongoose.models.Customer) {
    module.exports = mongoose.models.Customer;
} else {
    const customerSchema = new mongoose.Schema({
        name: { 
            type: String, 
            required: [true, 'Customer name is required'], 
            trim: true 
        },
        phone: { 
            type: String, 
            trim: true 
        },
        email: { 
            type: String, 
            trim: true,
            lowercase: true
        },
        gstNumber: { 
            type: String, 
            trim: true 
        },
        address: { 
            type: String, 
            trim: true 
        },
        totalPurchased: { 
            type: Number, 
            default: 0,
            min: 0
        },
        outstanding: { 
            type: Number, 
            default: 0 
        },
        status: { 
            type: String, 
            enum: ['active', 'inactive'], 
            default: 'active' 
        }
    }, { 
        timestamps: true 
    });

    module.exports = mongoose.model('Customer', customerSchema);
}
