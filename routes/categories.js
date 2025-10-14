const express = require('express');
const router = express.Router();
const Category = require('../models/Category');
const Product = require('../models/Product');

// Get all categories
router.get('/', async (req, res) => {
    try {
        const categories = await Category.find().sort({ name: 1 });
        res.json(categories);
    } catch (err) {
        console.error('Error fetching categories:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get category by ID
router.get('/:id', async (req, res) => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(category);
    } catch (err) {
        console.error('Error fetching category:', err);
        res.status(500).json({ error: err.message });
    }
});

// Create new category
router.post('/', async (req, res) => {
    try {
        const category = new Category(req.body);
        await category.save();
        res.status(201).json(category);
    } catch (err) {
        console.error('Error creating category:', err);
        res.status(400).json({ error: err.message });
    }
});

// Update category
router.put('/:id', async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json(category);
    } catch (err) {
        console.error('Error updating category:', err);
        res.status(400).json({ error: err.message });
    }
});

// Delete category
router.delete('/:id', async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        console.error('Error deleting category:', err);
        res.status(500).json({ error: err.message });
    }
});

// Get unique categories from products (fallback)
router.get('/from-products/list', async (req, res) => {
    try {
        const categories = await Product.distinct('category');
        const categoryList = categories
            .filter(cat => cat && cat.trim())
            .map(cat => ({ name: cat, productCount: 0 }));
        res.json(categoryList);
    } catch (err) {
        console.error('Error fetching categories from products:', err);
        res.status(500).json({ error: err.message });
    }
});

// Clear all categories
router.delete('/clear-all/confirm', async (req, res) => {
    try {
        const result = await Category.deleteMany({});
        res.json({ 
            message: 'All categories cleared successfully',
            deletedCount: result.deletedCount 
        });
    } catch (err) {
        console.error('Error clearing categories:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
