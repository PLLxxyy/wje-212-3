const API_BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('token');
}

export function setToken(token: string) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function getStoredUser(): any {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

export function setStoredUser(user: any) {
  localStorage.setItem('user', JSON.stringify(user));
}

async function request(path: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || '请求失败');
  }
  return data;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (data: { username: string; password: string; nickname: string; phone: string; building: string }) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),

  // Requests
  getRequests: (params?: { type?: string; status?: string; search?: string }) => {
    const qs = new URLSearchParams();
    if (params?.type) qs.set('type', params.type);
    if (params?.status) qs.set('status', params.status);
    if (params?.search) qs.set('search', params.search);
    return request(`/requests?${qs.toString()}`);
  },
  getRequestDetail: (id: string) => request(`/requests/${id}`),
  createRequest: (data: { type: string; description: string; reward: string; deadline: string }) =>
    request('/requests', { method: 'POST', body: JSON.stringify(data) }),
  acceptRequest: (id: string) => request(`/requests/${id}/accept`, { method: 'POST' }),
  confirmStart: (id: string) => request(`/requests/${id}/confirm-start`, { method: 'POST' }),
  completeRequest: (id: string) => request(`/requests/${id}/complete`, { method: 'POST' }),
  reviewRequest: (id: string, rating: number, comment: string) =>
    request(`/requests/${id}/review`, { method: 'POST', body: JSON.stringify({ rating, comment }) }),

  // QA
  getQA: (id: string) => request(`/requests/${id}/qa`),
  postQA: (id: string, content: string, parent_id?: string, nickname?: string) =>
    request(`/requests/${id}/qa`, { method: 'POST', body: JSON.stringify({ content, parent_id, nickname }) }),

  // User
  getMe: () => request('/users/me'),
  getMyRequests: () => request('/users/me/requests'),
  getMyHelped: () => request('/users/me/helped'),
  getLeaderboard: () => request('/users/leaderboard'),
};
