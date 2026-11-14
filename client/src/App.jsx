import { useEffect, useState } from 'react';
import { Button, Card, ConfigProvider, Dropdown, Empty, Input, Modal, Popconfirm, Spin, Table, Typography } from 'antd';

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

const orderColumns = [
  { title: 'STT', dataIndex: 'stt', key: 'stt', width: 65 },
  { title: 'PO', dataIndex: 'po', key: 'po', width: 125 },
  { title: 'Hình thể', dataIndex: 'style', key: 'style', width: 145 },
  { title: 'SL đơn hàng', dataIndex: 'quantity', key: 'quantity', width: 150 },
  { title: 'Ngày giao', dataIndex: 'etd', key: 'etd', width: 140 },
  { title: 'Nhà cung cấp', dataIndex: 'supplier', key: 'supplier', width: 160 },
  { title: 'Số đế', dataIndex: 'itemCode', key: 'itemCode', width: 140 },
  { title: 'Ngày nhận', dataIndex: 'received', key: 'received', width: 145 },
  { title: 'Số lượng nhận', dataIndex: 'receivedQty', key: 'receivedQty', width: 170 },
  { title: 'Số thiếu', dataIndex: 'shortage', key: 'shortage', width: 125 },
  { title: 'Ngày phát hoàn chỉnh', dataIndex: 'materialIssuedDate', key: 'materialIssuedDate', width: 220 },
  { title: 'SL xuất', dataIndex: 'issuedQty', key: 'issuedQty', width: 135 },
  { title: 'Tồn kho', dataIndex: 'stock', key: 'stock', width: 140 },
  { title: 'Ghi chú', dataIndex: 'note', key: 'note', width: 180 },
];

