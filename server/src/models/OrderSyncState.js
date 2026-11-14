import mongoose from 'mongoose';

const orderSyncStateSchema = new mongoose.Schema({
  _id: { type: String, default: 'orders' },
  enabled: { type: Boolean, default: false },
  activeVersion: { type: String, default: '' },
  sourceFileId: { type: String, default: '' },
  sourceFileName: { type: String, default: '' },
  sourceModifiedTime: { type: String, default: '' },
  syncedAt: { type: Date, default: null },
  lastCheckedAt: { type: Date, default: null },
  rowCount: { type: Number, default: 0 },
  lastError: { type: String, default: '' },
}, { versionKey: false });

export default mongoose.model('OrderSyncState', orderSyncStateSchema);
