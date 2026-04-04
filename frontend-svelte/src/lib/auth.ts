import { writable, get } from 'svelte/store';
import { goto } from '$app/navigation';
import { getMe, login as apiLogin, register as apiRegister, logout as apiLogout } from './api';
import type { UserMe } from './api';

export const user = writable<UserMe | null>(null);
export const isLoading = writable(true);

export async function initAuth() {
  try {
    const me = await getMe();
    user.set(me);
    // Apply theme from server preference
    if (typeof document !== 'undefined') {
      const pref = me.theme_preference ?? 'dark';
      if (pref === 'light') {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      }
    }
  } catch {
    user.set(null);
  } finally {
    isLoading.set(false);
  }
}

export async function login(email: string, password: string) {
  const me = await apiLogin(email, password);
  user.set(me);
  goto('/');
}

export async function register(email: string, password: string, displayName: string) {
  const me = await apiRegister(email, password, displayName);
  user.set(me);
  goto('/');
}

export async function logout() {
  try { await apiLogout(); } catch {}
  user.set(null);
  goto('/login');
}

export async function refreshUser() {
  try {
    const me = await getMe();
    user.set(me);
  } catch {}
}
