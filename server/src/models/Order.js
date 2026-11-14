import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  syncVersion: { type: String, required: true, index: true },
  rowNumber: { type: Number, required: true },
  stt: { type: String, default: '' },
  sourceFileId: { type: String, required: true },
  orderNo: { type: String, default: '' },
  po: { type: String, default: '' },
  style: { type: String, default: '' },
  itemCode: { type: String, default: '' },
  quantity: { type: String, default: '' },
  etd: { type: String, default: '' },
  supplier: { type: String, default: '' },
  received: { type: String, default: '' },
  receivedQty: { type: String, default: '' },
  shortage: { type: String, default: '' },
  materialIssuedDate: { type: String, default: '' },
  issuedQty: { type: String, default: '' },
  stock: { type: String, default: '' },
  note: { type: String, default: '' },
  normalizedPo: { type: String, default: '' },
  normalizedStyle: { type: String, default: '' },
}, { versionKey: false });

orderSchema.index({ syncVersion: 1, rowNumber: 1 }, { unique: true });
orderSchema.index({ syncVersion: 1, normalizedPo: 1 });
orderSchema.index({ syncVersion: 1, normalizedStyle: 1 });

export default mongoose.model('Order', orderSchema);
