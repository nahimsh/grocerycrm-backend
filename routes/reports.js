const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

console.log('✅ Reports route file loaded');

// Get or create models
function getModel(modelName, schema) {
    try {
        return mongoose.model(modelName);
    } catch {
        return mongoose.model(modelName, schema);
    }
}

// Define schemas if models don't exist
const productSchema = new mongoose.Schema({
    name: String,
    category: String,
    price: Number,
    purchasePrice: Number,
    stock: Number,
    unit: String,
    lowStockThreshold: { type: Number, default: 10 }
}, { timestamps: true });

const saleSchema = new mongoose.Schema({
    invoiceId: String,
    customer: {
        name: String,
        phone: String,
        email: String
    },
    items: [{
        productId: mongoose.Schema.Types.ObjectId,
        name: String,
        quantity: Number,
        price: Number,
        purchasePrice: Number
    }],
    subtotal: Number,
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: Number,
    paymentMethod: String,
    status: { type: String, default: 'completed' }
}, { timestamps: true });

const customerSchema = new mongoose.Schema({
    name: String,
    phone: String,
    email: String,
    address: String
}, { timestamps: true });

const paymentSchema = new mongoose.Schema({
    invoiceId: String,
    customer: { name: String, phone: String },
    amount: Number,
    paidAmount: { type: Number, default: 0 },
    method: String,
    status: String,
    dueDate: Date,
    paidDate: Date
}, { timestamps: true });

// Initialize models
const Product = getModel('Product', productSchema);
const Sale = getModel('Sale', saleSchema);
const Customer = getModel('Customer', customerSchema);
const Payment = getModel('Payment', paymentSchema);

