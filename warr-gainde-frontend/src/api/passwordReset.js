import api from './axios';

export const forgotPassword = (email) =>
  api.post('/forgot-password', { email });

export const resetPassword = (data) =>
  api.post('/reset-password', data);

export const forgotPasswordPhone = (telephone) =>
  api.post('/forgot-password-phone', { telephone });

export const verifyOtp = (data) =>
  api.post('/verify-otp', data);

export const resetPasswordPhone = (data) =>
  api.post('/reset-password-phone', data);
