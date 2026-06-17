import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';

const STATUS_LABELS: Record<string, string> = {
  open: '等待接单', accepted: '已接单', in_progress: '进行中', completed: '已完成'
};

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [tab, setTab] = useState<'my' | 'helped'>('my');
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [myHelped, setMyHelped] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const [my, helped] = await Promise.all([api.getMyRequests(), api.getMyHelped()]);
        setMyRequests(my);
        setMyHelped(helped);
        await refreshUser();
      } catch (err) {
        console.error('获取数据失败', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* Profile header */}
      <div className="profile-header">
        <div className="profile-name">{user?.nickname}</div>
        <div className="profile-info">
          {user?.building} | {user?.phone}
        </div>
        <div className="profile-stats">
          <div className="profile-stat">
            <div className="profile-stat-value">{user?.points || 0}</div>
            <div className="profile-stat-label">积分</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">{user?.help_count || 0}</div>
            <div className="profile-stat-label">帮忙次数</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">{myRequests.length}</div>
            <div className="profile-stat-label">发布求助</div>
          </div>
          <div className="profile-stat">
            <div className="profile-stat-value">{myHelped.length}</div>
            <div className="profile-stat-label">接单数</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar">
        <button className={tab === 'my' ? 'active' : ''} onClick={() => setTab('my')}>
          我发的求助 ({myRequests.length})
        </button>
        <button className={tab === 'helped' ? 'active' : ''} onClick={() => setTab('helped')}>
          我接的单 ({myHelped.length})
        </button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <>
          {tab === 'my' && (
            myRequests.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">&#128221;</div>
                <div className="empty-state-text">还没有发布过求助</div>
                <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => navigate('/create')}>
                  发布求助
                </button>
              </div>
            ) : (
              myRequests.map(r => (
                <div key={r.id} className="request-card status-${r.status}" style={{ borderLeftColor: getStatusColor(r.status), cursor: 'pointer' }} onClick={() => navigate(`/requests/${r.id}`)}>
                  <div className="request-card-header">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`request-type type-${r.type}`}>{r.type}</span>
                      <span className={`request-status status-${r.status}`}>{STATUS_LABELS[r.status]}</span>
                    </div>
                    <span className="request-reward">{r.reward}</span>
                  </div>
                  <div className="request-desc">{r.description}</div>
                  <div className="request-meta">
                    <span>&#128197; {r.deadline}</span>
                    {r.helper_name && <span>&#129309; 帮助者: {r.helper_name}</span>}
                  </div>
                </div>
              ))
            )
          )}

          {tab === 'helped' && (
            myHelped.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">&#129309;</div>
                <div className="empty-state-text">还没有接过单，去首页看看有没有可以帮忙的吧</div>
                <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => navigate('/')}>
                  浏览求助
                </button>
              </div>
            ) : (
              myHelped.map(r => (
                <div key={r.id} className="request-card status-${r.status}" style={{ borderLeftColor: getStatusColor(r.status), cursor: 'pointer' }} onClick={() => navigate(`/requests/${r.id}`)}>
                  <div className="request-card-header">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`request-type type-${r.type}`}>{r.type}</span>
                      <span className={`request-status status-${r.status}`}>{STATUS_LABELS[r.status]}</span>
                    </div>
                    <span className="request-reward">{r.reward}</span>
                  </div>
                  <div className="request-desc">{r.description}</div>
                  <div className="request-meta">
                    <span>&#128100; {r.publisher_name}</span>
                    <span>&#127968; {r.publisher_building}</span>
                    <span>&#128197; {r.deadline}</span>
                  </div>
                </div>
              ))
            )
          )}
        </>
      )}
    </div>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'open': return '#4CAF50';
    case 'accepted': return '#FF9800';
    case 'in_progress': return '#2196F3';
    case 'completed': return '#9E9E9E';
    default: return '#ccc';
  }
}
