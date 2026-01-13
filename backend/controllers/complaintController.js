// backend/controllers/complaintController.js
const db = require('../config/database');
const XLSX = require('xlsx');

// ==================== PERUBAHAN 1: Generator Kode Unit Acak ====================
// Generate random unique unit code
const generateUniqueUnitCode = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let isUnique = false;
  let unitCode = '';

  while (!isUnique) {
    // Generate KPU + 6 random characters (e.g., KPU-A3X9K2)
    unitCode = 'KPU-';
    for (let i = 0; i < 6; i++) {
      unitCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if exists in database
    const [existing] = await db.query(
      'SELECT id FROM complaints WHERE unit_code = ?',
      [unitCode]
    );

    if (existing.length === 0) {
      isUnique = true;
    }
  }

  return unitCode;
};
// ==================== END PERUBAHAN 1 ====================
const detectHeaderRow = (sheet) => {
  const range = XLSX.utils.decode_range(sheet['!ref']);

  for (let r = range.s.r; r <= range.e.r; r++) {
    const row = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: r,
      blankrows: false
    })[0];

    if (!row) continue;

    const normalized = row.map(v =>
      String(v || '').toLowerCase()
    );

    if (
      normalized.includes('nama') ||
      normalized.includes('nama lengkap') ||
      normalized.includes('ringkasan pengaduan') ||
      normalized.includes('pengaduan')
    ) {
      return r;
    }
  }
  return null;
};


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
    (row.nama && row.nama.toString().trim())
  );
};

// ==================== PERUBAHAN 3: Flexible Column Mapping ====================
// Flexible column mapper - support berbagai format Excel
const mapExcelColumns = (row) => {
  const normalizedRow = {};
  
  // Normalize all column names
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key.toLowerCase().trim()
      .replace(/\s+/g, '_')      // Spasi → underscore
      .replace(/\./g, '_')        // Titik → underscore (No.HP → no_hp)
      .replace(/[^\w]/g, '_');    // Karakter special → underscore
    normalizedRow[normalizedKey] = value;
  }

  const isChecked = (value) => {
  if (value === undefined || value === null) return false;

  const v = String(value).toLowerCase().trim();
  return (
    v === 'true' ||
    v === '1' ||
    v === '✓' ||
    v === 'ya' ||
    v === 'yes'
  );
  };


  const normalizeTextStatus = (rawStatus) => {
  if (!rawStatus) return null;

  const key = String(rawStatus)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');

  const map = {
    pending: 'Pending',
    proses: 'Diproses',
    diproses: 'Diproses',
    on_progress: 'Diproses',
    selesai: 'Selesai',
    done: 'Selesai'
  };

  return map[key] || null;
  };


  const resolveStatus = (row) => {
  let hasSelesai = false;
  let hasProses = false;

  for (const [key, value] of Object.entries(row)) {
    if (value === true) {
      if (String(key).toLowerCase().includes('selesai')) {
        hasSelesai = true;
      } else if (String(key).toLowerCase().includes('proses')) {
        hasProses = true;
      }
    }
  }

  if (hasSelesai) return 'Selesai';
  if (hasProses) return 'Diproses';

  if (row.status) {
    return normalizeTextStatus(row.status);
  }

  return 'Pending';
};


  // Mapping with multiple possible column names
  return {
    nama_lengkap: normalizedRow.nama_lengkap || normalizedRow.nama || normalizedRow.nama_pengadu || '',
    nomor_telepon: normalizedRow.nomor_telepon || normalizedRow.no_telp || 
                   normalizedRow.telepon || normalizedRow.no_hp || 
                   normalizedRow.no_telepon || '',
    nomor_berkas: normalizedRow.nomor_berkas || normalizedRow.no_berkas || 
                  normalizedRow.berkas || '',
    alamat: normalizedRow.alamat || normalizedRow.address || normalizedRow.alamat_pengadu || '',
    keperluan: normalizedRow.keperluan || normalizedRow.jenis_pengaduan || 
               normalizedRow.pengaduan || normalizedRow.masalah || normalizedRow.ringkasan_pengaduan || '',
    waktu_kedatangan: normalizedRow.waktu_kedatangan || normalizedRow.tanggal || normalizedRow.tanggal_pengaduan ||
                      normalizedRow.tanggal_datang || normalizedRow.waktu || 
                      new Date().toISOString(),
    catatan: normalizedRow.catatan || normalizedRow.keterangan || 
             normalizedRow.note || normalizedRow.notes || '',
    petugas: normalizedRow.petugas || normalizedRow.officer || 
             normalizedRow.nama_petugas || normalizedRow.petugas_penerima || '',
    status: resolveStatus(normalizedRow),
    // NEW FIELDS - Support kolom baru
    email: normalizedRow.email || normalizedRow.email_address || normalizedRow.e_mail || '',
    nik: normalizedRow.nik || normalizedRow.no_ktp || normalizedRow.nomor_ktp || ''
  };
};
// ==================== END PERUBAHAN 3 ====================

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
      query += ' AND (nama_lengkap LIKE ? OR unit_code LIKE ? OR keperluan LIKE ? OR petugas LIKE ? OR email LIKE ? OR nik LIKE ?)';
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam, searchParam, searchParam);
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

