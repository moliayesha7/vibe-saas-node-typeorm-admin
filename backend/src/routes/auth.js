const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authRateLimiter } = require('../middleware/rateLimiter');
const { validate, registerSchema, loginSchema } = require('../utils/validators');

router.get('/', (req, res) => {
  res.json({ message: 'Auth route working' });
});

// @route   POST /api/auth/register
router.post('/register', authRateLimiter, validate(registerSchema), authController.register);

// @route   POST /api/auth/login
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);

// @route   POST /api/auth/refresh
router.post('/refresh', authController.refreshToken);

// @route   POST /api/auth/logout
router.post('/logout', authenticate, authController.logout);

// @route   GET /api/auth/me
router.get('/me', authenticate, authController.getMe);

// @route   POST /api/auth/forgot-password
router.post('/forgot-password', authRateLimiter, authController.forgotPassword);

// @route   POST /api/auth/reset-password
router.post('/reset-password', authController.resetPassword);

// @route   POST /api/auth/change-password
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;
