// backend/controllers/complaintController.js
const db = require("../config/database");
const XLSX = require("xlsx");

// ==================== Generator Kode Unit Acak ====================
const generateUniqueUnitCode = async () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let isUnique = false;
  let unitCode = "";

  while (!isUnique) {
    unitCode = "KPU-";
    for (let i = 0; i < 6; i++) {
      unitCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const [existing] = await db.query(
      "SELECT id FROM complaints WHERE unit_code = ?",
      [unitCode]
    );

    if (existing.length === 0) {
      isUnique = true;
    }
  }

  return unitCode;
};

// ==================== UNIVERSAL: Deteksi Header ====================
const detectHeaderRow = (sheet) => {
  const range = XLSX.utils.decode_range(sheet["!ref"]);

  for (let r = range.s.r; r <= Math.min(range.e.r, 10); r++) {
    const row = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: r,
      blankrows: false,
    })[0];

    if (!row) continue;

    const normalized = row.map((v) =>
      String(v || "")
        .toLowerCase()
        .trim()
    );

    // Cek berbagai kemungkinan header
    const hasNo = normalized.some((col) => col === "no" || col === "no.");
    const hasNameColumn = normalized.some(
      (col) =>
        col.includes("nama lengkap") ||
        col.includes("nama pengadu") ||
        col === "nama"
    );
    const hasComplaintColumn = normalized.some(
      (col) =>
        col.includes("ringkasan pengaduan") ||
        col.includes("pengaduan") ||
        col.includes("keperluan")
    );
    const hasDateColumn = normalized.some(
      (col) => col.includes("tanggal") || col.includes("waktu")
    );

    // Jika ada kombinasi kolom penting, anggap ini header
    if (
      (hasNo && hasNameColumn) ||
      (hasNameColumn && hasComplaintColumn) ||
      (hasNameColumn && hasDateColumn)
    ) {
      console.log(`✅ Header detected at row ${r + 1}`);
      console.log(`📋 Columns: ${row.join(" | ")}`);
      return r;
    }
  }

  console.log("⚠️ No header detected, will try to read as-is");
  return 0; // Default row 1
};

// Helper: Check if row is empty
const isEmptyRow = (row) => {
  if (!row) return true;
  const values = Object.values(row);
  return values.every((value) => {
    if (value === null || value === undefined) return true;
    if (typeof value === "string" && value.trim() === "") return true;
    if (typeof value === "number" && isNaN(value)) return true;
    return false;
  });
};

// ==================== UNIVERSAL: Validasi Fleksibel ====================
const hasEssentialData = (row) => {
  // 1. CEK NAMA (paling penting)
  const hasName =
    (row.nama_lengkap && String(row.nama_lengkap).trim()) ||
    (row.nama && String(row.nama).trim());

  if (!hasName) {
    return false;
  }

  // 2. NAMA HARUS LEBIH DARI 2 KARAKTER (tolak nama dummy seperti "-", "x")
  const namaLength = String(row.nama_lengkap || row.nama || "").trim().length;
  if (namaLength < 3) {
    return false;
  }

  // 3. CEK MINIMAL 1 FIELD LAIN YANG TERISI
  const hasOtherData =
    (row.nomor_telepon &&
      String(row.nomor_telepon).trim() &&
      String(row.nomor_telepon).trim() !== "-") ||
    (row.keperluan &&
      String(row.keperluan).trim() &&
      String(row.keperluan).trim().length > 5) ||
    (row.alamat &&
      String(row.alamat).trim() &&
      String(row.alamat).trim().length > 3);

  return hasName && hasOtherData;
};

