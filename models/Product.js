const mongoose = require('mongoose');

// Prevent model recompilation error
if (mongoose.models.Product) {
    module.exports = mongoose.models.Product;
} else {
    const productSchema = new mongoose.Schema({
        name: { 
            type: String, 
            required: [true, 'Product name is required'], 
            trim: true 
        },
        category: { 
            type: String, 
            required: [true, 'Category is required'],
            trim: true 
        },
        price: { 
            type: Number, 
            required: [true, 'Price is required'], 
            min: [0, 'Price cannot be negative'] 
        },
        purchasePrice: {
            type: Number,
            default: 0,
            min: [0, 'Purchase price cannot be negative']
        },
        stock: { 
            type: Number, 
            required: [true, 'Stock is required'], 
            min: [0, 'Stock cannot be negative'],
            default: 0
        },
        unit: {
            type: String,
            enum: ['kg', 'g', 'l', 'ml', 'pcs', 'box', 'pack'],
            default: 'pcs'
        },
        lowStockThreshold: {
            type: Number,
            default: 10,
            min: [0, 'Threshold cannot be negative']
        },
        sku: {
            type: String,
            sparse: true,
            trim: true
        },
        barcode: {
            type: String,
            sparse: true,
            trim: true
        },
        description: { 
            type: String, 
            trim: true,
            maxlength: [500, 'Description cannot exceed 500 characters']
        },
        image: {
            type: String,
            default: ''
        }
    }, { 
        timestamps: true 
    });

    module.exports = mongoose.model('Product', productSchema);
}
