import mongoose from 'mongoose';
const itemSchema = new mongoose.Schema({ title: { type: String, required: true, trim: true, maxlength: 160 }, done: { type: Boolean, default: false } }, { timestamps: true });
export default mongoose.model('Item', itemSchema);
