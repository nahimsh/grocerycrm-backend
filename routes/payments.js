const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// ============================================
// PAYMENT MODEL (Inline with safe getter)
// ============================================

const getPaymentModel = () => {
    // Return existing model if already compiled
    if (mongoose.models.Payment) {
        return mongoose.models.Payment;
    }
    
    // Define Payment schema
    const paymentSchema = new mongoose.Schema({
        invoiceId: { 
            type: String, 
            required: [true, 'Invoice ID is required'],
            trim: true
        },
        customer: {
            name: { 
                type: String, 
                default: 'Walk-in Customer',
                trim: true
            },
            phone: { 
                type: String, 
                default: '',
                trim: true
            },
            email: { 
                type: String, 
                default: '',
                trim: true,
                lowercase: true
            }
        },
        amount: { 
            type: Number, 
            required: [true, 'Amount is required'],
            min: [0, 'Amount cannot be negative']
        },
        paidAmount: { 
            type: Number, 
            default: 0,
            min: [0, 'Paid amount cannot be negative']
        },
        method: { 
            type: String, 
            enum: {
                values: ['cash', 'card', 'upi', 'credit'],
                message: 'Invalid payment method'
            },
            default: 'cash',
            lowercase: true
        },
        status: { 
            type: String, 
            enum: {
                values: ['paid', 'pending', 'partial', 'overdue'],
                message: 'Invalid payment status'
            },
            default: 'pending',
            lowercase: true
        },
        dueDate: { 
            type: Date,
            default: null
        },
        paidDate: { 
            type: Date,
            default: null
        },
        transactionId: { 
            type: String,
            trim: true,
            default: ''
        },
        notes: { 
            type: String,
            trim: true,
            maxlength: [500, 'Notes cannot exceed 500 characters'],
            default: ''
        },
        products: [{
            productId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Product'
            },
            name: String,
            quantity: {
                type: Number,
                min: 1
            },
            price: {
                type: Number,
                min: 0
            }
        }]
    }, { 
        timestamps: true 
    });

    // Virtual for balance due
    paymentSchema.virtual('balance').get(function() {
        return this.amount - (this.paidAmount || 0);
    });

    // Virtual for payment progress percentage
    paymentSchema.virtual('progress').get(function() {
        if (this.amount === 0) return 0;
        return Math.round((this.paidAmount / this.amount) * 100);
    });

    return mongoose.model('Payment', paymentSchema);
};

// ============================================
// GET ALL PAYMENTS
// ============================================

router.get('/', async (req, res) => {
    try {
        const Payment = getPaymentModel();
        const { status, method, startDate, endDate } = req.query;
        
        // Build query filters
        let query = {};
        
        if (status) {
            query.status = status.toLowerCase();
        }
        
        if (method) {
            query.method = method.toLowerCase();
        }
        
        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }
        
        const payments = await Payment.find(query)
            .sort({ createdAt: -1 })
            .lean();
        
        console.log(`✅ Retrieved ${payments.length} payments`);
        res.json(payments);
        
    } catch (error) {
        console.error('❌ Error fetching payments:', error);
        res.status(500).json({ 
            error: 'Failed to fetch payments',
            message: error.message 
        });
    }
});

// ============================================
// GET SINGLE PAYMENT BY ID
// ============================================

router.get('/:id', async (req, res) => {
    try {
        const Payment = getPaymentModel();
        const payment = await Payment.findById(req.params.id)
            .populate('products.productId', 'name category price')
            .lean();
        
        if (!payment) {
            return res.status(404).json({ 
                error: 'Payment not found',
                id: req.params.id
            });
        }
        
        res.json(payment);
        
    } catch (error) {
        console.error('❌ Error fetching payment:', error);
        res.status(500).json({ 
            error: 'Failed to fetch payment',
            message: error.message 
        });
    }
});

// ============================================
// GET PAYMENT STATISTICS
// ============================================

