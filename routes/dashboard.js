const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
    try {
        // Total products
        const totalProducts = await Product.countDocuments();
        
        // Low stock products (less than 10)
        const lowStockProducts = await Product.countDocuments({ 
            stock: { $lt: 10 } 
        });
        
        // Total customers
        const totalCustomers = await Customer.countDocuments();
        
        // Today's sales
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todaySales = await Sale.aggregate([
            {
                $match: { createdAt: { $gte: today } }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$total' },
                    totalTransactions: { $sum: 1 }
                }
            }
        ]);

        // Monthly sales (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const monthlySales = await Sale.aggregate([
            {
                $match: { createdAt: { $gte: thirtyDaysAgo } }
            },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: '$total' },
                    totalTransactions: { $sum: 1 }
                }
            }
        ]);

        // Recent sales
        const recentSales = await Sale.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('invoiceId customer total createdAt');

        res.json({
            totalProducts,
            lowStockProducts,
            totalCustomers,
            todaySales: todaySales[0] || { totalSales: 0, totalTransactions: 0 },
            monthlySales: monthlySales[0] || { totalSales: 0, totalTransactions: 0 },
            recentSales
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
