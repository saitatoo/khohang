import { randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs';
import Order from '../models/Order.js';
import OrderSyncState from '../models/OrderSyncState.js';

const BULK_BATCH_SIZE = 500;
let syncInFlight;

export function normalizeOrderValue(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
}

function headerIndex(row, matches) {
  let found = 0;
  row.eachCell({ includeEmpty: true }, (cell, column) => {
    const value = normalizeOrderValue(cellText(row, column));
    if (matches.some(match => value.includes(normalizeOrderValue(match)))) found = column;
  });
  return found;
}

function findHeader(worksheet) {
  for (let rowNumber = 1; rowNumber <= Math.min(worksheet.rowCount, 40); rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const columns = {
      stt: headerIndex(row, ['stt']),
      orderNo: headerIndex(row, ['汇鑫指令号', 'sochilenh']),
      po: headerIndex(row, ['冠军po', 'po']),
      style: headerIndex(row, ['型体号', 'hinh the', 'style']),
      itemCode: headerIndex(row, ['鞋底型号', 'sode']),
      quantity: headerIndex(row, ['订单数量双', 'sldonhang']),
      etd: headerIndex(row, ['交期etd', 'ngaygiao']),
      supplier: headerIndex(row, ['供应商', 'nhacungcap']),
      received: headerIndex(row, ['收货日期', 'ngaynhan']),
      receivedQty: headerIndex(row, ['入库数量双', 'soluongnhan']),
      shortage: headerIndex(row, ['欠数', 'sothieu']),
      materialIssuedDate: headerIndex(row, ['发料给成型部门日期', 'ngayphathoanchinh']),
      issuedQty: headerIndex(row, ['出库数量', 'slxuat']),
      stock: headerIndex(row, ['库存数量', 'tonkho']),
      note: headerIndex(row, ['备注', 'ghichu']),
    };
    if (columns.po && columns.style) return { rowNumber, columns };
  }
  throw new Error('Không tìm thấy hàng tiêu đề PO và Hình thể trong sheet 汇鑫底总进度表.');
}
function cellText(row, column) {
  if (!column) return '';

  const cell = row.getCell(column);
  // ExcelJS's `cell.text` can throw for merged cells whose master cell is blank.
  const value = cell.isMerged ? cell.master.value : cell.value;
  if (value == null) return '';
  if (typeof value === 'object') {
    if (Array.isArray(value.richText)) return value.richText.map(part => part.text || '').join('').trim();
    if ('result' in value) return String(value.result ?? '').trim();
    if ('text' in value) return String(value.text ?? '').trim();
    return '';
  }
  return String(value).trim();
}

async function parseWorkbook(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.getWorksheet('汇鑫底总进度表');
  if (!worksheet) throw new Error('Không tìm thấy sheet 汇鑫底总进度表 trong file Excel.');

  const { rowNumber: headerRowNumber, columns } = findHeader(worksheet);
  const orders = [];
  for (let rowNumber = headerRowNumber + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const order = {
      rowNumber,
      stt: cellText(row, columns.stt),
      orderNo: cellText(row, columns.orderNo),
      po: cellText(row, columns.po),
      style: cellText(row, columns.style),
      itemCode: cellText(row, columns.itemCode),
      quantity: cellText(row, columns.quantity),
      etd: cellText(row, columns.etd),
      supplier: cellText(row, columns.supplier),
      received: cellText(row, columns.received),
      receivedQty: cellText(row, columns.receivedQty),
      shortage: cellText(row, columns.shortage),
      materialIssuedDate: cellText(row, columns.materialIssuedDate),
      issuedQty: cellText(row, columns.issuedQty),
      stock: cellText(row, columns.stock),
      note: cellText(row, columns.note),
    };
    if (!order.po && !order.style && !order.orderNo) continue;
    order.normalizedPo = normalizeOrderValue(order.po);
    order.normalizedStyle = normalizeOrderValue(order.style);
    orders.push(order);
  }
  if (!orders.length) throw new Error('The first worksheet contains no order rows.');
  return orders;
}

function publicStatus(state) {
  return {
    enabled: Boolean(state?.enabled),
    syncedAt: state?.syncedAt || null,
    lastCheckedAt: state?.lastCheckedAt || null,
    rowCount: state?.rowCount || 0,
    sourceFileName: state?.sourceFileName || '',
    sourceModifiedTime: state?.sourceModifiedTime || null,
    lastError: state?.lastError || '',
  };
}

export async function getOrderSyncStatus() {
  return publicStatus(await OrderSyncState.findById('orders').lean());
}

async function saveOrders(orders, fileName) {
  try {
    const version = randomUUID();
    for (let offset = 0; offset < orders.length; offset += BULK_BATCH_SIZE) {
      const operations = orders.slice(offset, offset + BULK_BATCH_SIZE).map(order => ({
        updateOne: {
          filter: { syncVersion: version, rowNumber: order.rowNumber },
          update: { $set: { ...order, syncVersion: version, sourceFileId: fileName } },
          upsert: true,
        },
      }));
      await Order.bulkWrite(operations, { ordered: true });
    }

    const state = await OrderSyncState.findByIdAndUpdate('orders', {
      $set: {
        activeVersion: version,
        sourceFileId: fileName,
        sourceFileName: fileName,
        sourceModifiedTime: '',
        syncedAt: new Date(),
        lastCheckedAt: new Date(),
        rowCount: orders.length,
        lastError: '',
      },
      $setOnInsert: { enabled: false },
    }, { new: true, upsert: true }).lean();
    await Order.deleteMany({ syncVersion: { $ne: version } });
    return publicStatus(state);
  } catch (error) {
    await OrderSyncState.findByIdAndUpdate('orders', {
      $set: { lastCheckedAt: new Date(), lastError: error.message },
      $setOnInsert: { enabled: false },
    }, { upsert: true });
    throw error;
  }
}

export function syncUploadedOrders(buffer, fileName) {
  if (!syncInFlight) {
    syncInFlight = parseWorkbook(buffer)
      .then(orders => saveOrders(orders, fileName))
      .finally(() => { syncInFlight = null; });
  }
  return syncInFlight;
}
