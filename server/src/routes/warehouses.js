import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { requireAuth } from '../middleware/requireAuth.js';
import { WarehouseSetup, WarehouseShelf } from '../models/WarehouseShelf.js';

const router = Router();
router.use(requireAuth);

async function initializeDefaultShelves() {
  const seedId = 'default-shelves-v1';
  if (!await WarehouseSetup.exists({ _id: seedId }) && !await WarehouseShelf.exists({})) {
    try {
      await WarehouseShelf.insertMany([
        { warehouse: 'Kho 1', code: 'K11', rows: 2, columns: 8, sortOrder: 1 },
        { warehouse: 'Kho 1', code: 'K12', rows: 2, columns: 8, sortOrder: 2 },
        { warehouse: 'Kho 1', code: 'K13', rows: 2, columns: 20, sortOrder: 3 },
        { warehouse: 'Kho 2', code: 'K01', rows: 2, columns: 8, sortOrder: 1 },
        { warehouse: 'Kho 2', code: 'K02', rows: 2, columns: 8, sortOrder: 2 },
        { warehouse: 'Kho 2', code: 'K03', rows: 2, columns: 20, sortOrder: 3 },
      ]);
    } catch (error) {
      if (error.code !== 11000) throw error;
    }
  }
  await WarehouseSetup.updateOne({ _id: seedId }, { $setOnInsert: { initializedAt: new Date() } }, { upsert: true });

  const layoutId = 'default-shelf-layout-v2';
  if (await WarehouseSetup.exists({ _id: layoutId })) return;
  const defaults = [
    ['Kho 1', 'K11', 8], ['Kho 1', 'K12', 8], ['Kho 1', 'K13', 20],
    ['Kho 2', 'K01', 8], ['Kho 2', 'K02', 8], ['Kho 2', 'K03', 20],
  ];
  let migrationComplete = true;
  for (const [warehouse, code, columns] of defaults) {
    const shelf = await WarehouseShelf.findOne({ warehouse, code });
    if (!shelf || (shelf.rows === 2 && shelf.columns === columns)) continue;
    const groups = new Map();
    for (const slot of shelf.slots) {
      const key = slot.allocationId || `slot-${slot.position}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(slot);
    }
    const capacity = 2 * columns;
    if (Math.min(shelf.slots.length, groups.size) > capacity) {
      migrationComplete = false;
      continue;
    }
    const slots = [];
    let positionIndex = 0;
    const slotsToPlace = shelf.slots.length <= capacity
      ? shelf.slots
      : [...groups.values()].map(group => group[0]);
    for (const source of slotsToPlace) {
      const row = Math.floor(positionIndex / columns) + 1;
      const column = (positionIndex % columns) + 1;
      slots.push({ ...source.toObject(), position: `R${row}-C${String(column).padStart(2, '0')}` });
      positionIndex += 1;
    }
    shelf.rows = 2;
    shelf.columns = columns;
    shelf.slots = slots;
    await shelf.save();
  }
  if (migrationComplete) {
    await WarehouseSetup.updateOne({ _id: layoutId }, { $setOnInsert: { initializedAt: new Date() } }, { upsert: true });
  }
}

function validWarehouse(value) {
  return value === 'Kho 1' || value === 'Kho 2';
}

function validateDimensions(rows, columns) {
  return Number.isInteger(rows) && rows >= 1 && rows <= 20
    && Number.isInteger(columns) && columns >= 1 && columns <= 40;
}

function parsePosition(position) {
  const match = /^R(\d+)-C(\d+)$/i.exec(position);
  return match ? { row: Number(match[1]), column: Number(match[2]) } : null;
}

router.get('/', async (req, res, next) => {
  try {
    await initializeDefaultShelves();
    const warehouse = req.query.warehouse;
    if (!validWarehouse(warehouse)) return res.status(400).json({ message: 'Kho không hợp lệ.' });
    res.json(await WarehouseShelf.find({ warehouse }).sort({ sortOrder: 1, code: 1 }).lean());
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { warehouse, code, rows, columns } = req.body || {};
    const normalizedCode = String(code || '').trim().toUpperCase();
    if (!validWarehouse(warehouse) || !/^[A-Z0-9_-]{2,16}$/.test(normalizedCode)) {
      return res.status(400).json({ message: 'Vui lòng nhập kho và mã kệ hợp lệ.' });
    }
    if (!validateDimensions(Number(rows), Number(columns))) {
      return res.status(400).json({ message: 'Số hàng phải từ 1–20 và số ô mỗi hàng từ 1–40.' });
    }
    const sortOrder = (await WarehouseShelf.countDocuments({ warehouse })) + 1;
    res.status(201).json(await WarehouseShelf.create({ warehouse, code: normalizedCode, rows: Number(rows), columns: Number(columns), sortOrder }));
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Mã kệ đã tồn tại trong kho này.' });
    next(error);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã kệ không hợp lệ.' });
    const shelf = await WarehouseShelf.findById(req.params.id);
    if (!shelf) return res.status(404).json({ message: 'Không tìm thấy kệ.' });
    const code = String(req.body?.code ?? shelf.code).trim().toUpperCase();
    const rows = Number(req.body?.rows ?? shelf.rows);
    const columns = Number(req.body?.columns ?? shelf.columns);
    if (!/^[A-Z0-9_-]{2,16}$/.test(code) || !validateDimensions(rows, columns)) {
      return res.status(400).json({ message: 'Mã kệ hoặc kích thước không hợp lệ.' });
    }
    const hasOutOfBoundsSlot = shelf.slots.some(slot => {
      const position = parsePosition(slot.position);
      return position && (position.row > rows || position.column > columns);
    });
    if (hasOutOfBoundsSlot) return res.status(400).json({ message: 'Không thể thu nhỏ kệ vì còn hàng ở các ô sẽ bị xóa.' });
    shelf.code = code;
    shelf.rows = rows;
    shelf.columns = columns;
    await shelf.save();
    res.json(shelf);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: 'Mã kệ đã tồn tại trong kho này.' });
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã kệ không hợp lệ.' });
    const shelf = await WarehouseShelf.findByIdAndDelete(req.params.id);
    if (!shelf) return res.status(404).json({ message: 'Không tìm thấy kệ.' });
    res.json({ message: 'Đã xóa kệ và dữ liệu hàng trong kệ.' });
  } catch (error) {
    next(error);
  }
});

router.put('/:id/orders', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã kệ không hợp lệ.' });
    const shelf = await WarehouseShelf.findById(req.params.id);
    if (!shelf) return res.status(404).json({ message: 'Không tìm thấy kệ.' });
    const positions = [...new Set((Array.isArray(req.body?.positions) ? req.body.positions : []).map(value => String(value).toUpperCase()))];
    if (!positions.length) return res.status(400).json({ message: 'Chọn ít nhất một ô trên kệ.' });
    for (const value of positions) {
      const parsed = parsePosition(value);
      if (!parsed || parsed.row > shelf.rows || parsed.column > shelf.columns) {
        return res.status(400).json({ message: `Vị trí ${value} không thuộc kệ này.` });
      }
    }
    const allocationId = String(req.body?.allocationId || '');
    const orderNo = String(req.body?.orderNo || '').trim();
    const po = String(req.body?.po || '').trim();
    const style = String(req.body?.style || '').trim();
    const itemCode = String(req.body?.itemCode || '').trim();
    const quantity = Number(req.body?.quantity);
    if (!orderNo && !po && !style) return res.status(400).json({ message: 'Nhập ít nhất số chỉ lệnh, PO hoặc hình thể.' });
    if (!Number.isFinite(quantity) || quantity < 0) return res.status(400).json({ message: 'Số lượng phải từ 0 trở lên.' });

    const occupiedElsewhere = shelf.slots.some(slot => positions.includes(slot.position)
      && slot.allocationId && slot.allocationId !== allocationId);
    if (occupiedElsewhere) return res.status(409).json({ message: 'Một hoặc nhiều ô đã thuộc đơn hàng khác. Hãy bỏ chọn các ô đó.' });

    const id = allocationId || randomUUID();
    shelf.slots = shelf.slots.filter(slot => slot.allocationId !== id && !positions.includes(slot.position));
    const orderData = {
      allocationId: id,
      orderNo,
      po,
      style,
      itemCode,
      itemName: '',
      etd: String(req.body?.etd || '').trim(),
      supplier: String(req.body?.supplier || '').trim(),
      quantity,
      note: String(req.body?.note || '').trim(),
      updatedAt: new Date(),
    };
    shelf.slots.push(...positions.map(position => ({ ...orderData, position })));
    await shelf.save();
    res.json(shelf);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/orders/:allocationId', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã kệ không hợp lệ.' });
    const shelf = await WarehouseShelf.findByIdAndUpdate(req.params.id, {
      $pull: { slots: { allocationId: req.params.allocationId } },
    }, { new: true });
    if (!shelf) return res.status(404).json({ message: 'Không tìm thấy kệ.' });
    res.json(shelf);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/slots/:position', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã kệ không hợp lệ.' });
    const shelf = await WarehouseShelf.findById(req.params.id);
    if (!shelf) return res.status(404).json({ message: 'Không tìm thấy kệ.' });
    const position = parsePosition(req.params.position);
    if (!position || position.row > shelf.rows || position.column > shelf.columns) {
      return res.status(400).json({ message: 'Vị trí ô không thuộc kệ này.' });
    }
    const orderNo = String(req.body?.orderNo || '').trim();
    const po = String(req.body?.po || '').trim();
    const style = String(req.body?.style || '').trim();
    const itemCode = String(req.body?.itemCode || '').trim();
    const quantity = Number(req.body?.quantity);
    if (!orderNo && !po && !style) return res.status(400).json({ message: 'Nhập ít nhất số chỉ lệnh, PO hoặc hình thể.' });
    if (!Number.isFinite(quantity) || quantity < 0) return res.status(400).json({ message: 'Số lượng phải từ 0 trở lên.' });
    const slot = {
      position: req.params.position.toUpperCase(),
      orderNo,
      po,
      style,
      itemCode,
      etd: String(req.body?.etd || '').trim(),
      supplier: String(req.body?.supplier || '').trim(),
      itemName: '',
      quantity,
      note: String(req.body?.note || '').trim(),
      updatedAt: new Date(),
    };
    const index = shelf.slots.findIndex(item => item.position === slot.position);
    if (index === -1) shelf.slots.push(slot);
    else shelf.slots[index] = slot;
    await shelf.save();
    res.json(shelf);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id/slots/:position', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Mã kệ không hợp lệ.' });
    const shelf = await WarehouseShelf.findByIdAndUpdate(req.params.id, {
      $pull: { slots: { position: req.params.position.toUpperCase() } },
    }, { new: true });
    if (!shelf) return res.status(404).json({ message: 'Không tìm thấy kệ.' });
    res.json(shelf);
  } catch (error) {
    next(error);
  }
});

export default router;