function WarehousePage({ onBack }) {
  const [warehouse, setWarehouse] = useState('Kho 2');
  const [shelves, setShelves] = useState([]);
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
  const [shelfForm, setShelfForm] = useState({ code: '', rows: '2', columns: '8' });
  const [slotForm, setSlotForm] = useState({ orderNo: '', po: '', style: '', itemCode: '', etd: '', supplier: '', quantity: '0', note: '' });
  const token = () => localStorage.getItem('gom_token');
  const selectedShelf = shelves.find(item => item._id === selectedShelfId) || shelves[0];
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const positionCode = (level, position) => `R${level + 1}-C${String(position + 1).padStart(2, '0')}`;
  const matchesShelf = shelf => normalizedQuery && `${shelf.code} ${shelf.slots.map(slot => `${slot.position} ${slot.orderNo} ${slot.po} ${slot.style} ${slot.itemCode} ${slot.itemName} ${slot.supplier}`).join(' ')}`.toLocaleLowerCase().includes(normalizedQuery);
  const matchesSlot = (shelf, position, slot) => normalizedQuery && `${shelf.code}-${position} ${slot?.orderNo || ''} ${slot?.po || ''} ${slot?.style || ''} ${slot?.itemCode || ''} ${slot?.itemName || ''} ${slot?.supplier || ''}`.toLocaleLowerCase().includes(normalizedQuery);

  async function loadShelves(currentWarehouse = warehouse) {
    setLoading(true);
    try {
      const response = await fetch(`${API_ROOT}/api/warehouses?warehouse=${encodeURIComponent(currentWarehouse)}`, { headers: { Authorization: `Bearer ${token()}` } });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.message || 'Không tải được danh sách kệ.');
      setShelves(result);
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
    const slot = selectedShelf?.slots.find(item => item.position === position);
    const relatedPositions = slot?.allocationId
      ? selectedShelf.slots.filter(item => item.allocationId === slot.allocationId).map(item => item.position)
      : [position];
    setSelectedPositions(current => {
      if (current.includes(position)) return current.filter(item => item !== position);
      const anyRelatedSelected = relatedPositions.some(item => current.includes(item));
      return [...new Set([...current, ...(anyRelatedSelected ? [position] : relatedPositions)])];
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
    setActiveAllocationId(sameOrderId);
    setEditingExistingOrder(Boolean(order));
    setSlotForm({ orderNo: order?.orderNo || '', po: order?.po || '', style: order?.style || '', itemCode: order?.itemCode || '', etd: order?.etd || '', supplier: order?.supplier || '', quantity: String(order?.quantity ?? 0), note: order?.note || '' });
    setDialog('slot');
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
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`${API_ROOT}/api/warehouses/${selectedShelf._id}/orders`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...slotForm, quantity: Number(slotForm.quantity), positions: selectedPositions, allocationId: activeAllocationId }),
      });
      const result = await readApiJson(response);
      if (!response.ok) throw new Error(result.message || 'Không lưu được hàng trong ô.');
      setDialog('');
      setSelectedPositions([]);
      setActiveAllocationId('');
      await loadShelves();
    } catch (requestError) {
      setError(requestError.message || 'Không lưu được hàng trong ô.');
    } finally {
      setSaving(false);
    }
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

  const changeWarehouse = name => { setQuery(''); setSelectedShelfId(''); setSelectedPositions([]); setWarehouse(name); };
  const handleSearch = value => {
    setQuery(value);
    const match = shelves.find(matchesShelf);
    if (match && match._id !== selectedShelfId) { setSelectedShelfId(match._id); setSelectedPositions([]); }
  };
  const renderShelfCard = shelf => <div key={shelf._id} className={`warehouse-aisle-card${selectedShelf?._id === shelf._id ? ' active' : ''}${matchesShelf(shelf) ? ' match' : ''}`}>
    <button type="button" className="warehouse-shelf-select" onClick={() => { setSelectedShelfId(shelf._id); setSelectedPositions([]); }}><span className="warehouse-aisle-name">{shelf.code}</span><span className="warehouse-capacity">{shelf.rows * shelf.columns} ô</span><span className="warehouse-aisle-mark" style={{ gridTemplateColumns: `repeat(${shelf.rows * shelf.columns}, minmax(0, 1fr))` }} aria-hidden="true">{Array.from({ length: shelf.rows * shelf.columns }, (_, index) => <i key={index} />)}</span></button>
    <span className="warehouse-shelf-tools"><Button size="small" onClick={() => openEditShelf(shelf)}>Sửa</Button><Popconfirm title={`Xóa kệ ${shelf.code} và hàng trong kệ?`} okText="Xóa" cancelText="Hủy" onConfirm={() => deleteShelf(shelf)}><Button size="small" danger>Xóa</Button></Popconfirm></span>
  </div>;

  return (
    <section className="warehouse-page">
      <div className="lookup-heading-row">
        <Button className="back-button" type="text" onClick={onBack} aria-label="Quay lại">‹</Button>
        <Typography.Title level={4} className="lookup-title">Kho hàng</Typography.Title>
        <Button className="warehouse-add-button" size="small" onClick={openNewShelf}>+ Thêm kệ</Button>
      </div>
      <Input className="warehouse-search" value={query} onChange={event => handleSearch(event.target.value)} placeholder="Tìm mã hàng, tên hàng hoặc vị trí..." allowClear prefix={<SearchIcon />} />
      <div className="warehouse-tabs" role="tablist" aria-label="Chọn kho">
        {['Kho 1', 'Kho 2'].map(name => <Button key={name} role="tab" aria-selected={warehouse === name} className={warehouse === name ? 'warehouse-tab active' : 'warehouse-tab'} onClick={() => changeWarehouse(name)}>{name}</Button>)}
      </div>
      {error && <div className="auth-error lookup-error" role="alert">{error}</div>}
      <div className="warehouse-map">
        <div className="warehouse-door-label">Cửa ra vào</div>
        <div className="warehouse-main-aisles">
          {shelves.slice(0, 2).map(renderShelfCard)}
        </div>
        {loading ? <div className="warehouse-loading"><Spin size="small" /> Đang tải kệ...</div> : selectedShelf ? <>
          <div className="warehouse-rack-title">Sơ đồ kệ <strong>{selectedShelf.code}</strong></div>
          <div className="warehouse-slot-hint">Chọn một hoặc nhiều ô để xếp cùng một đơn hàng vào các vị trí đó.</div>
          {selectedPositions.length > 0 && <div className="warehouse-selection-actions">
            <span>Đã chọn <strong>{selectedPositions.length}</strong> ô</span>
            <Button onClick={() => setSelectedPositions([])}>Bỏ chọn</Button>
            <Button type="primary" onClick={openOrderEditor}>{selectedPositions.some(position => selectedShelf.slots.some(slot => slot.position === position)) ? 'Sửa đơn hàng' : 'Nhập đơn hàng'}</Button>
          </div>}
          <div className="warehouse-rack" aria-label={`Sơ đồ kệ ${selectedShelf.code}`}>
            {Array.from({ length: selectedShelf.rows }, (_, level) => <div className="warehouse-rack-row" key={level} style={{ gridTemplateColumns: `repeat(${selectedShelf.columns}, minmax(0, 1fr))` }} aria-label={`Hàng ${level + 1}`}>
              {Array.from({ length: selectedShelf.columns }, (_, index) => {
                const position = positionCode(level, index);
                const slot = selectedShelf.slots.find(item => item.position === position);
                return <button key={position} type="button" className={`warehouse-slot${slot ? ' occupied' : ''}${selectedPositions.includes(position) ? ' selected' : ''}${matchesSlot(selectedShelf, position, slot) ? ' match' : ''}`} title={`${selectedShelf.code} ${position}${slot ? ` · PO ${slot.po} · ${slot.style} · ${slot.quantity}` : ''}`} aria-label={`${selectedShelf.code} ${position}${slot ? `, PO ${slot.po}, hình thể ${slot.style}, số lượng ${slot.quantity}` : ', ô trống'}`} onClick={() => toggleSlot(position)}>{slot && <span>{slot.po || slot.style || slot.itemCode || slot.orderNo}</span>}</button>;
              })}
            </div>)}
          </div>
          {selectedShelf.slots.length > 0 && <div className="warehouse-stock-summary">Đang lưu {selectedShelf.slots.length} ô có hàng</div>}
        </> : !loading && <div className="warehouse-empty">Chưa có kệ. Nhấn “+ Thêm kệ” để tạo kệ đầu tiên.</div>}
        {!loading && shelves.length > 2 && <div className="warehouse-bottom-shelves">{shelves.slice(2).map(renderShelfCard)}</div>}
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
      <Modal title={`${editingExistingOrder ? 'Sửa đơn hàng' : 'Nhập đơn hàng'} ${selectedShelf?.code || ''} · ${selectedPositions.length} ô`} open={dialog === 'slot'} onCancel={() => setDialog('')} footer={null} destroyOnClose>
        <form className="warehouse-form" onSubmit={saveSlot}>
          <label>Số chỉ lệnh<Input value={slotForm.orderNo} onChange={event => setSlotForm({ ...slotForm, orderNo: event.target.value })} /></label>
          <label>PO<Input value={slotForm.po} onChange={event => setSlotForm({ ...slotForm, po: event.target.value })} /></label>
          <label>Hình thể / Style<Input value={slotForm.style} onChange={event => setSlotForm({ ...slotForm, style: event.target.value })} /></label>
          <label>Mã hàng<Input value={slotForm.itemCode} onChange={event => setSlotForm({ ...slotForm, itemCode: event.target.value })} /></label>
          <label>Số lượng đơn hàng<Input type="number" min="0" value={slotForm.quantity} onChange={event => setSlotForm({ ...slotForm, quantity: event.target.value })} required /></label>
          <label>Ngày giao / ETD<Input value={slotForm.etd} onChange={event => setSlotForm({ ...slotForm, etd: event.target.value })} /></label>
          <label>Nhà cung cấp<Input value={slotForm.supplier} onChange={event => setSlotForm({ ...slotForm, supplier: event.target.value })} /></label>
          <label>Ghi chú<Input.TextArea rows={3} value={slotForm.note} onChange={event => setSlotForm({ ...slotForm, note: event.target.value })} /></label>
          {error && <div className="auth-error" role="alert">{error}</div>}
          <div className="warehouse-form-actions">
            {editingExistingOrder && <Popconfirm title="Xóa đơn hàng khỏi tất cả ô đang chứa đơn này?" okText="Xóa" cancelText="Hủy" onConfirm={deleteSelectedOrder}><Button danger loading={saving}>Xóa đơn</Button></Popconfirm>}
            <span />
            <Button onClick={() => setDialog('')}>Hủy</Button><Button type="primary" htmlType="submit" loading={saving}>Lưu hàng</Button>
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
          pagination={false}
          scroll={{ x: 2150 }}
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
  const month = `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;

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
            <WarehousePage onBack={() => setPage('home')} />
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
              </nav>
            </>
          )}
        </div>}
        <Modal title="Sửa địa điểm" open={editing} okText="Lưu" cancelText="Hủy" onOk={saveLocation} onCancel={() => setEditing(false)}>
          <Input value={draftLocation} onChange={event => setDraftLocation(event.target.value)} onPressEnter={saveLocation} autoFocus />
        </Modal>
      </main>
    </ConfigProvider>
  );
}