// ==================== UNIVERSAL: Mapping Kolom ====================
const mapExcelColumns = (row) => {
  const normalizedRow = {};

  // Normalize semua column names
  for (const [key, value] of Object.entries(row)) {
    const normalizedKey = key
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/\./g, "_")
      .replace(/[^\w]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "");
    normalizedRow[normalizedKey] = value;
  }

  // ============ RESOLVE STATUS ============
  const resolveStatus = (row) => {
    let hasSelesai = false;
    let hasProses = false;

    // Cek kolom TRUE/1/1.0
    for (const [key, value] of Object.entries(row)) {
      // Normalize key lebih agresif
      const normalizedKey = key
        .toLowerCase()
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^\w]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");


        if (
          normalizedKey.includes("selesai") ||
          normalizedKey === "status_selesai" ||
          key.toLowerCase().trim() === "selesai"
        ) {
          hasSelesai = true;
        }
        // Cek berbagai variasi "proses"
        else if (
          normalizedKey.includes("proses") ||
          normalizedKey === "status_proses" ||
          key.toLowerCase().trim() === "proses"
        ) {
          hasProses = true;
        }
      
    }

    // Prioritas: Selesai > Proses > Pending
    if (hasSelesai) return "Selesai";
    if (hasProses) return "Proses";

    // CEK KOLOM TEXT STATUS (fallback untuk Call Center)
    if (row.status) {
      const statusText = String(row.status).toLowerCase().trim();
      const statusMap = {
        selesai: "Selesai",
        done: "Selesai",
        proses: "Proses",
        diproses: "Proses",
        on_progress: "Proses",
        pending: "Pending",
      };
      return statusMap[statusText] || "Pending";
    }

    return "Pending";
  };

  // ============ MAPPING KOLOM ============
  return {
    nama_lengkap:
      normalizedRow.nama_lengkap ||
      normalizedRow.nama_pengadu ||
      normalizedRow.nama ||
      "",

    nomor_telepon:
      normalizedRow.nomor_telepon ||
      normalizedRow.no_hp ||
      normalizedRow.nohp ||
      normalizedRow.no_telp ||
      normalizedRow.telepon ||
      "",

    nomor_berkas: normalizedRow.nomor_berkas || normalizedRow.no_berkas || "",

    alamat: normalizedRow.alamat || normalizedRow.alamat_pengadu || "",

    keperluan:
      normalizedRow.keperluan ||
      normalizedRow.ringkasan_pengaduan ||
      normalizedRow.jenis_pengaduan ||
      normalizedRow.pengaduan ||
      "",

    waktu_kedatangan:
      normalizedRow.waktu_kedatangan ||
      normalizedRow.tanggal_pengaduan ||
      normalizedRow.tanggal ||
      normalizedRow.waktu ||
      new Date().toISOString(),

    catatan: normalizedRow.catatan || normalizedRow.keterangan || "",

    petugas:
      normalizedRow.petugas ||
      normalizedRow.petugas_penerima ||
      normalizedRow.nama_petugas ||
      "",

    status: resolveStatus(normalizedRow),

    email: normalizedRow.email || normalizedRow.e_mail || "",

    nik: normalizedRow.nik || normalizedRow.no_ktp || "",
  };
};

// Get complaint by unit code (public)
exports.getByUnitCode = async (req, res) => {
  try {
    const { unitCode } = req.params;

    const [complaints] = await db.query(
      "SELECT * FROM complaints WHERE unit_code = ?",
      [unitCode]
    );

    if (complaints.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Kode unit tidak ditemukan",
      });
    }

    res.json({
      success: true,
      data: complaints[0],
    });
  } catch (error) {
    console.error("Get complaint error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan",
    });
  }
};

// Get all complaints (admin)
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "" } = req.query;
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM complaints WHERE 1=1";
    const params = [];

    if (search) {
      query +=
        " AND (nama_lengkap LIKE ? OR unit_code LIKE ? OR keperluan LIKE ? OR petugas LIKE ?)";
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    const countQuery = query.replace("SELECT *", "SELECT COUNT(*) as total");
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), parseInt(offset));

    const [complaints] = await db.query(query, params);

    res.json({
      success: true,
      data: complaints,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get all complaints error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan",
    });
  }
};

