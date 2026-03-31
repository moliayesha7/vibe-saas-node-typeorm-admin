const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const { requireRole, requirePermission } = require('../middleware/rbac');
const { cacheMiddleware } = require('../middleware/cache');
const { upload } = require('../config/cloudinary');

// All routes require authentication
router.use(authenticate);

// @route   GET /api/users
router.get('/', requirePermission('users:read'), cacheMiddleware(60, 'users'), userController.getUsers);

// @route   GET /api/users/profile
router.get('/profile', userController.getMe || ((req, res) => res.json({ success: true, data: req.user })));

// @route   GET /api/users/:id
router.get('/:id', requirePermission('users:read'), userController.getUserById);

// @route   POST /api/users
router.post('/', requirePermission('users:write'), userController.createUser);

// @route   PUT /api/users/profile
router.put('/profile', userController.updateProfile);

// @route   POST /api/users/avatar
router.post('/avatar', upload.single('avatar'), userController.updateAvatar);

// @route   PUT /api/users/:id
router.put('/:id', requirePermission('users:write'), userController.updateUser);

// @route   DELETE /api/users/:id
router.delete('/:id', requireRole('admin', 'manager'), requirePermission('users:delete'), userController.deleteUser);

module.exports = router;
