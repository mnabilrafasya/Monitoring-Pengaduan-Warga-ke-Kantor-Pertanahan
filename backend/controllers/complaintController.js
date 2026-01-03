// backend/controllers/complaintController.js
const db = require('../config/database');
const XLSX = require('xlsx');

// Helper function to check if row is empty
const isEmptyRow = (row) => {
  if (!row) return true;
  const values = Object.values(row);
  return values.every(value => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (typeof value === 'number' && isNaN(value)) return true;
    return false;
  });
};

// Helper function to check if essential fields are present
const hasEssentialData = (row) => {
  return (
    (row.nama_lengkap && row.nama_lengkap.toString().trim()) ||
    (row.unit_code && row.unit_code.toString().trim())
  );
};

// Get complaint by unit code (public)
exports.getByUnitCode = async (req, res) => {
  try {
    const { unitCode } = req.params;

    const [complaints] = await db.query(
      'SELECT * FROM complaints WHERE unit_code = ?',
      [unitCode]
    );

    if (complaints.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Kode unit tidak ditemukan' 
      });
    }

    res.json({
      success: true,
      data: complaints[0]
    });
  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan' 
    });
  }
};

// Get all complaints (admin)
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM complaints WHERE 1=1';
    const params = [];

    // Search filter
    if (search) {
      query += ' AND (nama_lengkap LIKE ? OR unit_code LIKE ? OR keperluan LIKE ? OR petugas LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    // Status filter
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    // Count total
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    // Get data with pagination
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [complaints] = await db.query(query, params);

    res.json({
      success: true,
      data: complaints,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get all complaints error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan' 
    });
  }
};

