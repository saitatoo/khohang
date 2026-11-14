import { Router } from 'express';
import express from 'express';
import Order from '../models/Order.js';
import OrderSyncState from '../models/OrderSyncState.js';
import { requireAdmin, requireAuth } from '../middleware/requireAuth.js';
import { getOrderSyncStatus, normalizeOrderValue, syncUploadedOrders } from '../services/orderSync.js';

const router = Router();

router.get('/sync/status', requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    res.json(await getOrderSyncStatus());
  } catch (error) {
    next(error);
  }
});

router.post('/sync/upload', requireAuth, requireAdmin, express.raw({ type: 'application/octet-stream', limit: '20mb' }), async (req, res, next) => {
  try {
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      return res.status(400).json({ message: 'Vui lòng chọn file Excel .xlsx để đồng bộ.' });
    }
    const fileName = decodeURIComponent(req.get('x-file-name') || 'orders.xlsx');
    if (!fileName.toLowerCase().endsWith('.xlsx')) {
      return res.status(400).json({ message: 'Chỉ hỗ trợ file Excel .xlsx.' });
    }
    res.json(await syncUploadedOrders(req.body, fileName));
  } catch (error) {
    next(error);
  }
});

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const style = normalizeOrderValue(req.query.style);
    const po = normalizeOrderValue(req.query.po);
    if (!style && !po) return res.status(400).json({ message: 'Nhập hình thể hoặc PO để tra cứu.' });

    const state = await OrderSyncState.findById('orders').lean();
    if (!state?.activeVersion) {
      return res.status(503).json({ message: 'Chưa có dữ liệu đơn hàng. Quản trị viên cần tải file Excel lên để đồng bộ.' });
    }

    const conditions = [{ syncVersion: state.activeVersion }];
    if (style) conditions.push({ normalizedStyle: { $regex: style } });
    if (po) conditions.push({ normalizedPo: { $regex: po } });
    const orders = await Order.find({ $and: conditions })
      .sort({ rowNumber: 1 })
      .limit(500)
      .lean();
    res.json({
      orders: orders.map(({ _id, syncVersion, normalizedPo, normalizedStyle, sourceFileId, ...order }) => ({ ...order, id: `${order.rowNumber}-${order.po}-${order.style}` })),
      source: { name: state.sourceFileName, modifiedTime: state.sourceModifiedTime, syncedAt: state.syncedAt },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
