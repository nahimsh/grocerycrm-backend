const mongoose = require('mongoose');

// Prevent model recompilation error
if (mongoose.models.Category) {
    module.exports = mongoose.models.Category;
} else {
    const categorySchema = new mongoose.Schema({
        name: {
            type: String,
            required: [true, 'Category name is required'],
            unique: true,
            trim: true,
            maxlength: [50, 'Category name cannot exceed 50 characters']
        },
        description: {
            type: String,
            trim: true,
            maxlength: [200, 'Description cannot exceed 200 characters']
        },
        icon: {
            type: String,
            default: 'fa-box',
            trim: true
        },
        color: {
            type: String,
            default: '#2563eb',
            trim: true
        },
        productCount: {
            type: Number,
            default: 0,
            min: 0
        }
    }, {
        timestamps: true
    });

    module.exports = mongoose.model('Category', categorySchema);
}
