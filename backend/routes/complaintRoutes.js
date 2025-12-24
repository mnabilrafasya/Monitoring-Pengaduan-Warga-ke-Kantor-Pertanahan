// backend/routes/complaintRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const complaintController = require('../controllers/complaintController');
const authMiddleware = require('../middleware/authMiddleware');

// Configure multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipe file tidak didukung. Gunakan .xlsx, .xls, atau .csv'));
    }
  }
});

// Public route - check complaint by unit code
router.get('/check/:unitCode', complaintController.getByUnitCode);

// Protected routes - require authentication
router.get('/', authMiddleware, complaintController.getAll);
router.get('/statistics', authMiddleware, complaintController.getStatistics);
router.post('/upload', authMiddleware, upload.single('file'), complaintController.uploadExcel);
router.put('/:id', authMiddleware, complaintController.update);
router.delete('/:id', authMiddleware, complaintController.delete);

module.exports = router;