import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import itemRoutes from './routes/items.js';
const app = express();
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/items', itemRoutes);
app.use((err, _req, res, _next) => { console.error(err); res.status(err.status || 500).json({ message: err.message || 'Internal server error' }); });
const port = process.env.PORT || 5000;
try { await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gom'); console.log('MongoDB connected'); }
catch (error) { console.error('MongoDB connection failed:', error.message); process.exit(1); }
app.listen(port, () => console.log(`Gom API listening on http://localhost:${port}`));
