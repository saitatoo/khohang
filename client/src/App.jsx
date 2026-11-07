import { useState } from 'react';
import { Button, Card, ConfigProvider, Input, Modal, Typography } from 'antd';

const PencilIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.5-.8 4.3 4.3-.8L19 8.5 15.5 5 4 16.5Z"/><path d="m13.8 6.7 3.5 3.5"/></svg>;
const UserIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.2"/><path d="M5.8 20c.4-3.5 2.5-5.4 6.2-5.4s5.8 1.9 6.2 5.4"/></svg>;

export default function App() {
  const [location, setLocation] = useState('Ở Về hoa sen C7');
  const [draftLocation, setDraftLocation] = useState(location);
  const [editing, setEditing] = useState(false);
  const month = `${String(new Date().getMonth() + 1).padStart(2, '0')}/${new Date().getFullYear()}`;

  function saveLocation() {
    if (draftLocation.trim()) setLocation(draftLocation.trim());
    setEditing(false);
  }

  return (
    <ConfigProvider theme={{ token: { colorPrimary: '#42ad51', borderRadius: 18, fontFamily: 'Inter, Arial, sans-serif' } }}>
      <main className="attendance-page">
        <div className="attendance-frame">
          <Card className="location-card" bordered={false}>
            <Typography.Text className="location-name">{location}</Typography.Text>
            <Button
              className="edit-location"
              type="text"
              aria-label="Sửa địa điểm"
              icon={<PencilIcon />}
              onClick={() => { setDraftLocation(location); setEditing(true); }}
            />
          </Card>

          <Card className="attendance-card" bordered={false}>
            <div className="attendance-card-top">
              <Typography.Text className="attendance-label">CHẤM CÔNG</Typography.Text>
              <span className="online-status"><i /> Online</span>
            </div>
            <div className="attendance-card-bottom">
              <Typography.Title level={2} className="month-label">{month}</Typography.Title>
              <Button className="user-button" type="primary" icon={<UserIcon />}>saitato</Button>
            </div>
          </Card>
        </div>

        <Modal
          title="Sửa địa điểm"
          open={editing}
          okText="Lưu"
          cancelText="Hủy"
          onOk={saveLocation}
          onCancel={() => setEditing(false)}
        >
          <Input value={draftLocation} onChange={event => setDraftLocation(event.target.value)} onPressEnter={saveLocation} autoFocus />
        </Modal>
      </main>
    </ConfigProvider>
  );
}
