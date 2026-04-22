import mongoose from 'mongoose';

const lessonSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            required: true,
            enum: ['getting-started', 'trading', 'advanced', 'security', 'defi'],
        },
        difficulty: {
            type: String,
            required: true,
            enum: ['beginner', 'intermediate', 'advanced'],
        },
        type: {
            type: String,
            required: true,
            enum: ['article', 'video', 'quiz', 'interactive'],
        },
        status: {
            type: String,
            enum: ['draft', 'published', 'archived'],
            default: 'draft',
        },
        completionRate: {
            type: Number,
            default: 0,
        },
        estimatedReadTime: {
            type: Number, // in minutes
            default: 5,
        },
        tags: [{
            type: String,
        }],
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            required: false,
        },
        publishedAt: Date,
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Update lastUpdated on save
lessonSchema.pre('save', function() {
    this.lastUpdated = new Date();
});

const Lesson = mongoose.model('Lesson', lessonSchema);

export default Lesson;