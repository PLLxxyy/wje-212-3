import { useState, useEffect } from 'react';
import { api } from '../api';

export default function Leaderboard() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await api.getLeaderboard();
        setUsers(data);
      } catch (err) {
        console.error('获取排行榜失败', err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const getRankClass = (index: number) => {
    if (index === 0) return 'rank-1';
    if (index === 1) return 'rank-2';
    if (index === 2) return 'rank-3';
    return 'rank-other';
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 className="page-title">&#127942; 社区热心达人</h1>

      <div className="card" style={{ marginBottom: 20, padding: '14px 20px', fontSize: 13, color: '#888', lineHeight: 1.8 }}>
        积分规则：求助人评价后，帮助者获得 <strong style={{ color: '#E65100' }}>评分 x 2</strong> 积分。
        <br />乐于助人的邻居们，积分越高排名越靠前！
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : users.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">&#127942;</div>
          <div className="empty-state-text">暂无排行数据</div>
        </div>
      ) : (
        <div className="leaderboard-list">
          {users.map((u, index) => (
            <div key={u.id} className="leaderboard-item">
              <div className={`leaderboard-rank ${getRankClass(index)}`}>
                {index + 1}
              </div>
              <div className="leaderboard-info">
                <div className="leaderboard-name">{u.nickname}</div>
                <div className="leaderboard-building">{u.building}</div>
              </div>
              <div className="leaderboard-points">
                <div className="leaderboard-points-value">{u.points}</div>
                <div className="leaderboard-points-label">积分</div>
              </div>
              <div className="leaderboard-help-count">
                <div className="leaderboard-help-value">{u.help_count}</div>
                <div className="leaderboard-help-label">帮忙</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
