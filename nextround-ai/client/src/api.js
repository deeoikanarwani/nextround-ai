import axios from 'axios';

export const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('nr_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (e) => {
    const url = e.config?.url || '';
    if (e.response?.status === 401 && !url.startsWith('/auth/login') && !url.startsWith('/auth/register') && localStorage.getItem('nr_token')) {
      localStorage.removeItem('nr_token');
      window.location.assign('/login');
    }
    return Promise.reject(e);
  }
);

export const errMsg = (e) => {
  if (e?.response?.data?.code === 'EMAIL_NOT_VERIFIED') return e.response.data.error || 'Please verify your email first';
  return e?.response?.data?.error || (e?.code === 'ERR_NETWORK' ? 'Cannot reach the server. Is the backend running?' : e?.message || 'Something went wrong.');
};
