import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/User.js';
import { requireAdmin, requireAuth } from '../middleware/requireAuth.js';

const router = Router();
const adminEmail = () => String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();

router.use(requireAuth, requireAdmin);

router.get('/', async (_req, res, next) => {
  try {
    const admin = adminEmail();
    const users = await User.find().select('name email canManageWarehouse createdAt').sort({ name: 1, email: 1 }).lean();
    res.json(users.map(user => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      canManageWarehouse: Boolean(user.canManageWarehouse),
      isAdmin: Boolean(admin && user.email.toLowerCase() === admin),
    })));
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/warehouse-permission', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã tài khoản không hợp lệ.' });
    if (typeof req.body?.canManageWarehouse !== 'boolean') {
      return res.status(400).json({ message: 'Giá trị quyền sửa kho hàng không hợp lệ.' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy tài khoản.' });
    user.canManageWarehouse = req.body.canManageWarehouse;
    await user.save();
    const admin = adminEmail();
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      canManageWarehouse: Boolean(user.canManageWarehouse),
      isAdmin: Boolean(admin && user.email.toLowerCase() === admin),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
