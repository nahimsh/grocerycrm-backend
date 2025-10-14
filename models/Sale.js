const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
    invoiceId: { type: String, required: true, unique: true },
    customer: {
        name: { type: String, default: 'Walk-in Customer' },
        phone: { type: String, default: '' },
        email: { type: String, default: '' },
        address: { type: String, default: '' }
    },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        purchasePrice: { type: Number, default: 0 },
        quantity: { type: Number, required: true, min: 1 },
        discount: { type: Number, default: 0 }
    }],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paymentMethod: { 
        type: String, 
        enum: ['cash', 'card', 'upi', 'credit'], 
        required: true,
        lowercase: true 
    },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    cashier: { type: String, default: 'Admin Store' },
    notes: { type: String, default: 'POS Sale' },
    status: { 
        type: String, 
        enum: ['completed', 'pending', 'cancelled', 'refunded'], 
        default: 'completed',
        lowercase: true
    }
}, { timestamps: true });

// Auto-generate invoice ID
saleSchema.pre('save', async function (next) {
    if (!this.invoiceId) {
        const count = await mongoose.model('Sale').countDocuments();
        const year = new Date().getFullYear();
        this.invoiceId = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Sale', saleSchema);
