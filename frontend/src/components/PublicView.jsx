// frontend/src/components/PublicView.jsx
import React, { useState } from 'react';
import { Search, FileText, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { complaintAPI } from '../services/api';

const PublicView = ({ onNavigate }) => {
  const [unitCode, setUnitCode] = useState('');
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'selesai': return 'bg-green-100 text-green-800 border-green-300';
      case 'proses': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'pending': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'selesai': return <CheckCircle className="w-4 h-4" />;
      case 'proses': return <Clock className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const handleCheckStatus = async () => {
    if (!unitCode.trim()) {
      setError('Masukkan kode unit terlebih dahulu');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const response = await complaintAPI.checkByUnitCode(unitCode);
      setComplaint(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Kode unit tidak ditemukan');
      setComplaint(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setComplaint(null);
    setUnitCode('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <div className="inline-block p-3 bg-green-600 rounded-full mb-4">
            <FileText className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Sistem Monitoring Pengaduan
          </h1>
          <p className="text-lg text-gray-600">
            Kantor Pertanahan Kota Palembang
          </p>
        </div>

        {!complaint ? (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <h2 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
                Cek Status Pengaduan Anda
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Masukkan Kode Unit
                  </label>
                  <input
                    type="text"
                    value={unitCode}
                    onChange={(e) => {
                      setUnitCode(e.target.value.toUpperCase());
                      setError('');
                    }}
                    onKeyPress={(e) => e.key === 'Enter' && handleCheckStatus()}
                    placeholder="Contoh: KPU001"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none text-lg"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Kode unit terdapat pada bukti pengaduan Anda
                  </p>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleCheckStatus}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Mencari...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      Cek Status
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="text-center mt-8">
              <button
                onClick={() => onNavigate('login')}
                className="text-gray-600 hover:text-gray-800 font-medium"
              >
                Login Admin →
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Detail Pengaduan
                </h2>
                <span className={`px-4 py-2 rounded-full text-sm font-semibold border flex items-center gap-2 ${getStatusColor(complaint.status)}`}>
                  {getStatusIcon(complaint.status)}
                  {complaint.status}
                </span>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Kode Unit</p>
                    <p className="font-semibold text-gray-800">{complaint.unit_code}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nomor Berkas</p>
                    <p className="font-semibold text-gray-800">{complaint.nomor_berkas || '-'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Nama Lengkap</p>
                  <p className="font-semibold text-gray-800">{complaint.nama_lengkap}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Nomor Telepon</p>
                    <p className="font-semibold text-gray-800">{complaint.nomor_telepon || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Alamat</p>
                    <p className="font-semibold text-gray-800">{complaint.alamat}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500">Keperluan</p>
                  <p className="font-semibold text-gray-800">{complaint.keperluan}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Waktu Kedatangan</p>
                    <p className="font-semibold text-gray-800">{complaint.waktu_kedatangan}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Petugas</p>
                    <p className="font-semibold text-gray-800">{complaint.petugas || '-'}</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500 mb-1">Catatan</p>
                  <p className="text-gray-800">{complaint.catatan || 'Tidak ada catatan'}</p>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="mt-6 w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 px-6 rounded-lg transition duration-200"
              >
                Kembali
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicView;