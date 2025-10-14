const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

// Clear mongoose models cache to prevent recompilation errors
mongoose.models = {};
mongoose.modelSchemas = {};

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// MIDDLEWARE
// ============================================

// CORS Configuration
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:5500',
        'http://127.0.0.1:5500',
        'http://localhost:8080',
        'file://',
        null
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add specific headers for file:// protocol
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    if (req.body && Object.keys(req.body).length) {
        console.log('Request Body:', req.body);
    }
    next();
});

// ============================================
// DATABASE CONNECTION
// ============================================

mongoose.connect('mongodb+srv://admin:D705KUmO6KWMm4Qf@cluster0.sawmt8q.mongodb.net/grocery-shop?retryWrites=true&w=majority&appName=Cluster0', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => {
    console.log('✅ MongoDB connected successfully');
    console.log('📦 Database: grocery-shop');
})
.catch(err => {
    console.error('❌ MongoDB connection error:', err);
    console.log('📝 Note: Make sure MongoDB is installed and running');
    console.log('💡 Start MongoDB: mongod --dbpath /path/to/data');
});

// MongoDB connection events
mongoose.connection.on('disconnected', () => {
    console.log('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
    console.log('✅ MongoDB reconnected');
});

// ============================================
// ROUTES
// ============================================

app.use('/api/products', require('./routes/products'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/reports', require('./routes/reports'));   
app.use('/api/settings', require('./routes/settings'));

// ============================================
// HEALTH CHECK ENDPOINT
// ============================================

app.get('/api/health', (req, res) => {
    res.json({
        status: 'success',
        message: 'GroceryCRM API is running!',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.floor(process.uptime()),
        dbConnection: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        database: mongoose.connection.name || 'Not connected',
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
    });
});

// ============================================
// ROOT ENDPOINT (API Documentation)
// ============================================

app.get('/', (req, res) => {
    res.json({
        message: 'GroceryCRM API Server',
        version: '1.0.0',
        description: 'Professional Grocery Wholesale Management System',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/api/health',
            products: '/api/products',
            sales: '/api/sales',
            categories: '/api/categories',
            customers: '/api/customers',
            payments: '/api/payments',
            reports: '/api/reports',
         settings: '/api/settings' 
            
        },
        documentation: {
            products: {
                'GET /api/products': 'Get all products',
                'GET /api/products/:id': 'Get product by ID',
                'POST /api/products': 'Create new product',
                'PUT /api/products/:id': 'Update product',
                'DELETE /api/products/:id': 'Delete product'
            },
            sales: {
                'GET /api/sales': 'Get all sales',
                'GET /api/sales/:id': 'Get sale by ID',
                'POST /api/sales': 'Create new sale',
                'PUT /api/sales/:id': 'Update sale',
                'DELETE /api/sales/:id': 'Delete sale'
            },
            categories: {
                'GET /api/categories': 'Get all categories',
                'POST /api/categories': 'Create new category',
                'PUT /api/categories/:id': 'Update category',
                'DELETE /api/categories/:id': 'Delete category'
            },
            customers: {
                'GET /api/customers': 'Get all customers',
                'GET /api/customers/:id': 'Get customer by ID',
                'POST /api/customers': 'Create new customer',
                'PUT /api/customers/:id': 'Update customer',
                'DELETE /api/customers/:id': 'Delete customer'
            },
            payments: {
                'GET /api/payments': 'Get all payments',
                'GET /api/payments/:id': 'Get payment by ID',
                'POST /api/payments': 'Create new payment',
                'PUT /api/payments/:id': 'Update payment',
                'POST /api/payments/:id/pay': 'Record payment',
                'DELETE /api/payments/:id': 'Delete payment'
            },
            reports: {
                'GET /api/reports/dashboard': 'Get dashboard summary',
                'GET /api/reports/sales': 'Get sales report',
                'GET /api/reports/payments': 'Get payments report',
                'GET /api/reports/inventory': 'Get inventory report',
                'GET /api/reports/revenue-trends': 'Get revenue trends (charts)',
                'GET /api/reports/top-products': 'Get top selling products',
                'GET /api/reports/top-customers': 'Get top customers',
                'GET /api/reports/category-performance': 'Get category stats',
                'GET /api/reports/profit-analysis': 'Get profit analysis',
                'GET /api/reports/customer-lifetime-value': 'Get CLV analysis',
                'GET /api/reports/stock-forecast': 'Get stock forecast',
                'POST /api/reports/export': 'Export reports'
            }
        }
    });
});

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        requestedUrl: req.originalUrl,
        method: req.method,
        availableEndpoints: [
            '/api/health',
            '/api/products',
            '/api/sales',
            '/api/categories',
            '/api/customers',
            '/api/payments',
            '/api/reports',
            '/api/settings'
        ]
    });
});

// ============================================
// ERROR HANDLING MIDDLEWARE
// ============================================

app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    console.error('Stack:', err.stack);
    
    res.status(err.status || 500).json({
        success: false,
        message: 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
        timestamp: new Date().toISOString()
    });
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', () => {
    console.log('⚠️  SIGTERM signal received: closing HTTP server');
    mongoose.connection.close(false, () => {
        console.log('✅ MongoDB connection closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('\n⚠️  SIGINT signal received: closing HTTP server');
    mongoose.connection.close(false, () => {
        console.log('✅ MongoDB connection closed');
        process.exit(0);
    });
});

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 GroceryCRM Backend Server Started Successfully!');
    console.log('='.repeat(60));
    console.log(`📡 Server running on: http://localhost:${PORT}`);
    console.log(`📊 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🔍 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📚 API Docs: http://localhost:${PORT}/`);
    console.log('='.repeat(60));
    console.log('\n📋 Available Endpoints:');
    console.log('   ✅ Products:   /api/products');
    console.log('   ✅ Sales:      /api/sales');
    console.log('   ✅ Categories: /api/categories');
    console.log('   ✅ Customers:  /api/customers');
    console.log('   ✅ Payments:   /api/payments');
    console.log('   ✅ Reports:    /api/reports');
    console.log('   ✅ Settings:   /api/settings');
    console.log('='.repeat(60));
    console.log('💡 Press Ctrl+C to stop the server\n');
});

module.exports = app;