// Get statistics
exports.getStatistics = async (req, res) => {
  try {
    const [totalResult] = await db.query(
      "SELECT COUNT(*) as total FROM complaints"
    );
    const [selesaiResult] = await db.query(
      'SELECT COUNT(*) as total FROM complaints WHERE status = "Selesai"'
    );
    const [prosesResult] = await db.query(
      'SELECT COUNT(*) as total FROM complaints WHERE status = "Proses"'
    );
    const [pendingResult] = await db.query(
      'SELECT COUNT(*) as total FROM complaints WHERE status = "Pending"'
    );

    res.json({
      success: true,
      statistics: {
        total: totalResult[0].total,
        selesai: selesaiResult[0].total,
        proses: prosesResult[0].total,
        pending: pendingResult[0].total,
      },
    });
  } catch (error) {
    console.error("Get statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan",
    });
  }
};

// Create complaint
exports.create = async (req, res) => {
  try {
    const complaintData = req.body;

    if (!complaintData.nama_lengkap) {
      return res.status(400).json({
        success: false,
        message: "Nama lengkap wajib diisi",
      });
    }

    const unitCode = await generateUniqueUnitCode();

    // CEK KOLOM DATABASE
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'complaints' 
        AND TABLE_SCHEMA = DATABASE()
    `);

    const columnNames = columns.map((col) => col.COLUMN_NAME);
    const hasEmailColumn = columnNames.includes("email");
    const hasNikColumn = columnNames.includes("nik");

    // BUILD QUERY DINAMIS
    let insertQuery = `INSERT INTO complaints (unit_code, nama_lengkap, nomor_telepon, nomor_berkas, alamat, keperluan, waktu_kedatangan, catatan, petugas, status`;
    let values = [
      unitCode,
      complaintData.nama_lengkap,
      complaintData.nomor_telepon || "",
      complaintData.nomor_berkas || "",
      complaintData.alamat || "",
      complaintData.keperluan || "",
      complaintData.waktu_kedatangan || new Date().toISOString(),
      complaintData.catatan || "",
      complaintData.petugas || "",
      complaintData.status || "Pending",
    ];

    if (hasEmailColumn) {
      insertQuery += ", email";
      values.push(complaintData.email || "");
    }

    if (hasNikColumn) {
      insertQuery += ", nik";
      values.push(complaintData.nik || "");
    }

    insertQuery += `) VALUES (${values.map(() => "?").join(", ")})`;

    const [result] = await db.query(insertQuery, values);

    res.status(201).json({
      success: true,
      message: "Data berhasil ditambahkan",
      data: {
        id: result.insertId,
        unit_code: unitCode,
      },
    });
  } catch (error) {
    console.error("Create error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan: " + error.message,
    });
  }
};

// ==================== UNIVERSAL: Upload Excel ====================
exports.uploadExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File tidak ditemukan",
      });
    }

    console.log("📁 Processing file:", req.file.originalname);

    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // CEK KOLOM DATABASE
    const [columns] = await db.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'complaints' 
        AND TABLE_SCHEMA = DATABASE()
    `);

    const columnNames = columns.map((col) => col.COLUMN_NAME);
    const hasEmailColumn = columnNames.includes("email");
    const hasNikColumn = columnNames.includes("nik");

    console.log(
      `📋 DB columns - Email: ${hasEmailColumn}, NIK: ${hasNikColumn}`
    );

    // DETEKSI HEADER
    const headerRow = detectHeaderRow(sheet);
    const range = XLSX.utils.decode_range(sheet["!ref"]);

    let rawData;
    let dataStartRow;

    // BACA HEADER
    const firstHeaderRow = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      range: headerRow,
      blankrows: false,
    })[0];

    const secondHeaderRow =
      headerRow + 1 <= range.e.r
        ? XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            range: headerRow + 1,
            blankrows: false,
          })[0]
        : null;

    let hasMultiRowHeader = false;

    if (secondHeaderRow) {
      // Hitung berapa kolom di baris 2 yang isinya "Selesai" atau "Proses"
      const statusColumns = secondHeaderRow.filter((col) => {
        if (!col) return false;
        const normalized = String(col).toLowerCase().trim();
        return normalized === "selesai" || normalized === "proses";
      });

      // Hitung berapa kolom yang isinya data (angka, nama, text panjang)
      const dataColumns = secondHeaderRow.filter((col) => {
        if (!col) return false;
        const str = String(col).trim();
        // Jika angka panjang (telepon) atau text > 10 char, anggap data
        if (!isNaN(col) && str.length > 5) return true;
        if (
          str.length > 10 &&
          !str.includes("selesai") &&
          !str.includes("proses")
        )
          return true;
        return false;
      });

      // Multi-row header HANYA jika ada kolom status DAN tidak ada data
      hasMultiRowHeader = statusColumns.length > 0 && dataColumns.length === 0;

      console.log(
        `🔍 Second row analysis: statusCols=${statusColumns.length}, dataCols=${dataColumns.length}`
      );
    }

    if (hasMultiRowHeader) {
      // ============ FORMAT PENGADUAN (Multi-row header) ============
      console.log("📊 Detected: REKAP PENGADUAN format (multi-row header)");

      // helper: baca nilai cell by row/col (null jika kosong)
      const readCell = (sheet, r, c) => {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = sheet[addr];
        return cell ? cell.v : null;
      };

      // helper: jika parent header di-merge, cari value dari merge start
      const getTopCellValueAt = (sheet, headerRowIndex, colIndex) => {
        const v = readCell(sheet, headerRowIndex, colIndex);
        if (v !== null && v !== undefined && String(v).trim() !== "")
          return String(v).trim();

        const merges = sheet["!merges"] || [];
        for (const m of merges) {
          // jika headerRowIndex adalah baris start dari merged range dan colIndex termasuk range merge
          if (
            m.s.r === headerRowIndex &&
            m.s.c <= colIndex &&
            colIndex <= m.e.c
          ) {
            const startVal = readCell(sheet, m.s.r, m.s.c);
            if (
              startVal !== null &&
              startVal !== undefined &&
              String(startVal).trim() !== ""
            ) {
              return String(startVal).trim();
            }
          }
          // jika merged range melingkupi headerRowIndex tapi start row lebih kecil (s.r < headerRowIndex),
          // coba ambil nilai dari cell paling atas di kolom ini
          if (
            m.s.r <= headerRowIndex &&
            headerRowIndex <= m.e.r &&
            m.s.c <= colIndex &&
            colIndex <= m.e.c
          ) {
            const topVal = readCell(sheet, m.s.r, m.s.c);
            if (
              topVal !== null &&
              topVal !== undefined &&
              String(topVal).trim() !== ""
            ) {
              return String(topVal).trim();
            }
          }
        }
        return "";
      };

      // build arrays of header cells by column index (complete range)
      const rangeCols = [];
      for (let c = range.s.c; c <= range.e.c; c++) rangeCols.push(c);

      const topRowIdx = headerRow;
      const secondRowIdx = headerRow + 1;

      // collect second row raw values (no merge logic needed, child header usually not merged)
      const secondRowCells = [];
      for (const c of rangeCols) {
        const v = readCell(sheet, secondRowIdx, c);
        secondRowCells.push(
          v !== null && v !== undefined ? String(v).trim() : ""
        );
      }

      const mergedHeader = [];
      for (let i = 0; i < rangeCols.length; i++) {
        const colIndex = rangeCols[i];
        const parentRaw = getTopCellValueAt(sheet, topRowIdx, colIndex) || "";
        const childRaw = secondRowCells[i] || "";

        const parent = String(parentRaw).trim();
        const child = String(childRaw).trim();

        // special-case: jika parent mengandung "status" dan ada child seperti "Selesai"/"Proses"
        if (parent.toLowerCase().includes("status") && child) {
          mergedHeader.push(`Status ${child}`);
          continue;
        }

        // jika parent kosong tapi child ada -> gunakan child
        if ((!parent || parent === "") && child) {
          mergedHeader.push(child);
          continue;
        }

        // jika parent ada -> gunakan parent
        if (parent && parent !== "") {
          mergedHeader.push(parent);
          continue;
        }

        // fallback
        mergedHeader.push(`Column_${i}`);
      }

      console.log(
        "📋 Robust Merged header:",
        mergedHeader.slice(0, 30).join(" | ")
      );

      // detect status-related columns for debug
      const statusCols = mergedHeader.filter((h) => {
        if (!h) return false;
        const s = h.toLowerCase();
        return (
          s.includes("status") || s.includes("selesai") || s.includes("proses")
        );
      });
      console.log(
        "🔍 Status columns detected (after robust merge):",
        statusCols
      );

      dataStartRow = headerRow + 2;

      rawData = XLSX.utils.sheet_to_json(sheet, {
        defval: null,
        raw: false,
        header: mergedHeader,
        range: dataStartRow,
      });
    }else {
    // ============ FORMAT NORMAL (SINGLE HEADER) ============
      console.log("📊 Detected: NORMAL format (single-row header)");

        rawData = XLSX.utils.sheet_to_json(sheet, {
        defval: null,
        raw: false,
        range: headerRow
      });
    }

    console.log(`📊 Total rows: ${rawData.length}`);

    if (rawData.length > 0) {
      console.log(
        "🔍 First row keys:",
        Object.keys(rawData[0]).slice(0, 8).join(", ") + "..."
      );
    }

    // ============ TRACKING DETAIL UNTUK DEBUG ============
    let rowsProcessed = 0;
    let rowsEmpty = 0;
    let rowsInvalid = 0;
    let rowsValid = 0;

    // FILTER & MAP
    const validData = [];
    const skippedDetails = [];

    for (const [index, row] of rawData.entries()) {
      rowsProcessed++;

      // Hitung row number yang akurat
      const actualRowNumber = dataStartRow + index + 1;

      if (isEmptyRow(row)) {
        rowsEmpty++;
        skippedDetails.push({
          row: actualRowNumber,
          reason: "Empty row",
          debug: "All values null/empty",
        });
        continue;
      }

      const mappedData = mapExcelColumns(row);

      if (index < 2) {
        console.log(`🔍 Row ${actualRowNumber}:`, {
          nama: mappedData.nama_lengkap,
          telp: mappedData.nomor_telepon,
          status: mappedData.status,
        });

        // DEBUG: Print raw row untuk lihat kolom asli
        const statusRelatedKeys = Object.keys(row).filter(
          (k) =>
            k.toLowerCase().includes("status") ||
            k.toLowerCase().includes("selesai") ||
            k.toLowerCase().includes("proses")
        );
        console.log(
          `   📋 Status-related columns:`,
          statusRelatedKeys.map((k) => `"${k}": ${row[k]}`).join(", ")
        );
      }

      // Debug log untuk status Proses (first 5 rows with Proses status)
      if (index < 100 && mappedData.status === "Proses") {
        console.log(
          `✅ PROSES detected at row ${actualRowNumber}: ${mappedData.nama_lengkap}`
        );
      }

      if (!hasEssentialData(mappedData)) {
        rowsInvalid++;
        skippedDetails.push({
          row: actualRowNumber,
          reason: "Missing essential data",
          data: {
            nama: mappedData.nama_lengkap,
            telp: mappedData.nomor_telepon,
            keperluan: mappedData.keperluan,
          },
        });
        continue;
      }

      rowsValid++;
      validData.push(mappedData);
    }

    console.log(`\n📊 PROCESSING SUMMARY:`);
    console.log(`   Total processed: ${rowsProcessed}`);
    console.log(`   Empty rows: ${rowsEmpty}`);
    console.log(`   Invalid rows: ${rowsInvalid}`);
    console.log(`   Valid rows: ${rowsValid}`);
    console.log(
      `   Expected in DB: ${rowsValid} (excluding duplicates within file)\n`
    );

    // INSERT/UPDATE
    let inserted = 0;
    let updated = 0;
    let errors = [];
    let skippedDuplicates = 0;

    // ============ TRACKING DUPLIKASI DALAM BATCH ============
    const processedInBatch = new Set(); // Track nama+telepon+tanggal yang sudah diproses

    for (const [index, complaintData] of validData.entries()) {
      try {
        // ============ NORMALISASI DATA UNTUK DETEKSI DUPLIKAT ============
        // Normalize nama (trim, lowercase, remove multiple spaces)
        const normalizedName = String(complaintData.nama_lengkap || "")
          .trim()
          .toLowerCase()
          .replace(/\s+/g, " ");

        // Normalize telepon (hapus spasi, dash, slash)
        const normalizedPhone = String(complaintData.nomor_telepon || "")
          .replace(/[\s\-\/]/g, "") // Hapus spasi, dash, slash
          .replace(/^0/, "") // Hapus leading 0
          .slice(0, 10); // Ambil 10 digit pertama

        // Normalize tanggal
        let normalizedDate = complaintData.waktu_kedatangan;
        try {
          const date = new Date(complaintData.waktu_kedatangan);
          if (!isNaN(date.getTime())) {
            normalizedDate = date.toISOString().split("T")[0]; // YYYY-MM-DD
          }
        } catch (e) {
          normalizedDate = null;
        }

        // 1. CEK DUPLIKASI DALAM BATCH (file yang sama)
        const batchKey = `${complaintData.nama_lengkap.trim()}|${
          complaintData.nomor_telepon
        }|${normalizedDate}`;

        if (processedInBatch.has(batchKey)) {
          skippedDuplicates++;
          if (index < 10) {
            console.log(
              `⏭️  Skip duplicate in batch: ${complaintData.nama_lengkap}`
            );
          }
          continue;
        }

        processedInBatch.add(batchKey);

        // 2. NORMALIZE TELEPON (hapus spasi, dash, slash)
        const cleanTelepon = String(complaintData.nomor_telepon || "")
          .replace(/[\s\-\/]/g, "") // Hapus spasi, dash, slash
          .replace(/^0+/, ""); // Hapus leading zero

        // 3. CEK DUPLIKASI DI DATABASE dengan normalisasi
        let existing = [];

        // Query 1: Deteksi dengan nama + telepon + tanggal
        [existing] = await db.query(
          `SELECT id, unit_code, nomor_telepon FROM complaints 
           WHERE LOWER(TRIM(nama_lengkap)) = LOWER(TRIM(?))
           AND DATE(waktu_kedatangan) = DATE(?)
           AND (
             (nomor_telepon != '' AND nomor_telepon IS NOT NULL 
              AND REPLACE(REPLACE(REPLACE(nomor_telepon, ' ', ''), '-', ''), '/', '') 
                = REPLACE(REPLACE(REPLACE(?, ' ', ''), '-', ''), '/', ''))
             OR (nomor_telepon = '' OR nomor_telepon IS NULL) AND (? = '' OR ? IS NULL)
           )
           LIMIT 1`,
          [
            complaintData.nama_lengkap.trim(),
            complaintData.waktu_kedatangan,
            complaintData.nomor_telepon || "",
            complaintData.nomor_telepon || "",
            complaintData.nomor_telepon || "",
          ]
        );

        // Query 2: Fallback - jika telepon kosong, cek dengan nama + tanggal + keperluan
        if (
          existing.length === 0 &&
          (!complaintData.nomor_telepon ||
            complaintData.nomor_telepon.trim() === "")
        ) {
          [existing] = await db.query(
            `SELECT id, unit_code FROM complaints 
             WHERE LOWER(TRIM(nama_lengkap)) = LOWER(TRIM(?))
             AND DATE(waktu_kedatangan) = DATE(?)
             AND LOWER(SUBSTRING(keperluan, 1, 50)) = LOWER(SUBSTRING(?, 1, 50))
             LIMIT 1`,
            [
              complaintData.nama_lengkap.trim(),
              complaintData.waktu_kedatangan,
              complaintData.keperluan || "",
            ]
          );
        }

        let unitCode;

        if (existing.length > 0) {
          // UPDATE - data yang sama sudah ada
          unitCode = existing[0].unit_code;

          let updateQuery = `UPDATE complaints SET 
            nama_lengkap = ?, nomor_telepon = ?, nomor_berkas = ?,
            alamat = ?, keperluan = ?, waktu_kedatangan = ?, catatan = ?,
            petugas = ?, status = ?`;

          let updateValues = [
            complaintData.nama_lengkap,
            complaintData.nomor_telepon,
            complaintData.nomor_berkas,
            complaintData.alamat,
            complaintData.keperluan,
            complaintData.waktu_kedatangan,
            complaintData.catatan,
            complaintData.petugas,
            complaintData.status,
          ];

          if (hasEmailColumn) {
            updateQuery += ", email = ?";
            updateValues.push(complaintData.email);
          }

          if (hasNikColumn) {
            updateQuery += ", nik = ?";
            updateValues.push(complaintData.nik);
          }

          updateQuery += ", updated_at = CURRENT_TIMESTAMP WHERE unit_code = ?";
          updateValues.push(unitCode);

          await db.query(updateQuery, updateValues);
          updated++;
        } else {
          // INSERT - data baru
          unitCode = await generateUniqueUnitCode();

          // INSERT
          let insertQuery = `INSERT INTO complaints 
            (unit_code, nama_lengkap, nomor_telepon, nomor_berkas, alamat, 
             keperluan, waktu_kedatangan, catatan, petugas, status`;

          let insertValues = [
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
          ];

          if (hasEmailColumn) {
            insertQuery += ", email";
            insertValues.push(complaintData.email);
          }

          if (hasNikColumn) {
            insertQuery += ", nik";
            insertValues.push(complaintData.nik);
          }

          insertQuery += `) VALUES (${insertValues.map(() => "?").join(", ")})`;

          await db.query(insertQuery, insertValues);
          inserted++;
        }
      } catch (error) {
        console.error(`❌ Error row ${index}:`, error.message);
        errors.push({
          row: index + dataStartRow + 1,
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: "Upload berhasil",
      summary: {
        total: rawData.length,
        validRows: validData.length,
        emptyRowsSkipped: rowsEmpty,
        invalidRowsSkipped: rowsInvalid,
        duplicatesInBatch: skippedDuplicates,
        inserted,
        updated,
        errors: errors.length,
      },
      details: {
        processed: rowsProcessed,
        actualDataRows: rowsValid,
        finalInserted: inserted,
        finalUpdated: updated,
      },
      errorDetails: errors.length > 0 ? errors.slice(0, 10) : undefined,
      skippedDetails:
        skippedDetails.length > 0 ? skippedDetails.slice(0, 10) : undefined,
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan saat upload: " + error.message,
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

    for (const [key, value] of Object.entries(updateData)) {
      if (key !== "id" && key !== "unit_code") {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Tidak ada data yang diupdate",
      });
    }

    values.push(id);

    await db.query(
      `UPDATE complaints SET ${fields.join(
        ", "
      )}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.json({
      success: true,
      message: "Data berhasil diupdate",
    });
  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan",
    });
  }
};

// Delete complaint
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM complaints WHERE id = ?", [id]);

    res.json({
      success: true,
      message: "Data berhasil dihapus",
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({
      success: false,
      message: "Terjadi kesalahan",
    });
  }
};
