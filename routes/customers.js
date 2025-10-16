const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Safe model getters
const getCustomerModel = () => {
    if (mongoose.models.Customer) return mongoose.models.Customer;
    
    const customerSchema = new mongoose.Schema({
        name: { type: String, required: true },
        email: String,
        phone: String,
        address: String,
        city: String,
        status: { type: String, default: 'active' }
    }, { timestamps: true });
    
    return mongoose.model('Customer', customerSchema);
};

const getSaleModel = () => {
    if (mongoose.models.Sale) return mongoose.models.Sale;
    return null;
};

const getPaymentModel = () => {
    if (mongoose.models.Payment) return mongoose.models.Payment;
    return null;
};

// Get all customers with stats
router.get('/', async (req, res) => {
    try {
        const Customer = getCustomerModel();
        const Sale = getSaleModel();
        const Payment = getPaymentModel();
        
        const customers = await Customer.find().sort({ createdAt: -1 });
        
        // Add stats to each customer
        const customersWithStats = await Promise.all(customers.map(async (customer) => {
            const customerObj = customer.toObject();
            
            // Calculate stats from payments
            if (Payment) {
                const payments = await Payment.find({
                    $or: [
                        { 'customer.phone': customer.phone },
                        { 'customer.email': customer.email },
                        { 'customer.name': customer.name }
                    ]
                });
                
                let totalPurchased = 0;
                let outstanding = 0;
                let revenue = 0;
                
                payments.forEach(payment => {
                    const amount = payment.amount || 0;
                    const paid = payment.paidAmount || 0;
                    
                    totalPurchased += amount;
                    outstanding += (amount - paid);
                    revenue += paid;
                });
                
                customerObj.totalPurchased = totalPurchased;
                customerObj.outstanding = outstanding;
                customerObj.revenue = revenue;
            } else {
                customerObj.totalPurchased = 0;
                customerObj.outstanding = 0;
                customerObj.revenue = 0;
            }
            
            return customerObj;
        }));
        
        res.json(customersWithStats);
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get customer by ID with stats
router.get('/:id', async (req, res) => {
    try {
        const Customer = getCustomerModel();
        const Payment = getPaymentModel();
        
        const customer = await Customer.findById(req.params.id);
        if (!customer) return res.status(404).json({ error: 'Customer not found' });
        
        const customerObj = customer.toObject();
        
        // Calculate stats
        if (Payment) {
            const payments = await Payment.find({
                $or: [
                    { 'customer.phone': customer.phone },
                    { 'customer.email': customer.email },
                    { 'customer.name': customer.name }
                ]
            });
            
            let totalPurchased = 0;
            let outstanding = 0;
            let revenue = 0;
            
            payments.forEach(payment => {
                const amount = payment.amount || 0;
                const paid = payment.paidAmount || 0;
                
                totalPurchased += amount;
                outstanding += (amount - paid);
                revenue += paid;
            });
            
            customerObj.totalPurchased = totalPurchased;
            customerObj.outstanding = outstanding;
            customerObj.revenue = revenue;
        }
        
        res.json(customerObj);
    } catch (err) {
        console.error('Error fetching customer:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create new customer
router.post('/', async (req, res) => {
    try {
        const Customer = getCustomerModel();
        console.log('Creating customer with data:', req.body);
        
        if (req.body.status) {
            req.body.status = req.body.status.toLowerCase();
        }
        
        const customer = new Customer(req.body);
        await customer.save();
        
        console.log('Customer created successfully:', customer._id);
        res.status(201).json(customer);
    } catch (err) {
        console.error('Error creating customer:', err);
        res.status(400).json({ 
            error: err.message,
            details: err.errors ? Object.keys(err.errors).map(key => ({
                field: key,
                message: err.errors[key].message
            })) : null
        });
    }
});

// Update customer
router.put('/:id', async (req, res) => {
    try {
        const Customer = getCustomerModel();
        console.log('Updating customer:', req.params.id, 'with data:', req.body);
        
        if (req.body.status) {
            req.body.status = req.body.status.toLowerCase();
        }
        
        const updatedCustomer = await Customer.findByIdAndUpdate(
            req.params.id, 
            req.body, 
            { new: true, runValidators: true }
        );
        
        if (!updatedCustomer) return res.status(404).json({ error: 'Customer not found' });
        
        console.log('Customer updated successfully');
        res.json(updatedCustomer);
    } catch (err) {
        console.error('Error updating customer:', err);
        res.status(400).json({ 
            error: err.message,
            details: err.errors ? Object.keys(err.errors).map(key => ({
                field: key,
                message: err.errors[key].message
            })) : null
        });
    }
});

// Delete customer
router.delete('/:id', async (req, res) => {
    try {
        const Customer = getCustomerModel();
        const deletedCustomer = await Customer.findByIdAndDelete(req.params.id);
        if (!deletedCustomer) return res.status(404).json({ error: 'Customer not found' });
        
        console.log('Customer deleted successfully');
        res.json({ message: 'Customer deleted successfully' });
    } catch (err) {
        console.error('Error deleting customer:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