// Get statistics
exports.getStatistics = async (req, res) => {
  try {
    const [totalResult] = await db.query('SELECT COUNT(*) as total FROM complaints');
    const [selesaiResult] = await db.query('SELECT COUNT(*) as total FROM complaints WHERE status = "Selesai"');
    const [prosesResult] = await db.query('SELECT COUNT(*) as total FROM complaints WHERE status = "Proses"');
    const [pendingResult] = await db.query('SELECT COUNT(*) as total FROM complaints WHERE status = "Pending"');

    res.json({
      success: true,
      statistics: {
        total: totalResult[0].total,
        selesai: selesaiResult[0].total,
        proses: prosesResult[0].total,
        pending: pendingResult[0].total
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan' 
    });
  }
};

// Upload Excel file with empty row filtering
exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'File tidak ditemukan' 
      });
    }

    // Read Excel file
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(sheet, { 
      defval: null,
      raw: false 
    });

    console.log(`📊 Total rows from Excel: ${rawData.length}`);

    // Filter out empty rows and rows without essential data
    const validData = rawData.filter((row, index) => {
      // Normalize column names
      const normalizedRow = {};
      for (const [key, value] of Object.entries(row)) {
        const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
        normalizedRow[normalizedKey] = value;
      }

      // Check if empty
      if (isEmptyRow(normalizedRow)) {
        console.log(`⏭️  Row ${index + 2} is empty, skipping...`);
        return false;
      }
      
      // Check if has essential data
      if (!hasEssentialData(normalizedRow)) {
        console.log(`⚠️  Row ${index + 2} lacks essential data, skipping...`);
        return false;
      }
      
      return true;
    });

    console.log(`✅ Valid rows: ${validData.length}`);
    console.log(`🚫 Skipped: ${rawData.length - validData.length} empty rows`);

    let inserted = 0;
    let updated = 0;
    let errors = [];

    for (const [index, row] of validData.entries()) {
      try {
        // Normalize column names
        const normalizedRow = {};
        for (const [key, value] of Object.entries(row)) {
          const normalizedKey = key.toLowerCase().trim().replace(/\s+/g, '_');
          normalizedRow[normalizedKey] = value;
        }

        // Map to database fields
        const complaintData = {
          no: normalizedRow.no || normalizedRow.nomor || index + 1,
          unit_code: normalizedRow.unit_code || normalizedRow.kode_unit || `KPU${String(index + 1).padStart(3, '0')}`,
          nama_lengkap: normalizedRow.nama_lengkap || normalizedRow.nama || '',
          nomor_telepon: normalizedRow.nomor_telepon || normalizedRow.no_telp || normalizedRow.telepon || '',
          nomor_berkas: normalizedRow.nomor_berkas || normalizedRow.no_berkas || '',
          alamat: normalizedRow.alamat || '',
          keperluan: normalizedRow.keperluan || '',
          waktu_kedatangan: normalizedRow.waktu_kedatangan || normalizedRow.tanggal || new Date().toISOString(),
          catatan: normalizedRow.catatan || normalizedRow.keterangan || '',
          petugas: normalizedRow.petugas || '',
          status: normalizedRow.status || 'Pending'
        };

        // Validate required fields
        if (!complaintData.nama_lengkap) {
          errors.push({ row: index + 2, error: 'Missing nama_lengkap' });
          continue;
        }

        // Check if exists
        const [existing] = await db.query(
          'SELECT id FROM complaints WHERE unit_code = ?',
          [complaintData.unit_code]
        );

        if (existing.length > 0) {
          // Update
          await db.query(
            `UPDATE complaints SET 
              no = ?, nama_lengkap = ?, nomor_telepon = ?, nomor_berkas = ?,
              alamat = ?, keperluan = ?, waktu_kedatangan = ?, catatan = ?,
              petugas = ?, status = ?, updated_at = CURRENT_TIMESTAMP
            WHERE unit_code = ?`,
            [
              complaintData.no, complaintData.nama_lengkap, 
              complaintData.nomor_telepon, complaintData.nomor_berkas,
              complaintData.alamat, complaintData.keperluan, 
              complaintData.waktu_kedatangan, complaintData.catatan,
              complaintData.petugas, complaintData.status, 
              complaintData.unit_code
            ]
          );
          updated++;
          console.log(`🔄 Updated: ${complaintData.unit_code}`);
        } else {
          // Insert
          await db.query(
            `INSERT INTO complaints 
              (unit_code, no, nama_lengkap, nomor_telepon, nomor_berkas, alamat, 
               keperluan, waktu_kedatangan, catatan, petugas, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              complaintData.unit_code, complaintData.no, 
              complaintData.nama_lengkap, complaintData.nomor_telepon, 
              complaintData.nomor_berkas, complaintData.alamat, 
              complaintData.keperluan, complaintData.waktu_kedatangan, 
              complaintData.catatan, complaintData.petugas, 
              complaintData.status
            ]
          );
          inserted++;
          console.log(`➕ Inserted: ${complaintData.unit_code}`);
        }
      } catch (error) {
        console.error(`❌ Error row ${index + 2}:`, error);
        errors.push({ row: index + 2, error: error.message });
      }
    }

    res.json({
      success: true,
      message: 'Upload berhasil',
      summary: {
        total: rawData.length,
        validRows: validData.length,
        emptyRowsSkipped: rawData.length - validData.length,
        inserted,
        updated,
        errors: errors.length
      },
      errorDetails: errors.length > 0 ? errors.slice(0, 10) : undefined
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan saat upload: ' + error.message 
    });
  }
};

// Update complaint
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const fields = [];
    const values = [];

    // Build dynamic update query
    for (const [key, value] of Object.entries(updateData)) {
      if (key !== 'id' && key !== 'unit_code') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Tidak ada data yang diupdate' 
      });
    }

    values.push(id);

    await db.query(
      `UPDATE complaints SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: 'Data berhasil diupdate'
    });
  } catch (error) {
    console.error('Update error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan' 
    });
  }
};

// Delete complaint
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query('DELETE FROM complaints WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Data berhasil dihapus'
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan' 
    });
  }
};