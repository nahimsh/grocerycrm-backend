const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Safe model getters
const getSaleModel = () => {
    if (mongoose.models.Sale) return mongoose.models.Sale;
    
    const saleSchema = new mongoose.Schema({
        invoiceId: { type: String, required: true, unique: true },
        customer: {
            name: { type: String, default: 'Walk-in Customer' },
            phone: { type: String, default: '' },
            email: { type: String, default: '' }
        },
        items: [{
            productId: mongoose.Schema.Types.ObjectId,
            name: String,
            price: Number,
            purchasePrice: Number,
            quantity: Number
        }],
        subtotal: Number,
        discount: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        total: Number,
        paymentMethod: String,
        status: { type: String, default: 'completed' }
    }, { timestamps: true });
    
    return mongoose.model('Sale', saleSchema);
};

const getProductModel = () => {
    if (mongoose.models.Product) return mongoose.models.Product;
    
    const productSchema = new mongoose.Schema({
        name: String,
        price: Number,
        purchasePrice: Number,
        stock: Number,
        category: String,
        unit: String
    }, { timestamps: true });
    
    return mongoose.model('Product', productSchema);
};

const getPaymentModel = () => {
    if (mongoose.models.Payment) return mongoose.models.Payment;
    
    const paymentSchema = new mongoose.Schema({
        invoiceId: String,
        customer: Object,
        amount: Number,
        paidAmount: { type: Number, default: 0 },
        method: String,
        status: String,
        dueDate: Date,
        paidDate: Date,
        transactionId: String,
        notes: String
    }, { timestamps: true });
    
    return mongoose.model('Payment', paymentSchema);
};

// GET all sales
router.get('/', async (req, res) => {
    try {
        const Sale = getSaleModel();
        const sales = await Sale.find().sort({ createdAt: -1 }).limit(100);
        res.json(sales);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST new sale
router.post('/', async (req, res) => {
    try {
        const Sale = getSaleModel();
        const Product = getProductModel();
        const Payment = getPaymentModel();
        
        const { products, paymentMethod, customer, paidAmount: requestPaidAmount } = req.body;

        if (!products || !products.length) {
            return res.status(400).json({ error: 'Products required' });
        }

        // Calculate totals
        let subtotal = 0;
        const saleItems = [];

        for (const item of products) {
            const product = await Product.findById(item.productId);
            if (!product) {
                return res.status(400).json({ error: `Product not found` });
            }
            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Insufficient stock for ${product.name}` });
            }
            
            subtotal += product.price * item.quantity;
            saleItems.push({
                productId: product._id,
                name: product.name,
                price: product.price,
                purchasePrice: product.purchasePrice || (product.price * 0.7),
                quantity: item.quantity
            });

            // Update stock
            product.stock -= item.quantity;
            await product.save();
            console.log(`📦 Stock updated for ${product.name}: ${product.stock}`);
        }

        // Calculate total with GST (18%) and discount
        const discount = req.body.discount || 0;
        const taxAmount = subtotal * 0.18; // 18% GST
        const total = subtotal + taxAmount - discount;

        // Generate invoice ID
        const count = await Sale.countDocuments();
        const invoiceId = `INV-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

        // Create sale
        const sale = new Sale({
            invoiceId,
            customer: customer || { name: 'Walk-in Customer', phone: '', email: '' },
            items: saleItems,
            subtotal,
            discount,
            tax: taxAmount,
            total,
            paymentMethod: paymentMethod?.toLowerCase() || 'cash',
            status: 'completed'
        });

        await sale.save();
        console.log(`✅ Sale created: ${invoiceId}, Subtotal: ₹${subtotal}, Tax: ₹${taxAmount}, Total: ₹${total}`);

        // Create payment with partial payment support
        const paidAmount = requestPaidAmount || total;
        const outstanding = total - paidAmount;
        const paymentStatus = paidAmount >= total ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending');
        
        const payment = new Payment({
            invoiceId,
            customer: customer || { name: 'Walk-in Customer', phone: '', email: '' },
            amount: total,
            paidAmount: paidAmount,
            method: paymentMethod?.toLowerCase() || 'cash',
            status: paymentStatus,
            paidDate: paidAmount > 0 ? new Date() : null,
            dueDate: paidAmount < total ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
            transactionId: `TXN-${Date.now()}`,
            notes: `Auto-created from ${invoiceId}. Outstanding: ₹${outstanding.toFixed(2)}`
        });

        await payment.save();
        console.log(`💳 Payment created: ${invoiceId}, Total: ₹${total}, Paid: ₹${paidAmount}, Outstanding: ₹${outstanding}, Status: ${paymentStatus}`);

        res.status(201).json(sale);

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
