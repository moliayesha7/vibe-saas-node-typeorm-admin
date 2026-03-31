const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { cloudinary } = require('../config/cloudinary');
const { AppError } = require('../middleware/errorHandler');

exports.uploadFile = async (req, res) => {
  if (!req.file) throw new AppError('No file uploaded', 400);

  const { originalname, mimetype, size, path: url, filename: publicId } = req.file;

  const result = await query(
    `INSERT INTO files (id, user_id, tenant_id, name, url, public_id, mimetype, size)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [uuidv4(), req.user.id, req.user.tenant_id, originalname, url, publicId, mimetype, size]
  );

  res.status(201).json({ success: true, data: result.rows[0] });
};

exports.getFiles = async (req, res) => {
  const tenantId = req.user.role !== 'admin' ? req.user.tenant_id : req.query.tenantId;
  const tenantFilter = tenantId ? 'WHERE tenant_id = $1' : '';
  const params = tenantId ? [tenantId] : [];

  const result = await query(
    `SELECT f.*, u.email as uploaded_by FROM files f
     JOIN users u ON u.id = f.user_id
     ${tenantFilter} ORDER BY f.created_at DESC LIMIT 50`,
    params
  );
  res.json({ success: true, data: result.rows });
};

exports.deleteFile = async (req, res) => {
  const { id } = req.params;
  const result = await query('SELECT * FROM files WHERE id = $1', [id]);
  const file = result.rows[0];
  if (!file) throw new AppError('File not found', 404);

  if (req.user.role !== 'admin' && file.user_id !== req.user.id) {
    throw new AppError('Not authorized to delete this file', 403);
  }

  // Delete from Cloudinary
  if (file.public_id) {
    await cloudinary.uploader.destroy(file.public_id).catch(() => {});
  }

  await query('DELETE FROM files WHERE id = $1', [id]);
  res.json({ success: true, message: 'File deleted successfully' });
};
