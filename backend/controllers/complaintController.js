// backend/controllers/complaintController.js
const db = require('../config/database');
const { parseExcelFile } = require('../utils/excelParser');

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

// Upload Excel file
exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'File tidak ditemukan' 
      });
    }

    const data = await parseExcelFile(req.file.buffer);

    if (data.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'File kosong atau format tidak sesuai' 
      });
    }

    let inserted = 0;
    let updated = 0;
    let errors = [];

    for (const row of data) {
      try {
        // Generate unit code if not exists
        const unitCode = row.unit_code || `KPU${String(row.no).padStart(3, '0')}`;

        // Check if exists
        const [existing] = await db.query(
          'SELECT id FROM complaints WHERE unit_code = ?',
          [unitCode]
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
              row.no, row.nama_lengkap, row.nomor_telepon, row.nomor_berkas,
              row.alamat, row.keperluan, row.waktu_kedatangan, row.catatan,
              row.petugas, row.status || 'Pending', unitCode
            ]
          );
          updated++;
        } else {
          // Insert
          await db.query(
            `INSERT INTO complaints 
              (unit_code, no, nama_lengkap, nomor_telepon, nomor_berkas, alamat, 
               keperluan, waktu_kedatangan, catatan, petugas, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              unitCode, row.no, row.nama_lengkap, row.nomor_telepon, row.nomor_berkas,
              row.alamat, row.keperluan, row.waktu_kedatangan, row.catatan,
              row.petugas, row.status || 'Pending'
            ]
          );
          inserted++;
        }
      } catch (error) {
        errors.push({ row: row.no, error: error.message });
      }
    }

    res.json({
      success: true,
      message: 'Upload berhasil',
      summary: {
        total: data.length,
        inserted,
        updated,
        errors: errors.length
      },
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('Upload error:', error);
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