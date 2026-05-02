export const getUser = () => {
  try {
    const raw = localStorage.getItem('user');
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getToken = () => localStorage.getItem('token') || null;

export const isAuthenticated = () => !!getToken();

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};