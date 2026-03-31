const Joi = require('joi');

const registerSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required(),
  lastName: Joi.string().trim().min(2).max(50).required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(8).max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase, one lowercase, and one number',
    }),
  tenantName: Joi.string().trim().min(2).max(100).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const userUpdateSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).optional(),
  lastName: Joi.string().trim().min(2).max(50).optional(),
  role: Joi.string().valid('admin', 'manager', 'viewer').optional(),
  isActive: Joi.boolean().optional(),
});

const tenantSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  plan: Joi.string().valid('free', 'starter', 'pro', 'enterprise').default('free'),
  settings: Joi.object().optional(),
});

const paymentSchema = Joi.object({
  amount: Joi.number().positive().precision(2).required(),
  currency: Joi.string().default('BDT'),
  description: Joi.string().max(255).optional(),
  callbackURL: Joi.string().uri().optional(),
});

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const details = error.details.map(d => ({ field: d.path.join('.'), message: d.message }));
    return res.status(400).json({ success: false, message: 'Validation failed', errors: details });
  }
  req.body = value;
  next();
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  userUpdateSchema,
  tenantSchema,
  paymentSchema,
};
