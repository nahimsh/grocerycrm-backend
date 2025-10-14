const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');

console.log('✅ Settings route loaded');

// GET settings
router.get('/', async (req, res) => {
    try {
        console.log('📥 GET /api/settings - Fetching settings...');
        
        let settings = await Settings.findOne();
        
        // If no settings exist, create default settings
        if (!settings) {
            console.log('⚠️ No settings found, creating default settings...');
            settings = new Settings({});
            await settings.save();
            console.log('✅ Default settings created');
        }
        
        console.log('✅ Settings retrieved successfully');
        res.json(settings);
        
    } catch (err) {
        console.error('❌ Error fetching settings:', err);
        res.status(500).json({ error: err.message });
    }
});

// POST settings (save/update)
router.post('/', async (req, res) => {
    try {
        console.log('📤 POST /api/settings - Saving settings...');
        console.log('Request body:', req.body);
        
        let settings = await Settings.findOne();
        
        if (settings) {
            // Update existing settings
            Object.assign(settings, req.body);
            await settings.save();
            console.log('✅ Settings updated');
        } else {
            // Create new settings
            settings = new Settings(req.body);
            await settings.save();
            console.log('✅ Settings created');
        }
        
        res.json({ 
            message: 'Settings saved successfully',
            settings 
        });
        
    } catch (err) {
        console.error('❌ Error saving settings:', err);
        res.status(400).json({ error: err.message });
    }
});

module.exports = router;
