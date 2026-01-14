// frontend/src/components/AdminDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Search, Upload, FileText, CheckCircle, Clock, AlertCircle, ChevronLeft, ChevronRight, Eye, Edit, Trash2, X, Download, Plus, Mail, CreditCard } from 'lucide-react';
import { complaintAPI } from '../services/api';
import { useDebounce } from '../hooks/useDebounce';
import { useToast, ToastContainer } from './Toast';
import ConfirmDialog from './ConfirmDialog';

const AdminDashboard = ({ user, onLogout }) => {
  const [complaints, setComplaints] = useState([]);
  const [statistics, setStatistics] = useState({ total: 0, selesai: 0, proses: 0, pending: 0 });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  // ==================== PERUBAHAN: State untuk Create Mode ====================
  const [createMode, setCreateMode] = useState(false);
  const [newComplaint, setNewComplaint] = useState({
    nama_lengkap: '',
    nomor_telepon: '',
    email: '',
    nik: '',
    nomor_berkas: '',
    alamat: '',
    keperluan: '',
    waktu_kedatangan: new Date().toISOString().slice(0, 16),
    petugas: '',
    status: 'Pending',
    catatan: ''
  });
  // ==================== END PERUBAHAN ====================

  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, onConfirm: null, title: '', message: '' });

  const { toasts, addToast, removeToast } = useToast();
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    fetchComplaints();
    fetchStatistics();
  }, [currentPage, debouncedSearch, statusFilter, itemsPerPage]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const response = await complaintAPI.getAll({
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch,
        status: statusFilter
      });
      setComplaints(response.data.data);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      addToast('Gagal memuat data', 'error');
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
        addToast('Tipe file tidak valid. Gunakan .xlsx, .xls, atau .csv', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        addToast('Ukuran file maksimal 10MB', 'error');
        return;
      }
      setUploadFile(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) {
      addToast('Pilih file terlebih dahulu', 'error');
      return;
    }

    setUploading(true);
    try {
      const response = await complaintAPI.uploadExcel(uploadFile);
      addToast(
        `Upload berhasil! Total: ${response.data.summary.total}, Ditambahkan: ${response.data.summary.inserted}, Diupdate: ${response.data.summary.updated}`,
        'success',
        5000
      );
      setUploadFile(null);
      document.getElementById('file-input').value = '';
      fetchComplaints();
      fetchStatistics();
    } catch (error) {
      addToast(error.response?.data?.message || 'Gagal upload file', 'error');
    } finally {
      setUploading(false);
    }
  };

  // ==================== PERUBAHAN: Handler Create Manual ====================
  const handleCreate = async () => {
    // Validasi
    if (!newComplaint.nama_lengkap.trim()) {
      addToast('Nama lengkap wajib diisi', 'error');
      return;
    }

    try {
      const response = await complaintAPI.create(newComplaint);
      addToast(
        `Data berhasil ditambahkan dengan kode unit: ${response.data.data.unit_code}`,
        'success',
        5000
      );
      
      // Reset form
      setNewComplaint({
        nama_lengkap: '',
        nomor_telepon: '',
        email: '',
        nik: '',
        nomor_berkas: '',
        alamat: '',
        keperluan: '',
        waktu_kedatangan: new Date().toISOString().slice(0, 16),
        petugas: '',
        status: 'Pending',
        catatan: ''
      });
      
      setCreateMode(false);
      fetchComplaints();
      fetchStatistics();
    } catch (error) {
      addToast(error.response?.data?.message || 'Gagal menambahkan data', 'error');
    }
  };
  // ==================== END PERUBAHAN ====================

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hapus Data',
      message: 'Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan.',
      onConfirm: async () => {
        try {
          await complaintAPI.delete(id);
          addToast('Data berhasil dihapus', 'success');
          fetchComplaints();
          fetchStatistics();
        } catch (error) {
          addToast('Gagal menghapus data', 'error');
        }
      }
    });
  };

  const handleUpdate = async () => {
    try {
      await complaintAPI.update(selectedComplaint.id, selectedComplaint);
      addToast('Data berhasil diupdate', 'success');
      setEditMode(false);
      setSelectedComplaint(null);
      fetchComplaints();
      fetchStatistics();
    } catch (error) {
      addToast('Gagal update data', 'error');
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

  const exportToCSV = () => {
    const headers = ['Kode Unit', 'Nama', 'Telepon', 'Email', 'NIK', 'Alamat', 'Keperluan', 'Waktu Kedatangan', 'Petugas', 'Status', 'Catatan'];
    const rows = complaints.map(c => [
      c.unit_code,
      c.nama_lengkap,
      c.nomor_telepon || '',
      c.email || '',
      c.nik || '',
      c.alamat || '',
      c.keperluan,
      c.waktu_kedatangan,
      c.petugas || '',
      c.status,
      c.catatan || ''
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pengaduan_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    addToast('Data berhasil diexport', 'success');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-600 to-green-700 rounded-lg shadow-md">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Dashboard Admin</h1>
                <p className="text-sm text-gray-600">Selamat datang, {user?.username} ({user?.divisi})</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="px-5 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 font-medium rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Pengaduan</p>
                <p className="text-3xl font-bold text-gray-800">{statistics.total}</p>
                <p className="text-xs text-gray-500 mt-1">Semua data</p>
              </div>
              <div className="p-4 bg-blue-100 rounded-xl">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Selesai</p>
                <p className="text-3xl font-bold text-green-600">{statistics.selesai}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {statistics.total > 0 ? Math.round((statistics.selesai / statistics.total) * 100) : 0}% dari total
                </p>
              </div>
              <div className="p-4 bg-green-100 rounded-xl">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Proses</p>
                <p className="text-3xl font-bold text-yellow-600">{statistics.proses}</p>
                <p className="text-xs text-gray-500 mt-1">Sedang ditangani</p>
              </div>
              <div className="p-4 bg-yellow-100 rounded-xl">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-3xl font-bold text-red-600">{statistics.pending}</p>
                <p className="text-xs text-gray-500 mt-1">Menunggu tindakan</p>
              </div>
              <div className="p-4 bg-red-100 rounded-xl">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Data Pengaduan
          </h2>
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pilih File Excel/CSV
              </label>
              <input
                id="file-input"
                type="file"
                onChange={handleFileChange}
                accept=".xlsx,.xls,.csv"
                className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg hover:border-green-500 transition-colors cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              {uploadFile && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <span className="font-semibold">File:</span> {uploadFile.name}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Ukuran: {(uploadFile.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={handleUpload}
              disabled={!uploadFile || uploading}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg flex items-center gap-2 shadow-md transition-all disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Upload className="w-5 h-5" />
              {uploading ? 'Mengupload...' : 'Upload File'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Format: .xlsx, .xls, atau .csv. Maksimal 10MB. Sistem mendukung berbagai format kolom Excel (fleksibel). Baris kosong akan diabaikan otomatis.
          </p>
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Data Pengaduan
              </h2>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {/* ==================== PERUBAHAN: Tombol Tambah Data ==================== */}
                <button
                  onClick={() => setCreateMode(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg flex items-center gap-2 transition-colors shadow-md whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Tambah Data
                </button>
                {/* ==================== END PERUBAHAN ==================== */}

                <div className="relative flex-1 sm:flex-initial">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari nama, kode, atau keperluan..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="w-full sm:w-72 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                  {searchTerm && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                      Searching...
                    </span>
                  )}
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none bg-white"
                >
                  <option value="">Semua Status</option>
                  <option value="Selesai">✓ Selesai</option>
                  <option value="Proses">⏳ Proses</option>
                  <option value="Pending">⚠ Pending</option>
                </select>

                <button
                  onClick={exportToCSV}
                  disabled={complaints.length === 0}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 text-gray-700 font-medium rounded-lg flex items-center gap-2 transition-colors disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-gray-600 font-medium">Memuat data...</p>
              <p className="text-sm text-gray-500 mt-1">Mohon tunggu sebentar</p>
            </div>
          ) : complaints.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium">
                {searchTerm || statusFilter ? 'Tidak ada data yang sesuai' : 'Belum ada data'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {searchTerm || statusFilter ? 'Coba ubah filter pencarian' : 'Upload file Excel atau tambah data manual'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Kode Unit</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Nama</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Keperluan</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Petugas</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {complaints.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-mono text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-1 rounded">
                            {item.unit_code}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{item.nama_lengkap}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <span>📞</span> {item.nomor_telepon || '-'}
                          </div>
                          {item.nik && (
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <CreditCard className="w-3 h-3" />
                              {item.nik}
                            </div>
                          )}
                          {item.email && (
                            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                              <Mail className="w-3 h-3" />
                              {item.email}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate" title={item.keperluan}>
                            {item.keperluan}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {item.petugas ? (
                            <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                              {item.petugas}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
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
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Lihat Detail"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedComplaint(item);
                                setEditMode(true);
                              }}
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Hapus"
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

              <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-gray-700">
                    Halaman <span className="font-semibold">{currentPage}</span> dari <span className="font-semibold">{totalPages}</span>
                  </p>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                  >
                    <option value={10}>10 per halaman</option>
                    <option value={25}>25 per halaman</option>
                    <option value={50}>50 per halaman</option>
                    <option value={100}>100 per halaman</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ==================== PERUBAHAN: Modal Create Data Baru ==================== */}
      {createMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Plus className="w-5 h-5 text-green-600" />
                Tambah Data Pengaduan Baru
              </h3>
              <button 
                onClick={() => setCreateMode(false)} 
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nama Lengkap <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={newComplaint.nama_lengkap}
                    onChange={(e) => setNewComplaint({...newComplaint, nama_lengkap: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">No Telepon</label>
                  <input
                    type="text"
                    value={newComplaint.nomor_telepon}
                    onChange={(e) => setNewComplaint({...newComplaint, nomor_telepon: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={newComplaint.email}
                    onChange={(e) => setNewComplaint({...newComplaint, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="email@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">NIK</label>
                  <input
                    type="text"
                    value={newComplaint.nik}
                    onChange={(e) => setNewComplaint({...newComplaint, nik: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="16 digit NIK"
                    maxLength="16"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">No Berkas</label>
                  <input
                    type="text"
                    value={newComplaint.nomor_berkas}
                    onChange={(e) => setNewComplaint({...newComplaint, nomor_berkas: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Nomor berkas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alamat</label>
                  <input
                    type="text"
                    value={newComplaint.alamat}
                    onChange={(e) => setNewComplaint({...newComplaint, alamat: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Alamat lengkap"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Keperluan</label>
                <textarea
                  value={newComplaint.keperluan}
                  onChange={(e) => setNewComplaint({...newComplaint, keperluan: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Jelaskan keperluan pengaduan"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Waktu Kedatangan</label>
                  <input
                    type="datetime-local"
                    value={newComplaint.waktu_kedatangan}
                    onChange={(e) => setNewComplaint({...newComplaint, waktu_kedatangan: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Petugas</label>
                  <input
                    type="text"
                    value={newComplaint.petugas}
                    onChange={(e) => setNewComplaint({...newComplaint, petugas: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    placeholder="Nama petugas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    value={newComplaint.status}
                    onChange={(e) => setNewComplaint({...newComplaint, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
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
                  value={newComplaint.catatan}
                  onChange={(e) => setNewComplaint({...newComplaint, catatan: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="Catatan tambahan (opsional)"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleCreate}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors"
                >
                  Simpan Data
                </button>
                <button
                  onClick={() => setCreateMode(false)}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ==================== END PERUBAHAN ==================== */}

      {/* Detail/Edit Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-scaleIn">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                {editMode ? (
                  <>
                    <Edit className="w-5 h-5 text-green-600" />
                    Edit Data
                  </>
                ) : (
                  <>
                    <Eye className="w-5 h-5 text-blue-600" />
                    Detail Pengaduan
                  </>
                )}
              </h3>
              <button 
                onClick={() => {
                  setSelectedComplaint(null);
                  setEditMode(false);
                }} 
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-lg transition-colors"
              >
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
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">No Telepon</label>
                      <input
                        type="text"
                        value={selectedComplaint.nomor_telepon}
                        onChange={(e) => setSelectedComplaint({...selectedComplaint, nomor_telepon: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={selectedComplaint.email || ''}
                        onChange={(e) => setSelectedComplaint({...selectedComplaint, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">NIK</label>
                      <input
                        type="text"
                        value={selectedComplaint.nik || ''}
                        onChange={(e) => setSelectedComplaint({...selectedComplaint, nik: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Keperluan</label>
                    <textarea
                      value={selectedComplaint.keperluan}
                      onChange={(e) => setSelectedComplaint({...selectedComplaint, keperluan: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Petugas</label>
                      <input
                        type="text"
                        value={selectedComplaint.petugas}
                        onChange={(e) => setSelectedComplaint({...selectedComplaint, petugas: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={selectedComplaint.status}
                        onChange={(e) => setSelectedComplaint({...selectedComplaint, status: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                      placeholder="Tambahkan catatan atau update terkini..."
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={handleUpdate}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors"
                    >
                      Simpan Perubahan
                    </button>
                    <button
                      onClick={() => setEditMode(false)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors"
                    >
                      Batal
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Kode Unit</p>
                      <p className="font-semibold text-lg">{selectedComplaint.unit_code}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">No Berkas</p>
                      <p className="font-semibold text-lg">{selectedComplaint.nomor_berkas || '-'}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Nama Lengkap</p>
                    <p className="font-semibold text-lg">{selectedComplaint.nama_lengkap}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Telepon</p>
                      <p className="font-semibold">{selectedComplaint.nomor_telepon || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Email</p>
                      <p className="font-semibold">{selectedComplaint.email || '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">NIK</p>
                      <p className="font-semibold">{selectedComplaint.nik || '-'}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Alamat</p>
                      <p className="font-semibold">{selectedComplaint.alamat}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Keperluan</p>
                    <p className="font-semibold">{selectedComplaint.keperluan}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Waktu Kedatangan</p>
                      <p className="font-semibold">{selectedComplaint.waktu_kedatangan}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">Petugas</p>
                      <p className="font-semibold">{selectedComplaint.petugas || '-'}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-2">Status</p>
                    <span className={`inline-block px-4 py-2 text-sm font-semibold rounded-full border ${getStatusColor(selectedComplaint.status)}`}>
                      {selectedComplaint.status}
                    </span>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-500 mb-2">Catatan</p>
                    <p className="font-semibold text-gray-800">{selectedComplaint.catatan || '-'}</p>
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