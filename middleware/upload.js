const multer = require('multer');

const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
  if (!ok) return cb(new Error('Only .xlsx / .xls / .csv allowed'), false);
  cb(null, true);
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter,
});

module.exports = upload;