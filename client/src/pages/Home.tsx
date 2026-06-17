import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../App';

const TYPES = ['all', '代买', '搬运', '维修', '照看', '辅导', '跑腿'];
const TYPE_LABELS: Record<string, string> = {
  all: '全部', 代买: '代买', 搬运: '搬运', 维修: '维修', 照看: '照看', 辅导: '辅导', 跑腿: '跑腿'
};

const STATUS_LABELS: Record<string, string> = {
  open: '等待接单', accepted: '已接单', in_progress: '进行中', completed: '已完成'
};

export default function Home() {
  const [requests, setRequests] = useState<any[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuth();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await api.getRequests({
        type: typeFilter,
        search: searchText || undefined,
      });
      setRequests(data);
    } catch (err) {
      console.error('获取求助列表失败', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [typeFilter]);

  const handleSearch = () => {
    fetchRequests();
  };

  const openRequests = requests.filter(r => r.status === 'open');
  const otherRequests = requests.filter(r => r.status !== 'open');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>&#128203; 社区求助</h1>
        {user && (
          <button className="btn btn-primary" onClick={() => navigate('/create')}>
            + 发布求助
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        <input
          placeholder="搜索求助内容..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
        />
        <button className="btn btn-sm btn-primary" onClick={handleSearch}>搜索</button>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TYPES.map(t => (
            <button
              key={t}
              className={`filter-chip ${typeFilter === t ? 'active' : ''}`}
              onClick={() => setTypeFilter(t)}
            >
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Request list */}
      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#128269;</div>
          <div className="empty-state-text">暂无求助信息</div>
          {user && (
            <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={() => navigate('/create')}>
              发布第一条求助
            </button>
          )}
        </div>
      ) : (
        <>
          {openRequests.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, color: '#4CAF50', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                &#9889; 等待帮忙 ({openRequests.length})
              </h3>
              {openRequests.map(r => (
                <RequestCard key={r.id} request={r} onClick={() => navigate(`/requests/${r.id}`)} />
              ))}
            </div>
          )}
          {otherRequests.length > 0 && (
            <div>
              <h3 style={{ fontSize: 16, color: '#888', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                &#128221; 其他求助 ({otherRequests.length})
              </h3>
              {otherRequests.map(r => (
                <RequestCard key={r.id} request={r} onClick={() => navigate(`/requests/${r.id}`)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RequestCard({ request, onClick }: { request: any; onClick: () => void }) {
  return (
    <div className={`request-card status-${request.status}`} onClick={onClick}>
      <div className="request-card-header">
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`request-type type-${request.type}`}>{request.type}</span>
          <span className={`request-status status-${request.status}`}>
            {STATUS_LABELS[request.status]}
          </span>
        </div>
        <span className="request-reward" style={{ fontSize: 15 }}>{request.reward}</span>
      </div>
      <div className="request-desc">{request.description}</div>
      <div className="request-meta">
        <span>&#128100; {request.publisher_name}</span>
        <span>&#127968; {request.publisher_building}</span>
        <span>&#128197; {request.deadline}</span>
        {request.helper_name && <span>&#129309; 帮助者: {request.helper_name}</span>}
      </div>
    </div>
  );
}
