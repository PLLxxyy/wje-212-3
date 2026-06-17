import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken, setStoredUser } from '../api';
import { useAuth } from '../App';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [phone, setPhone] = useState('');
  const [building, setBuilding] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data;
      if (isRegister) {
        if (!username || !password || !nickname || !phone || !building) {
          setError('请填写所有信息');
          setLoading(false);
          return;
        }
        data = await api.register({ username, password, nickname, phone, building });
      } else {
        if (!username || !password) {
          setError('请输入用户名和密码');
          setLoading(false);
          return;
        }
        data = await api.login(username, password);
      }

      setToken(data.token);
      setStoredUser(data.user);
      setUser(data.user);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-title">{isRegister ? '注册账号' : '用户登录'}</div>
      <div className="auth-subtitle">
        {isRegister ? '加入邻里互助，共建温馨社区' : '欢迎回到邻里互助平台'}
      </div>

      {error && <div className="error-msg">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>用户名</label>
          <input
            type="text"
            placeholder="请输入用户名"
            value={username}
            onChange={e => setUsername(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>密码</label>
          <input
            type="password"
            placeholder={isRegister ? '至少6位密码' : '请输入密码'}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        {isRegister && (
          <>
            <div className="form-group">
              <label>昵称</label>
              <input
                type="text"
                placeholder="您希望邻居怎么称呼您"
                value={nickname}
                onChange={e => setNickname(e.target.value)}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>手机号</label>
                <input
                  type="tel"
                  placeholder="手机号码"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>楼栋门牌</label>
                <input
                  type="text"
                  placeholder="如 A栋3单元502"
                  value={building}
                  onChange={e => setBuilding(e.target.value)}
                />
              </div>
            </div>
          </>
        )}

        <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 8 }}>
          {loading ? '处理中...' : isRegister ? '注 册' : '登 录'}
        </button>
      </form>

      <div className="auth-toggle">
        {isRegister ? (
          <>已有账号？<a onClick={() => { setIsRegister(false); setError(''); }}>去登录</a></>
        ) : (
          <>没有账号？<a onClick={() => { setIsRegister(true); setError(''); }}>去注册</a></>
        )}
      </div>

      {!isRegister && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: '#f9f9f9', borderRadius: 8, fontSize: 13, color: '#888' }}>
          <div style={{ fontWeight: 600, color: '#666', marginBottom: 6 }}>测试账号（密码均为 123456）</div>
          <div>zhangsan / lisi / wangwu / zhaoliu / sunqi</div>
        </div>
      )}
    </div>
  );
}