// ============================================
// DASHBOARD ENDPOINT
// ============================================
router.get('/dashboard', async (req, res) => {
    try {
        console.log('📊 Dashboard endpoint called');
        
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        const startOfToday = new Date(today.setHours(0, 0, 0, 0));

        // Current month sales
        const currentMonthSales = await Sale.find({
            createdAt: { $gte: startOfMonth },
            status: 'completed'
        });
        
        // Last month sales
        const lastMonthSales = await Sale.find({
            createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
            status: 'completed'
        });

        // Today's sales
        const todaySales = await Sale.find({
            createdAt: { $gte: startOfToday },
            status: 'completed'
        });

        // Calculate revenue
        const totalRevenue = currentMonthSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        const lastMonthRevenue = lastMonthSales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        const todayRevenue = todaySales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        const revenueChange = lastMonthRevenue > 0 
            ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
            : 0;

        // Product statistics
        const totalProducts = await Product.countDocuments();
        const lowStockProducts = await Product.countDocuments({
            $expr: { $lte: ['$stock', '$lowStockThreshold'] }
        });
        const criticalStockProducts = await Product.countDocuments({ stock: { $lte: 5 } });
        const outOfStockProducts = await Product.countDocuments({ stock: 0 });
        
        // Inventory value
        const allProducts = await Product.find();
        const inventoryValue = allProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);
        const purchaseValue = allProducts.reduce((sum, p) => {
            const purchasePrice = p.purchasePrice || (p.price * 0.7);
            return sum + (purchasePrice * p.stock);
        }, 0);

        // Customer statistics
        const totalCustomers = await Customer.countDocuments();
        const newCustomersThisMonth = await Customer.countDocuments({
            createdAt: { $gte: startOfMonth }
        });

        // Payment statistics
        const pendingPayments = await Payment.find({ 
            status: { $in: ['pending', 'partial'] } 
        });
        const totalPending = pendingPayments.reduce((sum, p) => sum + (p.amount - (p.paidAmount || 0)), 0);
        const overduePayments = await Payment.find({
            status: { $ne: 'paid' },
            dueDate: { $lt: today }
        });

        // Calculate profit
        const profitThisMonth = currentMonthSales.reduce((sum, sale) => {
            const saleProfit = sale.items.reduce((itemSum, item) => {
                const purchasePrice = item.purchasePrice || (item.price * 0.7);
                return itemSum + ((item.price - purchasePrice) * item.quantity);
            }, 0);
            return sum + saleProfit;
        }, 0);

        const avgOrderValue = currentMonthSales.length > 0 
            ? totalRevenue / currentMonthSales.length 
            : 0;

        console.log(`✅ Dashboard data: Revenue=₹${totalRevenue}, Sales=${currentMonthSales.length}, Products=${totalProducts}`);

        res.json({
            revenue: {
                current: Math.round(totalRevenue),
                change: parseFloat(revenueChange),
                lastMonth: Math.round(lastMonthRevenue),
                today: Math.round(todayRevenue),
                profit: Math.round(profitThisMonth),
                profitMargin: totalRevenue > 0 ? ((profitThisMonth / totalRevenue) * 100).toFixed(1) : 0
            },
            sales: {
                count: currentMonthSales.length,
                today: todaySales.length,
                avgOrderValue: Math.round(avgOrderValue),
                lastMonthCount: lastMonthSales.length
            },
            products: {
                total: totalProducts,
                lowStock: lowStockProducts,
                criticalStock: criticalStockProducts,
                outOfStock: outOfStockProducts,
                inventoryValue: Math.round(inventoryValue),
                purchaseValue: Math.round(purchaseValue),
                potentialProfit: Math.round(inventoryValue - purchaseValue)
            },
            customers: {
                total: totalCustomers,
                newThisMonth: newCustomersThisMonth
            },
            payments: {
                pending: Math.round(totalPending),
                count: pendingPayments.length,
                overdue: overduePayments.length,
                overdueAmount: Math.round(overduePayments.reduce((sum, p) => sum + (p.amount - (p.paidAmount || 0)), 0))
            }
        });
    } catch (error) {
        console.error('❌ Dashboard error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// SALES REPORT
// ============================================
router.get('/sales', async (req, res) => {
    try {
        const { startDate, endDate, customer, status, limit = 100 } = req.query;
        
        let query = {};
        
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            };
        }
        
        if (customer) {
            query.$or = [
                { 'customer.name': new RegExp(customer, 'i') },
                { 'customer.phone': new RegExp(customer, 'i') }
            ];
        }
        
        if (status) {
            query.status = status;
        }

        const sales = await Sale.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        const totalAmount = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        const totalItems = sales.reduce((sum, sale) => 
            sum + sale.items.reduce((s, i) => s + i.quantity, 0), 0);
        const totalProfit = sales.reduce((sum, sale) => {
            const saleProfit = sale.items.reduce((itemSum, item) => {
                const purchasePrice = item.purchasePrice || (item.price * 0.7);
                return itemSum + ((item.price - purchasePrice) * item.quantity);
            }, 0);
            return sum + saleProfit;
        }, 0);

        res.json({
            sales,
            summary: {
                totalSales: sales.length,
                totalAmount: Math.round(totalAmount),
                totalItems,
                totalProfit: Math.round(totalProfit),
                avgOrderValue: sales.length > 0 ? Math.round(totalAmount / sales.length) : 0,
                profitMargin: totalAmount > 0 ? ((totalProfit / totalAmount) * 100).toFixed(1) : 0
            }
        });
    } catch (error) {
        console.error('❌ Sales report error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================
// PAYMENTS REPORT
// ============================================
router.get('/payments', async (req, res) => {
    try {
        const { startDate, endDate, method, status, limit = 100 } = req.query;
        
        let query = {};
        
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            };
        }
        
        if (method) query.method = method;
        if (status) query.status = status;

        const payments = await Payment.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        const totalPaid = payments
            .filter(p => p.status === 'paid')
            .reduce((sum, p) => sum + (p.amount || 0), 0);
        const totalPending = payments
            .filter(p => p.status !== 'paid')
            .reduce((sum, p) => sum + ((p.amount || 0) - (p.paidAmount || 0)), 0);

        const byMethod = {
            cash: payments.filter(p => p.method === 'cash').reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0),
            card: payments.filter(p => p.method === 'card').reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0),
            upi: payments.filter(p => p.method === 'upi').reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0),
            credit: payments.filter(p => p.method === 'credit').reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0)
        };

        res.json({
            payments,
            summary: {
                totalPayments: payments.length,
                totalPaid: Math.round(totalPaid),
                totalPending: Math.round(totalPending),
                byMethod: {
                    cash: Math.round(byMethod.cash),
                    card: Math.round(byMethod.card),
                    upi: Math.round(byMethod.upi),
                    credit: Math.round(byMethod.credit)
                }
            }
        });
    } catch (error) {
        console.error('❌ Payments report error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add all other endpoints (inventory, revenue-trends, top-products, etc.)
// Copy from the previous full version I provided

router.get('/inventory', async (req, res) => {
    try {
        const products = await Product.find();
        res.json({ products, summary: { totalProducts: products.length } });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/revenue-trends', async (req, res) => {
    try {
        res.json([]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/top-products', async (req, res) => {
    try {
        res.json([]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/top-customers', async (req, res) => {
    try {
        res.json([]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/category-performance', async (req, res) => {
    try {
        res.json([]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/profit-analysis', async (req, res) => {
    try {
        res.json({ totalRevenue: 0, totalProfit: 0 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/customer-lifetime-value', async (req, res) => {
    try {
        res.json([]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/stock-forecast', async (req, res) => {
    try {
        res.json([]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/export', async (req, res) => {
    try {
        res.json({ success: true, message: 'Export coming soon' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

console.log('✅ All reports routes registered');

module.exports = router;
