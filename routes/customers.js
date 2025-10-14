const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');

// Get all customers
router.get('/', async (req, res) => {
    try {
        const customers = await Customer.find().sort({ createdAt: -1 });
        res.json(customers);
    } catch (err) {
        console.error('Error fetching customers:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get customer by ID
router.get('/:id', async (req, res) => {
    try {
        const customer = await Customer.findById(req.params.id);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    } catch (err) {
        console.error('Error fetching customer:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create new customer
router.post('/', async (req, res) => {
    try {
        console.log('Creating customer with data:', req.body);
        const customer = new Customer(req.body);
        await customer.save();
        res.status(201).json(customer);
    } catch (err) {
        console.error('Error creating customer:', err);
        res.status(400).json({ error: err.message });
    }
});

// Update customer
router.put('/:id', async (req, res) => {
    try {
        console.log('Updating customer:', req.params.id, req.body);
        const customer = await Customer.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json(customer);
    } catch (err) {
        console.error('Error updating customer:', err);
        res.status(400).json({ error: err.message });
    }
});

// Delete customer
router.delete('/:id', async (req, res) => {
    try {
        const customer = await Customer.findByIdAndDelete(req.params.id);
        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        res.json({ message: 'Customer deleted successfully' });
    } catch (err) {
        console.error('Error deleting customer:', err);
        res.status(500).json({ error: err.message });
    }
});

// Clear all customers
router.delete('/clear-all/confirm', async (req, res) => {
    try {
        const result = await Customer.deleteMany({});
        res.json({ 
            message: 'All customers cleared successfully',
            deletedCount: result.deletedCount 
        });
    } catch (err) {
        console.error('Error clearing customers:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
