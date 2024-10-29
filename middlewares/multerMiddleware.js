const multer = require("multer");
const path = require("path");
require('dotenv').config()
// Set storage options for Multer
const storage = multer.memoryStorage(); // Store files in memory

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
  fileFilter: (req, file, cb) => {
    // Accept specific file types
    const filetypes = /csv|html|pdf|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb("Error: File type not supported!");
  },
});

// Export the upload middleware for specific fields
module.exports = {
  upload,
};
