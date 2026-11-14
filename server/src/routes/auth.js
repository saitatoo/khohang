import { Router } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { createToken, requireAuth } from '../middleware/requireAuth.js';

const router = Router();

function publicUser(user) {
  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  return { id: user.id, name: user.name, email: user.email, isAdmin: Boolean(adminEmail && user.email.toLowerCase() === adminEmail) };
}

router.post('/register', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ message: 'Tên cần có từ 2 đến 80 ký tự.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Email không hợp lệ.' });
    }
    if (password.length < 8 || password.length > 72) {
      return res.status(400).json({ message: 'Mật khẩu cần có từ 8 đến 72 ký tự.' });
    }

    const existing = await User.findOne({ email }).select('_id');
    if (existing) return res.status(409).json({ message: 'Email này đã được đăng ký.' });

    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12) });
    return res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Email này đã được đăng ký.' });
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const identifier = String(req.body?.identifier || req.body?.email || '').trim();
    const password = String(req.body?.password || '');
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { name: new RegExp(`^${identifier.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      ],
    }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng.' });
    }
    return res.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.auth.sub);
    if (!user) return res.status(401).json({ message: 'Tài khoản không còn tồn tại.' });
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

export default router;
