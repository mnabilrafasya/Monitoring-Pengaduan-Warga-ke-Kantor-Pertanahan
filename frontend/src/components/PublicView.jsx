// frontend/src/components/PublicView.jsx
import React, { useState } from "react";
import {
  Search,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  Info,
  Phone,
  MapPin,
  Calendar,
  User,
  Mail,
  CreditCard,
} from "lucide-react";
import { complaintAPI } from "../services/api";

const PublicView = ({ onNavigate }) => {
  const [unitCode, setUnitCode] = useState("");
  const [complaint, setComplaint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "selesai":
        return "bg-green-100 text-green-800 border-green-300";
      case "proses":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "pending":
        return "bg-red-100 text-red-800 border-red-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "selesai":
        return <CheckCircle className="w-5 h-5" />;
      case "proses":
        return <Clock className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  const handleCheckStatus = async () => {
    if (!unitCode.trim()) {
      setError("Masukkan kode unit terlebih dahulu");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await complaintAPI.checkByUnitCode(unitCode);
      setComplaint(response.data.data);
    } catch (err) {
      setError(err.response?.data?.message || "Kode unit tidak ditemukan");
      setComplaint(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setComplaint(null);
    setUnitCode("");
    setError("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 text-white py-12 shadow-lg">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="inline-flex items-center justify-center mb-4">
              <img
                src="/logo_bpn.png"
                alt="Logo BPN"
                className="h-16 md:h-36 lg:h-40 w-auto object-contain"
              />
            </div>

            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              Sistem Monitoring Pengaduan
            </h1>
            <p className="text-xl text-green-100 mb-2">
              Kantor Pertanahan Kota Palembang
            </p>
            <p className="text-green-100 max-w-2xl mx-auto">
              Pantau status pengaduan Anda secara real-time dengan mudah dan
              cepat
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12">
        {!complaint ? (
          <>
            {/* Search Section */}
            <div className="max-w-2xl mx-auto mb-12">
              <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
                <div className="text-center mb-6">
                  <h2 className="text-2xl md:text-3xl font-semibold text-gray-800 mb-2">
                    Cek Status Pengaduan Anda
                  </h2>
                  <p className="text-gray-600">
                    Masukkan kode unit untuk melihat detail dan status pengaduan
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Masukkan Kode Unit
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={unitCode}
                        onChange={(e) => {
                          setUnitCode(e.target.value.toUpperCase());
                          setError("");
                        }}
                        onKeyPress={(e) =>
                          e.key === "Enter" && handleCheckStatus()
                        }
                        placeholder="Contoh: KPU-000PP"
                        className="w-full px-5 py-4 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-lg font-semibold tracking-wide transition-all"
                      />
                      <Search className="w-6 h-6 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2" />
                    </div>
                    <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
                      <Info className="w-4 h-4" />
                      <span>Kode unit terdapat pada bukti pengaduan Anda</span>
                    </div>
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl animate-scaleIn">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                        <p className="text-sm text-red-800 font-medium">
                          {error}
                        </p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleCheckStatus}
                    disabled={loading || !unitCode.trim()}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-4 px-6 rounded-xl transition duration-200 flex items-center justify-center gap-3 shadow-lg disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Mencari data...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        <span>Cek Status Pengaduan</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Info Cards */}
            <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">
                      Mudah & Cepat
                    </h3>
                    <p className="text-sm text-gray-600">
                      Cek status hanya dengan kode unit
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Clock className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">
                      Real-time Update
                    </h3>
                    <p className="text-sm text-gray-600">
                      Informasi terkini setiap saat
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 hover:shadow-lg transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <FileText className="w-8 h-8 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-1">
                      Detail Lengkap
                    </h3>
                    <p className="text-sm text-gray-600">
                      Lihat semua informasi pengaduan
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Admin Login Link */}
            <div className="text-center">
              <div className="inline-block bg-white rounded-xl shadow-md px-6 py-4 border border-gray-100">
                <p className="text-gray-600 mb-2">Petugas kantor pertanahan?</p>
                <button
                  onClick={() => onNavigate("login")}
                  className="text-green-600 hover:text-green-700 font-semibold flex items-center gap-2 mx-auto"
                >
                  <span>Login Admin</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="max-w-4xl mx-auto animate-scaleIn">
            {/* Status Banner */}
            <div
              className={`rounded-2xl p-6 mb-6 border-2 ${getStatusColor(
                complaint.status
              )}`}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  {getStatusIcon(complaint.status)}
                  <div>
                    <p className="text-sm font-medium opacity-80">
                      Status Pengaduan
                    </p>
                    <p className="text-2xl font-bold">{complaint.status}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm opacity-80">Kode Unit</p>
                  <p className="text-2xl font-bold font-mono">
                    {complaint.unit_code}
                  </p>
                </div>
              </div>
            </div>

            {/* Detail Cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-6">
              {/* Personal Info */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Informasi Pemohon
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Nama Lengkap</p>
                    <p className="font-semibold text-gray-800 text-lg">
                      {complaint.nama_lengkap}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        Telepon
                      </p>
                      <p className="font-semibold text-gray-800">
                        {complaint.nomor_telepon || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">No Berkas</p>
                      <p className="font-semibold text-gray-800">
                        {complaint.nomor_berkas || "-"}
                      </p>
                    </div>
                  </div>
                  {complaint.email && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        Email
                      </p>
                      <p className="font-semibold text-gray-800">
                        {complaint.email}
                      </p>
                    </div>
                  )}

                  {complaint.nik && (
                    <div>
                      <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                        <CreditCard className="w-3 h-3" />
                        NIK
                      </p>
                      <p className="font-semibold text-gray-800 font-mono">
                        {complaint.nik}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Alamat
                    </p>
                    <p className="font-semibold text-gray-800">
                      {complaint.alamat}
                    </p>
                  </div>
                </div>
              </div>

              {/* Processing Info */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Detail Pengaduan
                  </h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Keperluan</p>
                    <p className="font-semibold text-gray-800">
                      {complaint.keperluan}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 mb-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Waktu Kedatangan
                      </p>
                      <p className="font-semibold text-gray-800">
                        {complaint.waktu_kedatangan}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Petugas</p>
                      <p className="font-semibold text-gray-800">
                        {complaint.petugas || "Belum ditentukan"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-lg p-6 border border-gray-200 mb-6">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Info className="w-5 h-5 text-gray-600" />
                Catatan
              </h3>
              <p className="text-gray-700 leading-relaxed">
                {complaint.catatan || "Tidak ada catatan tambahan"}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex">
              <button
                onClick={handleReset}
                className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold py-4 px-6 rounded-xl transition duration-200 shadow-lg"
              >
                ← Cek Kode Lain
              </button>
            </div>
          </div>
        )}
      </div>
      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="container mx-auto px-4">
          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Left Side - Copyright & Developer */}
            <div className="text-center md:text-left">
              <p className="text-gray-300 text-lg font-semibold mb-2">
                © 2026 Kantor Pertanahan Kota Palembang
              </p>
              <p className="text-gray-400 text-sm">
                Developed by <span className="font-bold text-white">NAZ</span>
              </p>
            </div>

            {/* Right Side - Contact Info */}
            <div className="text-center flex-row md:text-right">
              <p className="text-gray-400 text-sm mb-3">More Information:</p>
              <div className="space-y-2">
                {/* Email */}
                <div className="flex items-center justify-center md:justify-end gap-2">
                  <a
                    href="mailto:mnabilrafasya03@gmail.com"
                    className="text-gray-300 hover:text-white transition-colors duration-200"
                  >
                    mnabilrafasya03@gmail.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700 pt-4 mt-4">
            <p className="text-center text-gray-500 text-sm">
              Sistem Monitoring Pengaduan
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicView;
