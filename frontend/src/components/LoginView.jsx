// frontend/src/components/LoginView.jsx
import React, { useState } from 'react';
import { Lock, UserPlus } from 'lucide-react';
import { authAPI } from '../services/api';

const LoginView = ({ onNavigate, onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isRegister) {
        await authAPI.register(formData);
        alert('Registrasi berhasil! Silakan login.');
        setIsRegister(false);
        setFormData({ username: '', email: '', password: '', divisi: '' });
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
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-green-600 rounded-full mb-4">
              {isRegister ? (
                <UserPlus className="w-8 h-8 text-white" />
              ) : (
                <Lock className="w-8 h-8 text-white" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-gray-800">
              {isRegister ? 'Registrasi Admin' : 'Login Admin'}
            </h2>
            <p className="text-gray-600 mt-2">
              {isRegister ? 'Buat akun admin baru' : 'Masuk ke dashboard admin'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="admin@pertanahan.go.id"
                  required={isRegister}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="username"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
              />
            </div>

            {isRegister && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Divisi
                </label>
                <input
                  type="text"
                  name="divisi"
                  value={formData.divisi}
                  onChange={handleChange}
                  placeholder="Contoh: Pengukuran, Hak Tanah, dll"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                />
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200"
            >
              {loading ? 'Memproses...' : isRegister ? 'Daftar' : 'Masuk'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError('');
                  setFormData({ username: '', email: '', password: '', divisi: '' });
                }}
                className="text-sm text-green-600 hover:text-green-700 font-medium"
              >
                {isRegister ? 'Sudah punya akun? Login' : 'Belum punya akun? Daftar'}
              </button>
            </div>
          </form>

          <button
            onClick={() => onNavigate('public')}
            className="mt-6 w-full text-gray-600 hover:text-gray-800 font-medium"
          >
            ← Kembali ke Halaman Utama
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginView;