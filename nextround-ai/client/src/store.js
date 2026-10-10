import { create } from 'zustand';
import { api } from './api';

export const useAuth = create((set) => ({
  user: null,
  ready: false,
  async init() {
    if (!localStorage.getItem('nr_token')) return set({ ready: true });
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, ready: true });
    } catch {
      localStorage.removeItem('nr_token');
      set({ user: null, ready: true });
    }
  },
  async refreshUser() {
    const { data } = await api.get('/auth/me');
    set({ user: data.user });
    return data.user;
  },
  async login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('nr_token', data.token);
    set({ user: data.user });
  },
  async register(name, email, password) {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('nr_token', data.token);
    set({ user: data.user });
  },
  async logout() {
    try { await api.post('/auth/logout'); } catch { /* stateless JWT */ }
    localStorage.removeItem('nr_token');
    set({ user: null });
  },
  setUser: (user) => set({ user }),
}));
