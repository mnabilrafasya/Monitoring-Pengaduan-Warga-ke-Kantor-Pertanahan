// backend/utils/excelParser.js
const XLSX = require('xlsx');

const parseExcelFile = async (buffer) => {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    
    // Map column names to database fields
    const mappedData = rawData.map((row, index) => {
      // Normalize column names (remove spaces, lowercase)
      const normalizedRow = {};
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
        normalizedRow[normalizedKey] = value;
      }

      return {
        no: normalizedRow.no || normalizedRow.nomor || index + 1,
        unit_code: normalizedRow.unit_code || normalizedRow.kode_unit || `KPU${String(index + 1).padStart(3, '0')}`,
        nama_lengkap: normalizedRow.nama_lengkap || normalizedRow.nama || '',
        nomor_telepon: normalizedRow.nomor_telepon || normalizedRow.no_telp || normalizedRow.telepon || '',
        nomor_berkas: normalizedRow.nomor_berkas || normalizedRow.no_berkas || '',
        alamat: normalizedRow.alamat || '',
        keperluan: normalizedRow.keperluan || '',
        waktu_kedatangan: normalizedRow.waktu_kedatangan || normalizedRow.tanggal || '',
        catatan: normalizedRow.catatan || normalizedRow.keterangan || '',
        petugas: normalizedRow.petugas || '',
        status: normalizedRow.status || 'Pending'
      };
    });

    return mappedData;
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error('Gagal membaca file Excel: ' + error.message);
  }
};

module.exports = { parseExcelFile };