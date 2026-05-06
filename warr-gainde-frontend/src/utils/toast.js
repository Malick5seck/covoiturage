import hotToast from 'react-hot-toast';

const base = { duration: 4000 };

/**
 * Toasts globaux (react-hot-toast), alignés avec l’UX Warr Gaïndé.
 * Les notifications temps réel utilisent {@link NotificationToast} dans la Navbar.
 */
export const toast = {
  success: (message, options = {}) =>
    hotToast.success(message, { ...base, ...options }),

  error: (message, options = {}) =>
    hotToast.error(message, { ...base, duration: 4500, ...options }),

  info: (message, options = {}) =>
    hotToast(message, {
      ...base,
      icon: 'ℹ️',
      style: {
        borderRadius: '1rem',
        background: '#eff6ff',
        color: '#1e3a5f',
      },
      ...options,
    }),

  warning: (message, options = {}) =>
    hotToast(message, {
      ...base,
      icon: '⚠️',
      style: {
        borderRadius: '1rem',
        background: '#fffbeb',
        color: '#92400e',
      },
      ...options,
    }),
};

export { Toaster } from 'react-hot-toast';
