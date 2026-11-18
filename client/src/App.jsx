import { Fragment, useEffect, useState } from 'react';
import { Button, Card, ConfigProvider, Dropdown, Empty, Input, Modal, Popconfirm, QRCode, Spin, Switch, Table, Typography } from 'antd';

// The frontend and API share one origin on Vercel, so API requests use /api directly.
const API_ROOT = '';

async function readApiJson(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`API đăng nhập chưa sẵn sàng (HTTP ${response.status}). Kiểm tra API server và MongoDB khi deploy.`);
  }
  return response.json();
}

const PencilIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5 4 16.5Z"/><path d="m13.8 6.7 3.5 3.5"/></svg>;
const UserIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.8 20c.4-3.5 2.5-5.4 6.2-5.4s5.8 1.9 6.2 5.4"/></svg>;
const SearchIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.2"/><path d="m15.4 15.4 4.1 4.1"/></svg>;
const MenuIcon = ({ children }) => <span className="menu-icon" aria-hidden="true">{children}</span>;

function AuthScreen({ onAuthenticated, initialError }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(initialError || '');
  const [loading, setLoading] = useState(false);
  const isRegister = mode === 'register';

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(`${API_ROOT}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isRegister ? { name, email, password } : { identifier: email, password }),
        signal: controller.signal,
      });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.message || 'Không thể đăng nhập.');
      localStorage.setItem('gom_token', result.token);
      onAuthenticated(result.user);
    } catch (requestError) {
      if (requestError.name === 'AbortError') {
        setError('Máy chủ chờ MongoDB quá lâu. Kiểm tra quyền truy cập MongoDB Atlas từ Vercel.');
        return;
      }
      setError(requestError.message || 'Không kết nối được máy chủ.');
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-cover">
        <div className="auth-logo-badge">KH</div>
        <div className="auth-cover-name">KHO HÀNG</div>
        <div className="auth-cover-caption">QUẢN LÝ KHO THÔNG MINH</div>
        <svg className="auth-cover-wave" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 19 C34 5 63 5 98 14 C139 25 179 48 222 45 C272 42 318 25 400 19 L400 60 L0 60 Z" fill="white" />
        </svg>
      </div>
      <div className="auth-content">
        <Typography.Title level={3} className="auth-title">{isRegister ? 'Tạo tài khoản' : 'Chào mừng trở lại!'}</Typography.Title>
        <Typography.Paragraph className="auth-subtitle">
          {isRegister ? 'Tạo tài khoản để bắt đầu quản lý kho hàng.' : 'Đăng nhập để tiếp tục quản lý kho hàng.'}
        </Typography.Paragraph>
        <form className="auth-form" onSubmit={submit}>
          {isRegister && <label>Tên hiển thị<Input autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="Tên của bạn" minLength={2} maxLength={80} required /></label>}
          <label>{isRegister ? 'Email' : 'Tên đăng nhập hoặc email'}<Input type={isRegister ? 'email' : 'text'} autoComplete={isRegister ? 'email' : 'username'} value={email} onChange={event => setEmail(event.target.value)} placeholder={isRegister ? 'name@example.com' : 'Tên hoặc email'} maxLength={254} required /></label>
          <label>Mật khẩu<Input.Password autoComplete={isRegister ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Ít nhất 8 ký tự" minLength={8} maxLength={72} required /></label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <Button className="auth-submit" type="primary" htmlType="submit" loading={loading} block>{isRegister ? 'Tạo tài khoản' : 'Đăng nhập'}</Button>
        </form>
        <div className="auth-switch">
          {isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
          <Button type="link" onClick={() => { setMode(isRegister ? 'login' : 'register'); setError(''); }}>
            {isRegister ? 'Đăng nhập' : 'Đăng ký ngay'}
          </Button>
        </div>
        <div className="auth-footnote">NHẬP HÀNG · XUẤT HÀNG · KIỂM SOÁT TỒN KHO</div>
      </div>
    </section>
  );
}

const isZeroValue = value => /^[+-]?0+(?:[.,]0+)?$/.test(String(value ?? '').trim());
const normalizeOrderKey = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const isNonZeroValue = value => {
  const text = String(value ?? '').trim();
  if (!text) return false;
  const number = Number(text.replace(/,/g, ''));
  return Number.isFinite(number) && number !== 0;
};
const orderRowClass = record => {
  const stockZero = isZeroValue(record.stock);
  const shortageZero = isZeroValue(record.shortage);
  if (stockZero && shortageZero) return 'zero-stock-shortage-row';
  if (isNonZeroValue(record.stock) && isNonZeroValue(record.shortage)) return 'nonzero-stock-shortage-row';
  if (isNonZeroValue(record.stock) && shortageZero) return 'stock-positive-shortage-zero-row';
  return '';
};

const orderColumns = [
  { title: 'STT', dataIndex: 'stt', key: 'stt', width: 45 },
  { title: 'PO', dataIndex: 'po', key: 'po', width: 100 },
  { title: 'Hình thể', dataIndex: 'style', key: 'style', width: 110 },
  { title: 'SL đơn hàng', dataIndex: 'quantity', key: 'quantity', width: 80 },
  { title: 'Ngày giao', dataIndex: 'etd', key: 'etd', width: 95 },
  { title: 'Nhà cung cấp', dataIndex: 'supplier', key: 'supplier', width: 110 },
  { title: 'Số đế', dataIndex: 'itemCode', key: 'itemCode', width: 110 },
  { title: 'Ngày nhận', dataIndex: 'received', key: 'received', width: 110 },
  { title: 'Số lượng nhận', dataIndex: 'receivedQty', key: 'receivedQty', width: 110 },
  { title: 'Số thiếu', dataIndex: 'shortage', key: 'shortage', width: 75 },
  { title: 'Ngày phát hoàn chỉnh', dataIndex: 'materialIssuedDate', key: 'materialIssuedDate', width: 115 },
  { title: 'SL xuất', dataIndex: 'issuedQty', key: 'issuedQty', width: 75 },
  { title: 'Tồn kho', dataIndex: 'stock', key: 'stock', width: 75 },
  { title: 'Ghi chú', dataIndex: 'note', key: 'note', width: 90 },
];

function WarehousePage({ onBack, canEditWarehouse }) {
  const [warehouse, setWarehouse] = useState('Kho 2');
  const [shelves, setShelves] = useState([]);
  const [zeroStockShortageOrders, setZeroStockShortageOrders] = useState([]);
  const [selectedShelfId, setSelectedShelfId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState('');
  const [editingShelfId, setEditingShelfId] = useState('');
  const [selectedPositions, setSelectedPositions] = useState([]);
  const [activeAllocationId, setActiveAllocationId] = useState('');
  const [editingExistingOrder, setEditingExistingOrder] = useState(false);
  const [addingOrderToOccupiedSlot, setAddingOrderToOccupiedSlot] = useState(false);
  const [batchOrderEntry, setBatchOrderEntry] = useState(false);
  const [movingOrder, setMovingOrder] = useState(null);
  const [movingFromPosition, setMovingFromPosition] = useState('');
  const [shelfForm, setShelfForm] = useState({ code: '', rows: '2', columns: '8' });
  const [slotForm, setSlotForm] = useState({ orderNo: '', po: '', style: '', itemCode: '', etd: '', supplier: '', quantity: '0', note: '' });
  const [slotOrderResults, setSlotOrderResults] = useState([]);
  const [pendingSlotOrders, setPendingSlotOrders] = useState([]);
  const [selectedCatalogOrder, setSelectedCatalogOrder] = useState(null);
  const [slotSearchBusy, setSlotSearchBusy] = useState(false);
  const [slotSearchError, setSlotSearchError] = useState('');
  const token = () => localStorage.getItem('gom_token');
  const selectedShelf = shelves.find(item => item._id === selectedShelfId) || shelves[0];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const positionCode = (level, position) => `R${level + 1}-C${String(position + 1).padStart(2, '0')}`;
  const matchesShelf = shelf => normalizedQuery && `${shelf.code} ${shelf.slots.map(slot => `${slot.position} ${slot.orderNo} ${slot.po} ${slot.style} ${slot.itemCode} ${slot.itemName} ${slot.supplier}`).join(' ')}`.toLocaleLowerCase().includes(normalizedQuery);
  const matchesSlot = (shelf, position, slot) => normalizedQuery && `${shelf.code}-${position} ${slot?.orderNo || ''} ${slot?.po || ''} ${slot?.style || ''} ${slot?.itemCode || ''} ${slot?.itemName || ''} ${slot?.supplier || ''}`.toLocaleLowerCase().includes(normalizedQuery);
  const isZeroStockShortageOrder = slot => zeroStockShortageOrders.includes(`${normalizeOrderKey(slot?.po)}|${normalizeOrderKey(slot?.style)}`);
  const searchResults = normalizedQuery ? shelves.flatMap(shelf => {
    const matchingSlots = shelf.slots.filter(slot => matchesSlot(shelf, slot.position, slot));
    const groups = new Map();
    matchingSlots.forEach(slot => {
      const orderKey = slot.allocationId || `${slot.orderNo}|${slot.po}|${slot.style}|${slot.itemCode}`;
      if (!groups.has(orderKey)) {
        const orderSlots = slot.allocationId
          ? shelf.slots.filter(candidate => candidate.allocationId === slot.allocationId)
          : shelf.slots.filter(candidate => `${candidate.orderNo}|${candidate.po}|${candidate.style}|${candidate.itemCode}` === orderKey);
        groups.set(orderKey, { shelf, slot, positions: orderSlots.map(item => item.position) });
      }
    });
    return [...groups.values()];
  }) : [];
  const selectedOrderGroups = selectedShelf ? [...selectedShelf.slots
    .filter(slot => selectedPositions.includes(slot.position))
    .reduce((groups, slot) => {
      const key = slot.allocationId || `${slot.orderNo}|${slot.po}|${slot.style}|${slot.itemCode}`;
      if (!groups.has(key)) groups.set(key, { ...slot, positions: [] });
      groups.get(key).positions.push(slot.position);
      return groups;
    }, new Map()).values()] : [];
  const kho1TopShelves = shelves.slice(0, 4);
  const kho1SideShelves = ['K13', 'K14'].map(code => shelves.find(shelf => shelf.code === code)).filter(Boolean);
  const kho1BottomShelves = shelves.slice(4).filter(shelf => !['K13', 'K14'].includes(shelf.code));

  async function loadShelves(currentWarehouse = warehouse) {
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token()}` };
      const [response, zeroOrdersResponse] = await Promise.all([
        fetch(`${API_ROOT}/api/warehouses?warehouse=${encodeURIComponent(currentWarehouse)}`, { headers }),
        fetch(`${API_ROOT}/api/orders/warehouse-zero-orders`, { headers }),
      ]);
      const [result, zeroOrdersResult] = await Promise.all([readApiJson(response), readApiJson(zeroOrdersResponse)]);
      if (!response.ok) throw new Error(result.message || 'Không tải được danh sách kệ.');
      if (!zeroOrdersResponse.ok) throw new Error(zeroOrdersResult.message || 'Không tải được trạng thái đơn hàng.');
      setShelves(result);
      setZeroStockShortageOrders([...new Set((zeroOrdersResult.orders || []).map(order => `${order.po}|${order.style}`))]);
      setSelectedShelfId(current => result.some(item => item._id === current) ? current : result[0]?._id || '');
      setError('');
    } catch (requestError) {
      setError(requestError.message || 'Không tải được danh sách kệ.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadShelves(warehouse); }, [warehouse]);

  function openNewShelf() {
    setEditingShelfId('');
    setShelfForm({ code: '', rows: '2', columns: '8' });
    setDialog('shelf');
  }

  function openEditShelf(shelf) {
    setEditingShelfId(shelf._id);
    setShelfForm({ code: shelf.code, rows: String(shelf.rows), columns: String(shelf.columns) });
    setDialog('shelf');
  }

  function toggleSlot(position) {
    setSelectedPositions(current => {
      if (current.includes(position)) return current.filter(item => item !== position);
      return [...current, position];
    });
  }

  function openOrderEditor() {
    if (!selectedShelf || !selectedPositions.length) return;
    const selectedOrders = selectedPositions
      .map(position => selectedShelf.slots.find(slot => slot.position === position))
      .filter(Boolean);
    const allocationIds = [...new Set(selectedOrders.map(slot => slot.allocationId || `legacy-${slot.position}`))];
    if (allocationIds.length > 1) {
      setError('Các ô đã chọn đang chứa nhiều đơn khác nhau. Chọn các ô của cùng một đơn để sửa.');
      return;
    }
    const order = selectedOrders[0];
    const sameOrderId = order?.allocationId || '';
    const includesOtherOrder = selectedOrders.some(slot => (slot.allocationId || '') !== sameOrderId);
    if (includesOtherOrder) {
      setError('Các ô đã chọn đang chứa nhiều đơn khác nhau.');
      return;
    }
    setError('');
    setAddingOrderToOccupiedSlot(false);
    setBatchOrderEntry(!order && selectedPositions.length === 1);
    setPendingSlotOrders([]);
    setActiveAllocationId(sameOrderId);
    setEditingExistingOrder(Boolean(order));
    setSlotForm({ orderNo: order?.orderNo || '', po: order?.po || '', style: order?.style || '', itemCode: order?.itemCode || '', etd: order?.etd || '', supplier: order?.supplier || '', quantity: String(order?.quantity ?? 0), note: order?.note || '' });
    setSlotOrderResults([]);
    setSelectedCatalogOrder(order || null);
    setSlotSearchError('');
    setDialog('slot');
  }

  function openAddOrderToOccupiedSlot() {
    if (!selectedShelf || selectedPositions.length !== 1) return;
    setError('');
    setActiveAllocationId('');
    setEditingExistingOrder(false);
    setAddingOrderToOccupiedSlot(true);
    setBatchOrderEntry(true);
    setPendingSlotOrders([]);
    setSlotForm({ orderNo: '', po: '', style: '', itemCode: '', etd: '', supplier: '', quantity: '0', note: '' });
    setSlotOrderResults([]);
    setSelectedCatalogOrder(null);
    setSlotSearchError('');
    setDialog('slot');
  }

  function openEditSelectedOrder(order) {
    setSelectedPositions([...new Set(order.positions)]);
    setError('');
    setAddingOrderToOccupiedSlot(false);
    setBatchOrderEntry(false);
    setPendingSlotOrders([]);
    setActiveAllocationId(order.allocationId || '');
    setEditingExistingOrder(true);
    setSlotForm({ orderNo: order.orderNo || '', po: order.po || '', style: order.style || '', itemCode: order.itemCode || '', etd: order.etd || '', supplier: order.supplier || '', quantity: String(order.quantity ?? 0), note: order.note || '' });
    setSlotOrderResults([]);
    setSelectedCatalogOrder(order);
    setSlotSearchError('');
    setDialog('slot');
  }

  function addSelectedOrderToBatch() {
    if (!selectedCatalogOrder) {
      setSlotSearchError('Hãy tìm và chọn đơn hàng trước.');
      return;
    }
    const quantity = Number(slotForm.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      setSlotSearchError('Số lượng đơn phải từ 0 trở lên.');
      return;
    }
    const order = {
      orderNo: slotForm.orderNo,
      po: slotForm.po,
      style: slotForm.style,
      itemCode: slotForm.itemCode,
      etd: slotForm.etd,
      supplier: slotForm.supplier,
      quantity,
      note: slotForm.note,
      sourceId: selectedCatalogOrder.id || `${slotForm.orderNo}|${slotForm.po}|${slotForm.style}`,
    };
    if (pendingSlotOrders.some(item => item.sourceId === order.sourceId)) {
      setSlotSearchError('Đơn hàng này đã có trong danh sách.');
      return;
    }
    setPendingSlotOrders(current => [...current, order]);
    setSlotForm({ orderNo: '', po: '', style: '', itemCode: '', etd: '', supplier: '', quantity: '0', note: '' });
    setSlotOrderResults([]);
    setSelectedCatalogOrder(null);
    setSlotSearchError('');
  }

  function startMovingOrder(order) {
    if (selectedPositions.length !== 1 || !selectedShelf) {
      setError('Hãy chọn riêng một ô nguồn trước khi chuyển đơn.');
      return;
    }
    setError('');
    setMovingOrder(order);
    setMovingFromPosition(selectedPositions[0]);
  }

  async function moveOrderToPosition(destinationPosition) {
    if (!movingOrder || !selectedShelf || !movingFromPosition) return;
    if (destinationPosition === movingFromPosition) {
      setError('Hãy chọn một ô đích khác ô nguồn.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${API_ROOT}/api/warehouses/${selectedShelf._id}/orders/move`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPosition: movingFromPosition,
          toPosition: destinationPosition,
          allocationId: movingOrder.allocationId || '',
          orderNo: movingOrder.orderNo || '',
          po: movingOrder.po || '',
          style: movingOrder.style || '',
          itemCode: movingOrder.itemCode || '',
        }),
      });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.message || 'Không chuyển được đơn sang ô mới.');
      setMovingOrder(null);
      setMovingFromPosition('');
      setSelectedPositions([destinationPosition]);
      await loadShelves();
    } catch (requestError) {
      setError(requestError.message || 'Không chuyển được đơn sang ô mới.');
    } finally {
      setSaving(false);
    }
  }

  async function saveShelf(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const editing = Boolean(editingShelfId);
      const response = await fetch(`${API_ROOT}/api/warehouses${editing ? `/${editingShelfId}` : ''}`, {
        method: editing ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouse, code: shelfForm.code, rows: Number(shelfForm.rows), columns: Number(shelfForm.columns) }),
      });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.message || 'Không lưu được kệ.');
      setDialog('');
      if (!editing) setSelectedShelfId(result._id);
      await loadShelves();
    } catch (requestError) {
      setError(requestError.message || 'Không lưu được kệ.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteShelf(shelf) {
    setError('');
    try {
      const response = await fetch(`${API_ROOT}/api/warehouses/${shelf._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.message || 'Không xóa được kệ.');
      if (selectedShelfId === shelf._id) setSelectedShelfId('');
      await loadShelves();
    } catch (requestError) {
      setError(requestError.message || 'Không xóa được kệ.');
    }
  }

  async function saveSlot(event) {
    event.preventDefault();
    if (batchOrderEntry && !pendingSlotOrders.length) {
      setSlotSearchError('Hãy chọn và thêm ít nhất một đơn vào danh sách.');
      return;
    }
    if (!batchOrderEntry && !editingExistingOrder && !selectedCatalogOrder) {
      setSlotSearchError('Hãy tìm và chọn đơn hàng từ danh sách trước khi lưu.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${API_ROOT}/api/warehouses/${selectedShelf._id}/orders`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...slotForm, quantity: Number(slotForm.quantity), positions: selectedPositions, allocationId: activeAllocationId, append: batchOrderEntry, orders: batchOrderEntry ? pendingSlotOrders : undefined }),
      });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.message || 'Không lưu được hàng trong ô.');
      setDialog('');
      setSelectedPositions([]);
      setActiveAllocationId('');
      setPendingSlotOrders([]);
      await loadShelves();
    } catch (requestError) {
      setError(requestError.message || 'Không lưu được hàng trong ô.');
    } finally {
      setSaving(false);
    }
  }

  async function searchOrdersForSlot() {
    const params = new URLSearchParams();
    if (slotForm.po.trim()) params.set('po', slotForm.po.trim());
    if (slotForm.style.trim()) params.set('style', slotForm.style.trim());
    if (!params.size) {
      setSlotOrderResults([]);
      setSelectedCatalogOrder(null);
      setSlotSearchError('Nhập PO hoặc Hình thể để tìm đơn hàng.');
      return;
    }
    setSlotSearchBusy(true);
    setSlotSearchError('');
    setSelectedCatalogOrder(null);
    try {
      const response = await fetch(`${API_ROOT}/api/orders?${params}`, { headers: { Authorization: `Bearer ${token()}` } });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.message || 'Không tìm được đơn hàng.');
      setSlotOrderResults(result.orders || []);
      if (!result.orders?.length) setSlotSearchError('Không tìm thấy đơn hàng khớp với PO hoặc Hình thể này.');
    } catch (requestError) {
      setSlotOrderResults([]);
      setSlotSearchError(requestError.message || 'Không tìm được đơn hàng.');
    } finally {
      setSlotSearchBusy(false);
    }
  }

  function chooseCatalogOrder(order) {
    setSelectedCatalogOrder(order);
    setSlotSearchError('');
    const importedQuantity = String(order.quantity ?? '0').replace(/[\s,]/g, '');
    setSlotForm(current => ({
      ...current,
      orderNo: order.orderNo || '',
      po: order.po || '',
      style: order.style || '',
      itemCode: order.itemCode || '',
      etd: order.etd || '',
      supplier: order.supplier || '',
      quantity: importedQuantity || '0',
    }));
  }

  async function deleteSelectedOrder() {
    setSaving(true);
    setError('');
    try {
      const response = activeAllocationId
        ? await fetch(`${API_ROOT}/api/warehouses/${selectedShelf._id}/orders/${encodeURIComponent(activeAllocationId)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } })
        : await fetch(`${API_ROOT}/api/warehouses/${selectedShelf._id}/slots/${encodeURIComponent(selectedPositions[0])}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token()}` } });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.message || 'Không xóa được hàng khỏi ô.');
      setDialog('');
      setSelectedPositions([]);
      setActiveAllocationId('');
      await loadShelves();
    } catch (requestError) {
      setError(requestError.message || 'Không xóa được hàng khỏi ô.');
    } finally {
      setSaving(false);
    }
  }

  const changeWarehouse = name => { setQuery(''); setSelectedShelfId(''); setSelectedPositions([]); setMovingOrder(null); setMovingFromPosition(''); setWarehouse(name); };
  const handleSearch = value => {
    setQuery(value);
    const match = shelves.find(matchesShelf);
    if (match && match._id !== selectedShelfId) { setSelectedShelfId(match._id); setSelectedPositions([]); setMovingOrder(null); setMovingFromPosition(''); }
  };
  const renderShelfCard = (shelf, layoutClass = '') => <div key={shelf._id} className={`warehouse-aisle-card${selectedShelf?._id === shelf._id ? ' active' : ''}${matchesShelf(shelf) ? ' match' : ''}${layoutClass ? ` ${layoutClass}` : ''}`}>
    <button type="button" className="warehouse-shelf-select" onClick={() => { setSelectedShelfId(shelf._id); setSelectedPositions([]); setMovingOrder(null); setMovingFromPosition(''); }}><span className="warehouse-aisle-name">{shelf.code}</span><span className="warehouse-capacity">{shelf.rows * shelf.columns} ô</span><span className="warehouse-aisle-mark" style={{ gridTemplateColumns: `repeat(${shelf.columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${shelf.rows}, minmax(0, 1fr))` }} aria-hidden="true">{Array.from({ length: shelf.rows * shelf.columns }, (_, index) => {
      const position = positionCode(Math.floor(index / shelf.columns), index % shelf.columns);
      const slotOrders = shelf.slots.filter(slot => slot.position === position);
      const occupied = slotOrders.length > 0;
      const zeroAlert = slotOrders.some(isZeroStockShortageOrder);
      return <i key={position} className={`${occupied ? 'occupied' : ''}${zeroAlert ? ' zero-stock-shortage' : ''}`} />;
    })}</span></button>
    {canEditWarehouse && <span className="warehouse-shelf-tools"><Button size="small" onClick={() => openEditShelf(shelf)}>Sửa</Button><Popconfirm title={`Xóa kệ ${shelf.code} và hàng trong kệ?`} okText="Xóa" cancelText="Hủy" onConfirm={() => deleteShelf(shelf)}><Button size="small" danger>Xóa</Button></Popconfirm></span>}
  </div>;

  return (
    <section className="warehouse-page">
      <div className="lookup-heading-row">
        <Button className="back-button" type="text" onClick={onBack} aria-label="Quay lại">‹</Button>
        <Typography.Title level={4} className="lookup-title">Kho hàng</Typography.Title>
        {canEditWarehouse && <Button className="warehouse-add-button" size="small" onClick={openNewShelf}>+ Thêm kệ</Button>}
      </div>
      <Input className="warehouse-search" value={query} onChange={event => handleSearch(event.target.value)} placeholder="Tìm mã hàng, tên hàng hoặc vị trí..." allowClear prefix={<SearchIcon />} />
      <div className="warehouse-tabs" role="tablist" aria-label="Chọn kho">
        {['Kho 1', 'Kho 2'].map(name => <Button key={name} role="tab" aria-selected={warehouse === name} className={warehouse === name ? 'warehouse-tab active' : 'warehouse-tab'} onClick={() => changeWarehouse(name)}>{name}</Button>)}
      </div>
      {normalizedQuery && <div className="warehouse-search-results" aria-live="polite">
        {searchResults.length ? <>
          <div className="warehouse-search-results-title">Tìm thấy {searchResults.length} đơn hàng</div>
          {searchResults.map(({ shelf, slot, positions }) => <button type="button" className="warehouse-search-result" key={`${shelf._id}-${slot.allocationId || slot.orderNo || slot.po}-${slot.style}`} onClick={() => { setSelectedShelfId(shelf._id); setSelectedPositions([]); setMovingOrder(null); setMovingFromPosition(''); }}>
            <span><strong>{slot.po || slot.orderNo || slot.style || slot.itemCode}</strong>{slot.style && slot.po && <small> · {slot.style}</small>}<small> · SL {slot.quantity ?? 0}</small></span>
            <span className="warehouse-search-result-location">{shelf.code} · {positions.join(', ')}</span>
          </button>)}
        </> : <div className="warehouse-search-empty">Không tìm thấy đơn hàng hoặc vị trí phù hợp trong kho này.</div>}
      </div>}
      {error && <div className="auth-error lookup-error" role="alert">{error}</div>}
      <div className={`warehouse-map${loading ? ' loading' : ''}`}>
        {warehouse === 'Kho 1' ? <div className="warehouse-layout-kho1">
          <div className="warehouse-layout-kho1-top">
            {kho1TopShelves.map((shelf, index) => <Fragment key={shelf._id}>
              {renderShelfCard(shelf, `warehouse-kho1-shelf-${index + 1}`)}
              {index === 1 && kho1SideShelves[0] && renderShelfCard(kho1SideShelves[0], 'warehouse-kho1-shelf-13')}
              {index === 2 && kho1SideShelves[1] && renderShelfCard(kho1SideShelves[1], 'warehouse-kho1-shelf-14')}
            </Fragment>)}
            <div className="warehouse-qc-label">QC</div>
            <div className="warehouse-table-label">Bàn Kho</div>
            <div className="warehouse-door-label warehouse-kho1-door">Cửa ra vào</div>
          </div>
          {kho1BottomShelves.length > 0 && <div className="warehouse-layout-kho1-bottom">{kho1BottomShelves.map(renderShelfCard)}</div>}
        </div> : <>
          <div className="warehouse-door-label">Cửa ra vào</div>
          <div className="warehouse-main-aisles">{shelves.slice(0, 2).map(renderShelfCard)}</div>
        </>}
        {loading ? <div className="warehouse-loading">Đang tải kệ...</div> : selectedShelf ? <>
          <div className="warehouse-rack-title">Sơ đồ kệ <strong>{selectedShelf.code}</strong></div>
          <div className="warehouse-slot-hint">Chọn ô để xem đơn hàng; một ô có thể chứa nhiều đơn.</div>
          {selectedPositions.length > 0 && <div className="warehouse-selection-actions">
            <span>Đã chọn <strong>{selectedPositions.length}</strong> ô: <strong>{selectedPositions.join(', ')}</strong></span>
            <Button onClick={() => setSelectedPositions([])}>Bỏ chọn</Button>
            {canEditWarehouse && selectedPositions.length === 1 && selectedShelf.slots.some(slot => slot.position === selectedPositions[0]) && <Button onClick={openAddOrderToOccupiedSlot}>Thêm đơn vào ô</Button>}
            {canEditWarehouse && <Button type="primary" onClick={openOrderEditor}>{selectedPositions.some(position => selectedShelf.slots.some(slot => slot.position === position)) ? 'Sửa đơn hàng' : 'Nhập đơn hàng'}</Button>}
          </div>}
          {movingOrder && <div className="warehouse-move-hint">Đang chuyển đơn từ <strong>{movingFromPosition}</strong>. Chọn ô đích trên kệ này. <Button size="small" onClick={() => { setMovingOrder(null); setMovingFromPosition(''); }}>Hủy chuyển</Button></div>}
          <div className="warehouse-rack" aria-label={`Sơ đồ kệ ${selectedShelf.code}`}>
            {Array.from({ length: selectedShelf.rows }, (_, level) => <div className="warehouse-rack-row" key={level} style={{ gridTemplateColumns: `repeat(${selectedShelf.columns}, minmax(0, 1fr))` }} aria-label={`Hàng ${level + 1}`}>
              {Array.from({ length: selectedShelf.columns }, (_, index) => {
                const position = positionCode(level, index);
                const slotOrders = selectedShelf.slots.filter(item => item.position === position);
                const slot = slotOrders[0];
                const zeroAlert = slotOrders.some(isZeroStockShortageOrder);
                const queryMatch = slotOrders.some(order => matchesSlot(selectedShelf, position, order));
                return <button key={position} type="button" className={`warehouse-slot${slot ? ' occupied' : ''}${selectedPositions.includes(position) ? ' selected' : ''}${queryMatch ? ' match' : ''}${zeroAlert ? ' zero-stock-shortage' : ''}${movingOrder && movingFromPosition === position ? ' move-source' : ''}`} title={`${selectedShelf.code} ${position}${slot ? ` · ${slotOrders.length} đơn: ${slotOrders.map(order => `${order.po} ${order.style}`).join(', ')}` : ''}`} aria-label={`${selectedShelf.code} ${position}${slot ? `, ${slotOrders.length} đơn hàng${zeroAlert ? ', số tồn và số thiếu đều bằng 0' : ''}` : ', ô trống'}`} onClick={() => movingOrder ? void moveOrderToPosition(position) : toggleSlot(position)}>{slot && <><span>{slot.po || slot.style || slot.itemCode || slot.orderNo}</span>{slotOrders.length > 1 && <small className="warehouse-slot-count">+{slotOrders.length - 1}</small>}</>}</button>;
              })}
            </div>)}
          </div>
          {selectedPositions.length > 0 && <div className="warehouse-selected-orders">
            <strong className="warehouse-selected-orders-title">Đơn hàng trong ô đang chọn</strong>
            {selectedOrderGroups.length ? selectedOrderGroups.map((order, index) => <div className="warehouse-selected-order" key={order.allocationId || `${order.orderNo}-${order.po}-${order.style}-${index}`}>
              <span><strong>{order.po || order.orderNo || order.style || order.itemCode}</strong>{order.style && order.po && <small> · {order.style}</small>}<small> · SL {order.quantity ?? 0}</small></span>
              <span className="warehouse-selected-order-positions">{[...new Set(order.positions)].join(', ')}</span>
              {canEditWarehouse && <Button size="small" onClick={() => openEditSelectedOrder(order)}>Sửa</Button>}
              {canEditWarehouse && <Button size="small" disabled={selectedPositions.length !== 1 || !order.positions.includes(selectedPositions[0])} onClick={() => startMovingOrder(order)}>Chuyển ô</Button>}
            </div>) : <div className="warehouse-selected-order-empty">Các ô đang chọn hiện chưa có đơn hàng.</div>}
          </div>}
          {selectedShelf.slots.length > 0 && <div className="warehouse-stock-summary">Đang lưu {[...new Set(selectedShelf.slots.map(slot => slot.position))].length} ô có hàng · {selectedShelf.slots.length} đơn hàng</div>}
        </> : !loading && <div className="warehouse-empty">Chưa có kệ. Nhấn “+ Thêm kệ” để tạo kệ đầu tiên.</div>}
        {warehouse !== 'Kho 1' && !loading && shelves.length > 2 && <div className="warehouse-bottom-shelves">{shelves.slice(2).map(renderShelfCard)}</div>}
      </div>

      <Modal title={editingShelfId ? 'Sửa kệ hàng' : 'Thêm kệ hàng'} open={dialog === 'shelf'} onCancel={() => setDialog('')} footer={null} destroyOnClose>
        <form className="warehouse-form" onSubmit={saveShelf}>
          <label>Mã kệ<Input value={shelfForm.code} onChange={event => setShelfForm({ ...shelfForm, code: event.target.value })} placeholder="Ví dụ: K04" required maxLength={16} /></label>
          <div className="warehouse-form-row">
            <label>Số hàng<Input type="number" min="1" max="20" value={shelfForm.rows} onChange={event => setShelfForm({ ...shelfForm, rows: event.target.value })} required /></label>
            <label>Số ô mỗi hàng<Input type="number" min="1" max="40" value={shelfForm.columns} onChange={event => setShelfForm({ ...shelfForm, columns: event.target.value })} required /></label>
          </div>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <div className="warehouse-form-actions"><Button onClick={() => setDialog('')}>Hủy</Button><Button type="primary" htmlType="submit" loading={saving}>Lưu kệ</Button></div>
        </form>
      </Modal>
      <Modal title={`${addingOrderToOccupiedSlot ? 'Thêm đơn vào ô' : editingExistingOrder ? 'Sửa đơn hàng' : 'Nhập đơn hàng'} ${selectedShelf?.code || ''} · ${selectedPositions.join(', ')}`} open={dialog === 'slot'} onCancel={() => setDialog('')} footer={null} destroyOnClose>
        <form className="warehouse-form" onSubmit={saveSlot}>
          <label>PO<Input value={slotForm.po} onChange={event => { setSlotForm(current => ({ ...current, po: event.target.value })); setSelectedCatalogOrder(null); setSlotOrderResults([]); }} /></label>
          <label>Hình thể / Style<Input value={slotForm.style} onChange={event => { setSlotForm(current => ({ ...current, style: event.target.value })); setSelectedCatalogOrder(null); setSlotOrderResults([]); }} /></label>
          <Button className="warehouse-order-search-button" htmlType="button" onClick={searchOrdersForSlot} loading={slotSearchBusy}>Tìm đơn hàng</Button>
          {slotSearchError && <div className="auth-error" role="alert">{slotSearchError}</div>}
          {selectedCatalogOrder && <div className="warehouse-order-selected"><strong>Đã chọn:</strong> {selectedCatalogOrder.po} · {selectedCatalogOrder.style} · SL đơn {selectedCatalogOrder.quantity}</div>}
          {batchOrderEntry && <>
            <Button htmlType="button" disabled={!selectedCatalogOrder} onClick={addSelectedOrderToBatch}>Thêm đơn này vào danh sách</Button>
            {pendingSlotOrders.length > 0 && <div className="warehouse-batch-orders">
              <strong>Danh sách sẽ thêm ({pendingSlotOrders.length})</strong>
              {pendingSlotOrders.map((order, index) => <div className="warehouse-batch-order" key={order.sourceId}>
                <span><strong>{order.po || order.orderNo || order.style}</strong>{order.style && order.po && <small> · {order.style}</small>}<small> · SL {order.quantity}</small></span>
                <Button size="small" danger onClick={() => setPendingSlotOrders(current => current.filter((_, itemIndex) => itemIndex !== index))}>Bỏ</Button>
              </div>)}
            </div>}
          </>}
          {slotOrderResults.length > 0 && <div className="warehouse-order-results">
            {slotOrderResults.map((order, index) => <button key={order.id || `${order.po}-${order.style}-${index}`} type="button" className="warehouse-order-result" onClick={() => chooseCatalogOrder(order)}>
              <strong>PO {order.po || '—'} · Hình thể {order.style || '—'}</strong>
              <span>Số chỉ lệnh {order.orderNo || '—'} · SL đơn {order.quantity || '0'}</span>
            </button>)}
          </div>}
          <label>Số lượng đơn hàng<Input type="number" min="0" value={slotForm.quantity} onChange={event => setSlotForm({ ...slotForm, quantity: event.target.value })} required /></label>
          <label>Ghi chú<Input.TextArea rows={3} value={slotForm.note} onChange={event => setSlotForm({ ...slotForm, note: event.target.value })} /></label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <div className="warehouse-form-actions">
            {editingExistingOrder && <Popconfirm title="Xóa đơn hàng khỏi tất cả ô đang chứa đơn này?" okText="Xóa" cancelText="Hủy" onConfirm={deleteSelectedOrder}><Button danger loading={saving}>Xóa đơn</Button></Popconfirm>}
            <span />
            <Button onClick={() => setDialog('')}>Hủy</Button><Button type="primary" htmlType="submit" loading={saving}>{batchOrderEntry ? `Lưu ${pendingSlotOrders.length} đơn` : 'Lưu hàng'}</Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

function OrderLookup({ onBack, isAdmin }) {
  const [style, setStyle] = useState('');
  const [po, setPo] = useState('');
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [orders, setOrders] = useState([]);
  const [source, setSource] = useState(null);
  const [syncStatus, setSyncStatus] = useState(null);
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [excelFile, setExcelFile] = useState(null);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    const loadStatus = async () => {
      try {
        const response = await fetch(`${API_ROOT}/api/orders/sync/status`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('gom_token')}` },
        });
        const result = await readApiJson(response);
        if (!response.ok) throw new Error(result.message || 'Could not load sync status.');
        if (active) {
          setSyncStatus(result);
          setSyncError('');
        }
      } catch (requestError) {
        if (active) setSyncError(requestError.message || 'Không thể tải trạng thái đồng bộ.');
      }
    };
    void loadStatus();
    return () => {
      active = false;
    };
  }, [isAdmin]);

  async function uploadExcel() {
    if (!excelFile) return;
    setSyncBusy(true);
    setSyncError('');
    try {
      const response = await fetch(`${API_ROOT}/api/orders/sync/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('gom_token')}`,
          'Content-Type': 'application/octet-stream',
          'X-File-Name': encodeURIComponent(excelFile.name),
        },
        body: excelFile,
      });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.message || 'Không thể đồng bộ file Excel.');
      setSyncStatus(result);
      setSource({ name: result.sourceFileName, syncedAt: result.syncedAt });
      setExcelFile(null);
    } catch (requestError) {
      setSyncError(requestError.message || 'Không thể đồng bộ file Excel.');
    } finally {
      setSyncBusy(false);
    }
  }

  async function search(event) {
    event.preventDefault();
    if (!style.trim() && !po.trim()) return;
    setSearched(true);
    setLoading(true);
    setError('');
    try {
      const query = new URLSearchParams({ style: style.trim(), po: po.trim() });
      const token = localStorage.getItem('gom_token');
      const response = await fetch(`${API_ROOT}/api/orders?${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.message || 'Cannot load orders.');
      setOrders(result.orders || []);
      setSource(result.source || null);
    } catch (requestError) {
      setOrders([]);
      setError(requestError.message || 'Không thể tải dữ liệu đơn hàng.');
    } finally {
      setLoading(false);
    }
  }

  const syncTitle = syncStatus
    ? 'Dữ liệu Excel đã đồng bộ'
    : 'Đang tải trạng thái...';

  return (
    <section className="lookup-page">
      <div className="lookup-heading-row">
        <Button className="back-button" type="text" onClick={onBack} aria-label="Quay lại">‹</Button>
        <Typography.Title level={4} className="lookup-title">Tra cứu đơn hàng</Typography.Title>
      </div>
      <Typography.Paragraph className="lookup-help">
        Tìm theo hình thẻ hoặc PO. Nhập cả hai để lọc kết hợp; hỗ trợ tìm một phần mã.
      </Typography.Paragraph>
      <Typography.Paragraph className="lookup-source">
        {source ? `Nguồn: ${source.name} · sheet đầu · cập nhật ${new Date(source.syncedAt).toLocaleString('vi-VN')}. Kéo ngang bảng để xem đầy đủ các cột.` : 'Chọn file Excel .xlsx để cập nhật dữ liệu tra cứu.'}
      </Typography.Paragraph>

      {isAdmin && <div className="drive-sync-panel">
        <div className="drive-sync-info">
          <strong>{syncTitle}</strong>
          <span>{syncStatus?.sourceFileName ? `${syncStatus.sourceFileName} · ${syncStatus.rowCount} dòng · ${syncStatus.syncedAt ? new Date(syncStatus.syncedAt).toLocaleString('vi-VN') : ''}` : 'Chưa có dữ liệu. Chọn file Excel để đồng bộ.'}</span>
        </div>
        <div className="drive-sync-actions">
          <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => setExcelFile(event.target.files?.[0] || null)} />
          <Button type="primary" disabled={!excelFile} loading={syncBusy} onClick={uploadExcel}>Đồng bộ file Excel</Button>
        </div>
        {syncError && <div className="auth-error lookup-error" role="alert">{syncError}</div>}
      </div>}

      <form className="lookup-form" onSubmit={search}>
        <label htmlFor="style-search">Hình thẻ</label>
        <Input id="style-search" value={style} onChange={event => setStyle(event.target.value)} placeholder="Nhập hình thẻ / Style" allowClear />
        <label htmlFor="po-search">PO</label>
        <Input id="po-search" value={po} onChange={event => setPo(event.target.value)} placeholder="Nhập mã PO" allowClear />
        <Button className="search-button" type="primary" htmlType="submit" loading={loading} icon={<SearchIcon />}>{'T\u00ecm \u0111\u01a1n h\u00e0ng'}</Button>
      </form>

      {error && <div className="auth-error lookup-error" role="alert">{error}</div>}
      <div className="orders-table-wrap">
        <Table
          className="orders-table"
          columns={orderColumns}
          dataSource={orders}
          rowKey="id"
          rowClassName={orderRowClass}
          pagination={false}
          scroll={{ x: 1305 }}
          loading={loading}
          locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={searched ? 'Chưa có dữ liệu đơn hàng để đối chiếu.' : 'Nhập hình thẻ hoặc PO để bắt đầu tra cứu.'} /> }}
        />
      </div>
    </section>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState('');
  const [location, setLocation] = useState('Ở Về hoa sen C7');
  const [draftLocation, setDraftLocation] = useState(location);
  const [editing, setEditing] = useState(false);
  const [page, setPage] = useState('home');
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [installLinkCopied, setInstallLinkCopied] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [permissionUsers, setPermissionUsers] = useState([]);
  const [permissionLoading, setPermissionLoading] = useState(false);
  const [permissionError, setPermissionError] = useState('');
  const [permissionSavingId, setPermissionSavingId] = useState('');
  const installUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const month = `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;

  useEffect(() => {
    const handleInstallPrompt = event => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => setInstallPrompt(null);
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function installAndroidApp() {
    if (!installPrompt) {
      setInstallHelpOpen(true);
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  async function copyInstallLink() {
    try {
      await navigator.clipboard.writeText(installUrl);
      setInstallLinkCopied(true);
      window.setTimeout(() => setInstallLinkCopied(false), 1800);
    } catch {
      setInstallHelpOpen(true);
    }
  }

  async function openPermissions() {
    setPermissionsOpen(true);
    setPermissionLoading(true);
    setPermissionError('');
    try {
      const response = await fetch(`${API_ROOT}/api/users`, { headers: { Authorization: `Bearer ${localStorage.getItem('gom_token')}` } });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.message || 'Không tải được danh sách tài khoản.');
      setPermissionUsers(result);
    } catch (error) {
      setPermissionError(error.message || 'Không tải được danh sách tài khoản.');
    } finally {
      setPermissionLoading(false);
    }
  }

  async function updateWarehousePermission(member, canManageWarehouse) {
    setPermissionSavingId(member.id);
    setPermissionError('');
    try {
      const response = await fetch(`${API_ROOT}/api/users/${member.id}/warehouse-permission`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${localStorage.getItem('gom_token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ canManageWarehouse }),
      });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.message || 'Không cập nhật được quyền sửa kho.');
      setPermissionUsers(current => current.map(user => user.id === result.id ? result : user));
      if (user.id === result.id) setUser(current => ({ ...current, canManageWarehouse: result.canManageWarehouse }));
    } catch (error) {
      setPermissionError(error.message || 'Không cập nhật được quyền sửa kho.');
    } finally {
      setPermissionSavingId('');
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('gom_token');
    if (!token) {
      setAuthChecked(true);
      return;
    }
    fetch(`${API_ROOT}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => {
        const result = await readApiJson(response);
        if (!response.ok) throw new Error(result.message || 'Phiên đăng nhập đã hết hạn.');
        setUser(result.user);
      })
      .catch(error => {
        localStorage.removeItem('gom_token');
        setAuthError(error instanceof TypeError ? 'Không kết nối được máy chủ đăng nhập.' : error.message);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  function signOut() {
    localStorage.removeItem('gom_token');
    setUser(null);
    setPage('home');
  }

  function saveLocation() {
    if (draftLocation.trim()) setLocation(draftLocation.trim());
    setEditing(false);
  }

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#42ad51', borderRadius: 18, fontFamily: 'Inter, Arial, sans-serif' } }}>
      <main className="attendance-page">
        {!authChecked ? <div className="auth-loading"><Spin /></div> : !user ? (
          <div className="attendance-frame auth-frame"><AuthScreen onAuthenticated={setUser} initialError={authError} /></div>
        ) : <div className={`attendance-frame ${page !== 'home' ? 'attendance-frame-lookup' : ''}`}>
          {page === 'warehouse' ? (
            <WarehousePage onBack={() => setPage('home')} canEditWarehouse={Boolean(user.canManageWarehouse)} />
          ) : page === 'lookup' ? (
            <OrderLookup onBack={() => setPage('home')} isAdmin={Boolean(user.isAdmin)} />
          ) : (
            <>
              <Card className="location-card" bordered={false}>
                <Typography.Text className="location-name">{location}</Typography.Text>
                <Button className="edit-location" type="text" aria-label="Sửa địa điểm" icon={<PencilIcon />} onClick={() => { setDraftLocation(location); setEditing(true); }} />
              </Card>
              <Card className="attendance-card" bordered={false}>
                <div className="attendance-card-top">
                  <Typography.Text className="attendance-label">CHẤM CÔNG</Typography.Text>
                  <span className="online-status"><i /> Online</span>
                </div>
                <div className="attendance-card-bottom">
                  <Typography.Title level={2} className="month-label">{month}</Typography.Title>
                  <Dropdown menu={{ items: [{ key: 'logout', label: 'Đăng xuất', onClick: signOut }] }} trigger={['click']}>
                    <Button className="user-button" type="primary" icon={<UserIcon />}>{user.name}</Button>
                  </Dropdown>
                </div>
              </Card>
              <nav className="home-menu" aria-label="Chức năng">
                <Button className="menu-button" onClick={() => setPage('warehouse')}><MenuIcon>☑</MenuIcon>Kho hàng</Button>
                <Button className="menu-button" onClick={() => setPage('lookup')}><MenuIcon>▧</MenuIcon>Tra cứu đơn hàng</Button>
                {user.isAdmin && <Button className="menu-button" onClick={openPermissions}><MenuIcon>⚙</MenuIcon>Phân quyền sửa kho</Button>}
              </nav>
              <section className="install-section" aria-labelledby="install-title">
                <div className="install-heading"><span>TẢI ỨNG DỤNG</span><strong id="install-title">Cài Chấm công lên điện thoại</strong></div>
                <p className="install-description">Android có thể bấm nút tải app. iPhone/iPad mở bằng Safari, bấm Chia sẻ rồi chọn Thêm vào Màn hình chính.</p>
                <div className="install-share-card">
                  <div className="install-qr"><QRCode value={installUrl} size={108} bordered={false} /></div>
                  <div className="install-share-copy"><strong>Mở trên thiết bị khác</strong><span>Quét mã QR để mở ứng dụng trên điện thoại.</span><a href={installUrl}>{installUrl}</a><Button type="link" onClick={copyInstallLink}>{installLinkCopied ? 'Đã sao chép đường dẫn' : 'Sao chép đường dẫn'}</Button></div>
                </div>
                <Button className="android-install-button" type="primary" onClick={installAndroidApp}>Tải app Android</Button>
                <div className="install-ios-help">iOS: Safari → Chia sẻ → Thêm vào Màn hình chính</div>
              </section>
            </>
          )}
        </div>}
        <Modal title="Cài Chấm công trên Android" open={installHelpOpen} onCancel={() => setInstallHelpOpen(false)} footer={<Button type="primary" onClick={() => setInstallHelpOpen(false)}>Đã hiểu</Button>}>
          <p>Mở trang này bằng Chrome, chạm menu ⋮ rồi chọn “Cài đặt ứng dụng” hoặc “Thêm vào Màn hình chính”.</p>
        </Modal>
        <Modal title="Phân quyền sửa kho hàng" open={permissionsOpen} onCancel={() => setPermissionsOpen(false)} footer={null} destroyOnClose>
          <p className="permission-intro">Chỉ admin quản lý quyền này. Người được cấp chỉ có thể thêm, sửa hoặc xóa kệ và đơn hàng trong kho.</p>
          {permissionError && <div className="auth-error lookup-error" role="alert">{permissionError}</div>}
          {permissionLoading ? <div className="permission-loading"><Spin size="small" /></div> : <div className="permission-user-list">
            {permissionUsers.map(member => <div className="permission-user" key={member.id}>
              <div className="permission-user-info"><strong>{member.name}</strong><span>{member.email}</span></div>
              <div className="permission-user-controls">{member.isAdmin && <span className="permission-admin-label">Admin</span>}<Switch checked={member.canManageWarehouse} checkedChildren="Có" unCheckedChildren="Không" loading={permissionSavingId === member.id} onChange={checked => updateWarehousePermission(member, checked)} /></div>
            </div>)}
          </div>}
        </Modal>
        <Modal title="Sửa địa điểm" open={editing} okText="Lưu" cancelText="Hủy" onOk={saveLocation} onCancel={() => setEditing(false)}>
          <Input value={draftLocation} onChange={event => setDraftLocation(event.target.value)} onPressEnter={saveLocation} autoFocus />
        </Modal>
      </main>
    </ConfigProvider>
  );
}
