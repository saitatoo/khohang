import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import itemRoutes from './routes/items.js';
import orderRoutes from './routes/orders.js';
import warehouseRoutes from './routes/warehouses.js';
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET phải được cấu hình trong môi trường production.');
}
if (process.env.NODE_ENV === 'production' && !process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI phải được cấu hình trong môi trường production.');
}
const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',').map(origin => origin.trim());
app.use(cors({ origin: (origin, callback) => {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  callback(new Error('Origin is not allowed by CORS.'));
} }));
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/warehouses', warehouseRoutes);
app.use((err, _req, res, _next) => { console.error(err); res.status(err.status || 500).json({ message: err.message || 'Internal server error' }); });
const port = process.env.PORT || 5000;
try { await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gom'); console.log('MongoDB connected'); }
catch (error) { console.error('MongoDB connection failed:', error.message); process.exit(1); }
app.listen(port, () => console.log(`Gom API listening on http://localhost:${port}`));
