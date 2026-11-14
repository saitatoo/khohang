import mongoose from 'mongoose';

const shelfSlotSchema = new mongoose.Schema({
  position: { type: String, required: true },
  allocationId: { type: String, default: '' },
  orderNo: { type: String, default: '' },
  po: { type: String, default: '' },
  style: { type: String, default: '' },
  itemCode: { type: String, default: '' },
  etd: { type: String, default: '' },
  supplier: { type: String, default: '' },
  itemName: { type: String, default: '' },
  quantity: { type: Number, default: 0, min: 0 },
  note: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const warehouseShelfSchema = new mongoose.Schema({
  warehouse: { type: String, enum: ['Kho 1', 'Kho 2'], required: true, index: true },
  code: { type: String, required: true, trim: true, uppercase: true },
  rows: { type: Number, required: true, min: 1, max: 20, default: 2 },
  columns: { type: Number, required: true, min: 1, max: 40, default: 8 },
  sortOrder: { type: Number, default: 0 },
  slots: { type: [shelfSlotSchema], default: [] },
}, { timestamps: true, versionKey: false });

warehouseShelfSchema.index({ warehouse: 1, code: 1 }, { unique: true });

export const WarehouseShelf = mongoose.model('WarehouseShelf', warehouseShelfSchema);

const warehouseSetupSchema = new mongoose.Schema({ _id: String, initializedAt: Date }, { versionKey: false });
export const WarehouseSetup = mongoose.model('WarehouseSetup', warehouseSetupSchema);
