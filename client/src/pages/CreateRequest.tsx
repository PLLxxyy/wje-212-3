import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

const REQUEST_TYPES = ['代买', '搬运', '维修', '照看', '辅导', '跑腿'];
const REWARDS = ['免费', '10元', '20元', '面议'];

export default function CreateRequest() {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [reward, setReward] = useState('');
  const [deadline, setDeadline] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!type || !description || !reward || !deadline) {
      setError('请填写所有必填信息');
      return;
    }

    setLoading(true);
    try {
      await api.createRequest({ type, description, reward, deadline });
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
      <h1 className="page-title">&#128221; 发布求助</h1>

      <div className="detail-card">
        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>求助类型 *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {REQUEST_TYPES.map(t => (
                <button
                  key={t}
                  type="button"
                  className={`filter-chip ${type === t ? 'active' : ''}`}
                  onClick={() => setType(t)}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>详细描述 *</label>
            <textarea
              placeholder="请详细描述您需要什么帮助，越具体越好..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>期望报酬 *</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {REWARDS.map(r => (
                  <button
                    key={r}
                    type="button"
                    className={`filter-chip ${reward === r ? 'active' : ''}`}
                    onClick={() => setReward(r)}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>期望完成时间 *</label>
              <input
                type="text"
                placeholder="如：今天下午、明天上午、这周内"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '发布中...' : '发布求助'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>
              取消
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16, padding: '14px 20px', fontSize: 13, color: '#888', lineHeight: 1.8 }}>
        <div style={{ fontWeight: 600, color: '#666', marginBottom: 4 }}>发布提示</div>
        <div>&#8226; 请如实描述求助内容，方便邻居了解您的需求</div>
        <div>&#8226; 建议注明具体的时间和地点信息</div>
        <div>&#8226; 如涉及费用，请提前与帮助者沟通确认</div>
        <div>&#8226; 完成后请及时确认并对帮助者进行评价</div>
      </div>
    </div>
  );
}
