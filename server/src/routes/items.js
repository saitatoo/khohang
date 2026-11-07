import { Router } from 'express';
import mongoose from 'mongoose';
import Item from '../models/Item.js';
const router = Router();
router.get('/', async (_req, res, next) => { try { res.json(await Item.find().sort({ createdAt: -1 })); } catch (e) { next(e); } });
router.post('/', async (req, res, next) => { try { const title = req.body?.title?.trim(); if (!title) return res.status(400).json({ message: 'Title is required' }); res.status(201).json(await Item.create({ title })); } catch (e) { next(e); } });
router.patch('/:id', async (req, res, next) => { try { if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid item id' }); const item = await Item.findByIdAndUpdate(req.params.id, { done: Boolean(req.body?.done) }, { new: true, runValidators: true }); if (!item) return res.status(404).json({ message: 'Item not found' }); res.json(item); } catch (e) { next(e); } });
router.delete('/:id', async (req, res, next) => { try { if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid item id' }); const item = await Item.findByIdAndDelete(req.params.id); if (!item) return res.status(404).json({ message: 'Item not found' }); res.json({ message: 'Item deleted' }); } catch (e) { next(e); } });
export default router;