// ==================== PERUBAHAN 2: Create Manual Endpoint ====================
// Create new complaint manually
exports.create = async (req, res) => {
  try {
    const complaintData = req.body;

    // Validate required fields
    if (!complaintData.nama_lengkap) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nama lengkap wajib diisi' 
      });
    }

    // Generate unique unit code
    const unitCode = await generateUniqueUnitCode();

    // Insert to database
    const [result] = await db.query(
      `INSERT INTO complaints 
        (unit_code, nama_lengkap, nomor_telepon, nomor_berkas, alamat, 
         keperluan, waktu_kedatangan, catatan, petugas, status, email, nik)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        unitCode,
        complaintData.nama_lengkap,
        complaintData.nomor_telepon || '',
        complaintData.nomor_berkas || '',
        complaintData.alamat || '',
        complaintData.keperluan || '',
        complaintData.waktu_kedatangan || new Date().toISOString(),
        complaintData.catatan || '',
        complaintData.petugas || '',
        complaintData.status || 'Pending',
        complaintData.email || '',
        complaintData.nik || ''
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Data berhasil ditambahkan',
      data: {
        id: result.insertId,
        unit_code: unitCode
      }
    });
  } catch (error) {
    console.error('Create error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Terjadi kesalahan: ' + error.message 
    });
  }
};
// ==================== END PERUBAHAN 2 ====================

// Upload Excel file with flexible column mapping
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
    const headerRow = detectHeaderRow(sheet);

let rawData;

if (headerRow !== null) {
  // Excel PAKAI HEADER (walaupun di baris ke-3)
  rawData = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: false,
    range: headerRow
  });
} else {
  // Excel TANPA HEADER (format lama)
  rawData = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    raw: false,
    header: [
      'nama_lengkap',
      'nomor_telepon',
      'keperluan',
      'status',
      'petugas',
      'catatan'
    ]
  });
}


    console.log(`📊 Total rows from Excel: ${rawData.length}`);

    // Filter out empty rows and map columns
    const validData = [];
    
    for (const [index, row] of rawData.entries()) {
      // Check if empty
      if (isEmptyRow(row)) {
        console.log(`⏭️  Row ${index + 2} is empty, skipping...`);
        continue;
      }
      
      // Map columns flexibly
      const mappedData = mapExcelColumns(row);
      
      // Check if has essential data
      if (!hasEssentialData(mappedData)) {
        console.log(`⚠️  Row ${index + 2} lacks essential data, skipping...`);
        continue;
      }
      
      validData.push(mappedData);
    }

    console.log(`✅ Valid rows: ${validData.length}`);
    console.log(`🚫 Skipped: ${rawData.length - validData.length} empty rows`);

    let inserted = 0;
    let updated = 0;
    let errors = [];

    for (const [index, complaintData] of validData.entries()) {
      try {
        // Generate unique unit code for new entries
        let unitCode = await generateUniqueUnitCode();

        // Check if exists by name and phone (since unit_code is now random)
        const [existing] = await db.query(
          'SELECT id, unit_code FROM complaints WHERE nama_lengkap = ? AND nomor_telepon = ?',
          [complaintData.nama_lengkap, complaintData.nomor_telepon]
        );

        if (existing.length > 0) {
          // Update existing
          unitCode = existing[0].unit_code; // Keep existing unit code
          await db.query(
            `UPDATE complaints SET 
              nama_lengkap = ?, nomor_telepon = ?, nomor_berkas = ?,
              alamat = ?, keperluan = ?, waktu_kedatangan = ?, catatan = ?,
              petugas = ?, status = ?, email = ?, nik = ?, updated_at = CURRENT_TIMESTAMP
            WHERE unit_code = ?`,
            [
              complaintData.nama_lengkap, 
              complaintData.nomor_telepon, 
              complaintData.nomor_berkas,
              complaintData.alamat, 
              complaintData.keperluan, 
              complaintData.waktu_kedatangan, 
              complaintData.catatan,
              complaintData.petugas, 
              complaintData.status,
              complaintData.email,
              complaintData.nik,
              unitCode
            ]
          );
          updated++;
          console.log(`🔄 Updated: ${unitCode}`);
        } else {
          // Insert new
          await db.query(
            `INSERT INTO complaints 
              (unit_code, nama_lengkap, nomor_telepon, nomor_berkas, alamat, 
               keperluan, waktu_kedatangan, catatan, petugas, status, email, nik)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              unitCode,
              complaintData.nama_lengkap, 
              complaintData.nomor_telepon, 
              complaintData.nomor_berkas, 
              complaintData.alamat, 
              complaintData.keperluan, 
              complaintData.waktu_kedatangan, 
              complaintData.catatan, 
              complaintData.petugas, 
              complaintData.status,
              complaintData.email,
              complaintData.nik
            ]
          );
          inserted++;
          console.log(`➕ Inserted: ${unitCode}`);
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