router.get('/stats/summary', async (req, res) => {
    try {
        const Payment = getPaymentModel();
        
        // Total payments
        const totalPayments = await Payment.countDocuments();
        
        // Paid, pending, overdue counts
        const paidCount = await Payment.countDocuments({ status: 'paid' });
        const pendingCount = await Payment.countDocuments({ status: 'pending' });
        const overdueCount = await Payment.countDocuments({ status: 'overdue' });
        
        // Total amounts
        const totalAmount = await Payment.aggregate([
            { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);
        
        const paidAmount = await Payment.aggregate([
            { $group: { _id: null, total: { $sum: '$paidAmount' } } }
        ]);
        
        res.json({
            totalPayments,
            counts: {
                paid: paidCount,
                pending: pendingCount,
                overdue: overdueCount
            },
            amounts: {
                total: totalAmount[0]?.total || 0,
                paid: paidAmount[0]?.total || 0,
                outstanding: (totalAmount[0]?.total || 0) - (paidAmount[0]?.total || 0)
            }
        });
        
    } catch (error) {
        console.error('❌ Error fetching payment stats:', error);
        res.status(500).json({ 
            error: 'Failed to fetch payment statistics',
            message: error.message 
        });
    }
});

// ============================================
// CREATE NEW PAYMENT
// ============================================

router.post('/', async (req, res) => {
    try {
        const Payment = getPaymentModel();
        
        // Generate invoice ID if not provided
        if (!req.body.invoiceId) {
            const year = new Date().getFullYear();
            const count = await Payment.countDocuments();
            req.body.invoiceId = `INV-${year}-${String(count + 1).padStart(4, '0')}`;
        }
        
        // Auto-set status based on payment
        if (req.body.paidAmount >= req.body.amount) {
            req.body.status = 'paid';
            req.body.paidDate = new Date();
        } else if (req.body.paidAmount > 0) {
            req.body.status = 'partial';
        } else {
            req.body.status = 'pending';
        }
        
        const payment = new Payment(req.body);
        await payment.save();
        
        console.log('✅ Payment created:', payment.invoiceId);
        res.status(201).json(payment);
        
    } catch (error) {
        console.error('❌ Error creating payment:', error);
        res.status(400).json({ 
            error: 'Failed to create payment',
            message: error.message 
        });
    }
});

// ============================================
// UPDATE PAYMENT
// ============================================

router.put('/:id', async (req, res) => {
    try {
        const Payment = getPaymentModel();
        
        const payment = await Payment.findByIdAndUpdate(
            req.params.id,
            req.body,
            { 
                new: true, 
                runValidators: true 
            }
        );
        
        if (!payment) {
            return res.status(404).json({ 
                error: 'Payment not found',
                id: req.params.id
            });
        }
        
        console.log('✅ Payment updated:', payment.invoiceId);
        res.json(payment);
        
    } catch (error) {
        console.error('❌ Error updating payment:', error);
        res.status(400).json({ 
            error: 'Failed to update payment',
            message: error.message 
        });
    }
});

// ============================================
// RECORD PAYMENT (Partial or Full)
// ============================================

router.post('/:id/pay', async (req, res) => {
    try {
        const Payment = getPaymentModel();
        const { amount, method, transactionId, notes } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ 
                error: 'Invalid payment amount',
                message: 'Amount must be greater than 0'
            });
        }
        
        const payment = await Payment.findById(req.params.id);
        
        if (!payment) {
            return res.status(404).json({ 
                error: 'Payment not found',
                id: req.params.id
            });
        }
        
        // Calculate new paid amount
        const newPaidAmount = (payment.paidAmount || 0) + amount;
        
        // Update payment
        payment.paidAmount = newPaidAmount;
        
        if (method) {
            payment.method = method.toLowerCase();
        }
        
        if (transactionId) {
            payment.transactionId = transactionId;
        }
        
        if (notes) {
            payment.notes = (payment.notes || '') + '\n' + notes;
        }
        
        // Update status
        if (newPaidAmount >= payment.amount) {
            payment.status = 'paid';
            payment.paidDate = new Date();
        } else if (newPaidAmount > 0) {
            payment.status = 'partial';
        }
        
        await payment.save();
        
        console.log(`✅ Payment recorded: ₹${amount} for ${payment.invoiceId}`);
        res.json(payment);
        
    } catch (error) {
        console.error('❌ Error recording payment:', error);
        res.status(400).json({ 
            error: 'Failed to record payment',
            message: error.message 
        });
    }
});

// ============================================
// MARK AS OVERDUE
// ============================================

router.post('/:id/overdue', async (req, res) => {
    try {
        const Payment = getPaymentModel();
        
        const payment = await Payment.findByIdAndUpdate(
            req.params.id,
            { status: 'overdue' },
            { new: true }
        );
        
        if (!payment) {
            return res.status(404).json({ 
                error: 'Payment not found',
                id: req.params.id
            });
        }
        
        console.log('✅ Payment marked as overdue:', payment.invoiceId);
        res.json(payment);
        
    } catch (error) {
        console.error('❌ Error marking payment as overdue:', error);
        res.status(400).json({ 
            error: 'Failed to update payment status',
            message: error.message 
        });
    }
});

// ============================================
// DELETE PAYMENT
// ============================================

router.delete('/:id', async (req, res) => {
    try {
        const Payment = getPaymentModel();
        
        const payment = await Payment.findByIdAndDelete(req.params.id);
        
        if (!payment) {
            return res.status(404).json({ 
                error: 'Payment not found',
                id: req.params.id
            });
        }
        
        console.log('✅ Payment deleted:', payment.invoiceId);
        res.json({ 
            message: 'Payment deleted successfully',
            invoiceId: payment.invoiceId
        });
        
    } catch (error) {
        console.error('❌ Error deleting payment:', error);
        res.status(500).json({ 
            error: 'Failed to delete payment',
            message: error.message 
        });
    }
});

// ============================================
// CLEAR ALL PAYMENTS (Backup Feature)
// ============================================

router.delete('/clear-all/confirm', async (req, res) => {
    try {
        const Payment = getPaymentModel();
        
        const result = await Payment.deleteMany({});
        
        console.log(`✅ Cleared ${result.deletedCount} payments`);
        res.json({ 
            message: 'All payments cleared successfully',
            deletedCount: result.deletedCount 
        });
        
    } catch (error) {
        console.error('❌ Error clearing payments:', error);
        res.status(500).json({ 
            error: 'Failed to clear payments',
            message: error.message 
        });
    }
});

// ============================================
// EXPORT ROUTER
// ============================================

module.exports = router;
