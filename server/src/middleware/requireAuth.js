import jwt from 'jsonwebtoken';
import User from '../models/User.js';

function getJwtSecret() {
  return process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'local-development-only-secret');
}

export function requireAuth(req, res, next) {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : '';
  if (!token) return res.status(401).json({ message: 'Vui lòng đăng nhập.' });

  try {
    req.auth = jwt.verify(token, getJwtSecret());
    next();
  } catch {
    res.status(401).json({ message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' });
  }
}

export async function requireAdmin(req, res, next) {
  const adminEmail = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  if (!adminEmail) return res.status(503).json({ message: 'ADMIN_EMAIL chưa được cấu hình trên server.' });
  try {
    const user = await User.findById(req.auth?.sub).select('email');
    if (!user || user.email.toLowerCase() !== adminEmail) {
      return res.status(403).json({ message: 'Chỉ tài khoản quản trị mới được tải file Excel để đồng bộ.' });
    }
    next();
  } catch (error) {
    next(error);
  }
}

export function createToken(user) {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) throw new Error('JWT_SECRET phải được cấu hình khi chạy production.');
  return jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });
}
