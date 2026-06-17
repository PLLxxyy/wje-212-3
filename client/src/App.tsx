import { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate, useNavigate, Link, useLocation } from 'react-router-dom';
import { api, getStoredUser, setStoredUser, clearToken, setToken } from './api';
import Login from './pages/Login';
import Home from './pages/Home';
import CreateRequest from './pages/CreateRequest';
import RequestDetail from './pages/RequestDetail';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';

interface AuthContextType {
  user: any;
  setUser: (u: any) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  setUser: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-logo" onClick={() => navigate('/')}>
          <span>&#127968;</span> 邻里互助
        </div>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <nav className="header-nav">
              <Link to="/" className={location.pathname === '/' ? 'active' : ''}>首页</Link>
              <Link to="/create" className={location.pathname === '/create' ? 'active' : ''}>发布求助</Link>
              <Link to="/leaderboard" className={location.pathname === '/leaderboard' ? 'active' : ''}>达人榜</Link>
              <Link to="/profile" className={location.pathname === '/profile' ? 'active' : ''}>我的</Link>
            </nav>
            <div className="header-user">
              <span className="user-name">{user.nickname}</span>
              <span className="user-points">{user.points} 积分</span>
              <button onClick={logout} style={{ marginLeft: 4 }}>退出</button>
            </div>
          </div>
        ) : (
          <nav className="header-nav">
            <Link to="/login" className={location.pathname === '/login' ? 'active' : ''}>登录 / 注册</Link>
          </nav>
        )}
      </div>
    </header>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const [user, setUser] = useState<any>(getStoredUser());

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const freshUser = await api.getMe();
      setUser(freshUser);
      setStoredUser(freshUser);
    } catch {
      logout();
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && !user) {
      refreshUser();
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, logout, refreshUser }}>
      <Header />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
          <Route path="/" element={<Home />} />
          <Route path="/create" element={<ProtectedRoute><CreateRequest /></ProtectedRoute>} />
          <Route path="/requests/:id" element={<RequestDetail />} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer">邻里互助 &copy; 2024 远亲不如近邻</footer>
    </AuthContext.Provider>
  );
}
