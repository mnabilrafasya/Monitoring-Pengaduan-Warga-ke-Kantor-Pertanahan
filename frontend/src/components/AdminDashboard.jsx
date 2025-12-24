// frontend/src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Search, Upload, FileText, CheckCircle, Clock, AlertCircle, ChevronLeft, ChevronRight, Eye, Edit, Trash2, X } from 'lucide-react';
import { complaintAPI } from '../services/api';

const AdminDashboard = ({ user, onLogout }) => {
  const [complaints, setComplaints] = useState([]);
  const [statistics, setStatistics] = useState({ total: 0, selesai: 0, proses: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    fetchComplaints();
    fetchStatistics();
  }, [currentPage, searchTerm, statusFilter]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await complaintAPI.getAll({
        page: currentPage,
        limit: 10,
        search: searchTerm,
        status: statusFilter
      });
      setComplaints(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await complaintAPI.getStatistics();
      setStatistics(response.data.statistics);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'];
      if (!validTypes.includes(file.type)) {
        alert('Tipe file tidak valid. Gunakan .xlsx, .xls, atau .csv');
        return;
      }
      setUploadFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      alert('Pilih file terlebih dahulu');
      return;
    }

    setUploading(true);
    try {
      const response = await complaintAPI.uploadExcel(uploadFile);
      alert(`Upload berhasil!\nTotal: ${response.data.summary.total}\nDitambahkan: ${response.data.summary.inserted}\nDiupdate: ${response.data.summary.updated}`);
      setUploadFile(null);
      fetchComplaints();
      fetchStatistics();
    } catch (error) {
      alert(error.response?.data?.message || 'Gagal upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Yakin ingin menghapus data ini?')) return;

    try {
      await complaintAPI.delete(id);
      alert('Data berhasil dihapus');
      fetchComplaints();
      fetchStatistics();
    } catch (error) {
      alert('Gagal menghapus data');
    }
  };

  const handleUpdate = async () => {
    try {
      await complaintAPI.update(selectedComplaint.id, selectedComplaint);
      alert('Data berhasil diupdate');
      setEditMode(false);
      setSelectedComplaint(null);
      fetchComplaints();
      fetchStatistics();
    } catch (error) {
      alert('Gagal update data');
    }
  };

  const getStatusColor = (status) => {
    switch(status?.toLowerCase()) {
      case 'selesai': return 'bg-green-100 text-green-800 border-green-300';
      case 'proses': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'pending': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Dashboard Admin</h1>
                <p className="text-sm text-gray-600">Selamat datang, {user?.username} ({user?.divisi})</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Pengaduan</p>
                <p className="text-3xl font-bold text-gray-800">{statistics.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Selesai</p>
                <p className="text-3xl font-bold text-green-600">{statistics.selesai}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Proses</p>
                <p className="text-3xl font-bold text-yellow-600">{statistics.proses}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-3xl font-bold text-red-600">{statistics.pending}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Data Pengaduan</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
              {uploadFile && (
                <p className="text-sm text-gray-600 mt-2">
                  File: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(2)} KB)
                </p>
              )}
            </div>
            <button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
              {uploading ? 'Mengupload...' : 'Upload'}
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Data Pengaduan</h2>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="">Semua Status</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Proses">Proses</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600">Memuat data...</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Tidak ada data</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kode Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Keperluan</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Petugas</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {complaints.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm font-semibold text-gray-900">{item.unit_code}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{item.nama_lengkap}</div>
                          <div className="text-sm text-gray-500">{item.nomor_telepon}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">{item.keperluan}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{item.petugas || '-'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedComplaint(item);
                                setEditMode(false);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedComplaint(item);
                                setEditMode(true);
                              }}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Halaman {currentPage} dari {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail/Edit Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 className="text-xl font-semibold">
                {editMode ? 'Edit Data' : 'Detail Pengaduan'}
              </h3>
              <button onClick={() => setSelectedComplaint(null)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {editMode ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap</label>
                      <input
                        type="text"
                        value={selectedComplaint.nama_lengkap}
                        onChange={(e) => setSelectedComplaint({...selectedComplaint, nama_lengkap: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">No Telepon</label>
                      <input
                        type="text"
                        value={selectedComplaint.nomor_telepon}
                        onChange={(e) => setSelectedComplaint({...selectedComplaint, nomor_telepon: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Keperluan</label>
                    <textarea
                      value={selectedComplaint.keperluan}
                      onChange={(e) => setSelectedComplaint({...selectedComplaint, keperluan: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Petugas</label>
                      <input
                        type="text"
                        value={selectedComplaint.petugas}
                        onChange={(e) => setSelectedComplaint({...selectedComplaint, petugas: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={selectedComplaint.status}
                        onChange={(e) => setSelectedComplaint({...selectedComplaint, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Proses">Proses</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Catatan</label>
                    <textarea
                      value={selectedComplaint.catatan}
                      onChange={(e) => setSelectedComplaint({...selectedComplaint, catatan: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleUpdate}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg"
                    >
                      Simpan
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-2 px-4 rounded-lg"
                    >
                      Batal
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Kode Unit</p>
                      <p className="font-semibold">{selectedComplaint.unit_code}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">No Berkas</p>
                      <p className="font-semibold">{selectedComplaint.nomor_berkas || '-'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Nama</p>
                    <p className="font-semibold">{selectedComplaint.nama_lengkap}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Telepon</p>
                      <p className="font-semibold">{selectedComplaint.nomor_telepon || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Alamat</p>
                      <p className="font-semibold">{selectedComplaint.alamat}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Keperluan</p>
                    <p className="font-semibold">{selectedComplaint.keperluan}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Waktu Kedatangan</p>
                      <p className="font-semibold">{selectedComplaint.waktu_kedatangan}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Petugas</p>
                      <p className="font-semibold">{selectedComplaint.petugas || '-'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-block px-3 py-1 text-sm font-semibold rounded-full border ${getStatusColor(selectedComplaint.status)} mt-1`}>
                      {selectedComplaint.status}
                    </span>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">Catatan</p>
                    <p className="font-semibold">{selectedComplaint.catatan || '-'}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;