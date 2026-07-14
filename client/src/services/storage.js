const TOKEN_KEY = 'labbeih.token';
const USER_KEY = 'labbeih.user';
const GUEST_KEY = 'labbeih.guest';

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export const userStorage = {
  get: () => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  set: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  clear: () => localStorage.removeItem(USER_KEY),
};

export const guestStorage = {
  get: () => {
    const raw = localStorage.getItem(GUEST_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  set: (guest) => localStorage.setItem(GUEST_KEY, JSON.stringify(guest)),
  clear: () => localStorage.removeItem(GUEST_KEY),
};

export function clearSession() {
  tokenStorage.clear();
  userStorage.clear();
  guestStorage.clear();
}
