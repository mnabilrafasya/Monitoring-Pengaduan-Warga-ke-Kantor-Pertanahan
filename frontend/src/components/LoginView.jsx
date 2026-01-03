// frontend/src/components/LoginView.jsx
import React, { useState } from 'react';
import { Lock, UserPlus, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { authAPI } from '../services/api';

const LoginView = ({ onNavigate, onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    divisi: ''
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = () => {
    if (!formData.username.trim()) {
      setError('Username harus diisi');
      return false;
    }
    if (!formData.password.trim()) {
      setError('Password harus diisi');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password minimal 6 karakter');
      return false;
    }
    if (isRegister && !formData.email.trim()) {
      setError('Email harus diisi');
      return false;
    }
    if (isRegister && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Format email tidak valid');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        await authAPI.register(formData);
        // Show success message
        setError('');
        setIsRegister(false);
        setFormData({ username: '', email: '', password: '', divisi: '' });
        // You might want to show a success toast here
        setTimeout(() => {
          alert('Registrasi berhasil! Silakan login.');
        }, 100);
      } else {
        const response = await authAPI.login({
          username: formData.username,
          password: formData.password
        });
        
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        onLoginSuccess(response.data.user);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          {/* Icon and Title */}
          <div className="text-center mb-8">
            <div className="inline-block p-4 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl mb-4 shadow-lg">
              {isRegister ? (
                <UserPlus className="w-10 h-10 text-white" />
              ) : (
                <Lock className="w-10 h-10 text-white" />
              )}
            </div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {isRegister ? 'Registrasi Admin' : 'Login Admin'}
            </h2>
            <p className="text-gray-600">
              {isRegister ? 'Buat akun admin baru' : 'Masuk ke dashboard admin'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email (Register only) */}
            {isRegister && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@pertanahan.go.id"
                  required={isRegister}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                />
              </div>
            )}

            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Username <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Masukkan username"
                required
                autoComplete="username"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Minimal 6 karakter</p>
            </div>

            {/* Divisi (Register only) */}
            {isRegister && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Divisi
                </label>
                <input
                  type="text"
                  name="divisi"
                  value={formData.divisi}
                  onChange={handleChange}
                  placeholder="Contoh: Pengukuran, Hak Tanah, dll"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl animate-scaleIn">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-red-800 font-medium">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-xl transition duration-200 shadow-lg disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <span>{isRegister ? 'Daftar Sekarang' : 'Masuk'}</span>
              )}
            </button>

            {/* Toggle Register/Login */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                  setFormData({ username: '', email: '', password: '', divisi: '' });
                }}
                className="text-sm text-green-600 hover:text-green-700 font-semibold hover:underline transition-colors"
              >
                {isRegister ? 'Sudah punya akun? Login disini' : 'Belum punya akun? Daftar disini'}
              </button>
            </div>
          </form>

          {/* Back Button */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={() => onNavigate('public')}
              className="w-full text-gray-600 hover:text-gray-800 font-medium hover:bg-gray-50 py-2 px-4 rounded-lg transition-colors"
            >
              ← Kembali ke Halaman Utama
            </button>
          </div>
        </div>

        {/* Info Card */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800 text-center">
            <span className="font-semibold">Info:</span> Halaman ini khusus untuk petugas Kantor Pertanahan
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;