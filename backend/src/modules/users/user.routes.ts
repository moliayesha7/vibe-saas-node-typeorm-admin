import { Router } from 'express';
import { userController } from './user.controller';
import { authenticate } from '@common/middleware/auth.middleware';
import { requireRole, requirePermission } from '@common/middleware/rbac.middleware';
import { validate } from '@common/middleware/validate.middleware';
import { CreateUserDto, UpdateUserDto, UpdateProfileDto } from './dto/user.dto';

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management with RBAC and multi-tenancy
 */

const router = Router();
router.use(authenticate);

router.get('/', requirePermission('users:read'), userController.getUsers.bind(userController));
router.get('/:id', requirePermission('users:read'), userController.getUserById.bind(userController));
router.post('/', requirePermission('users:write'), validate(CreateUserDto), userController.createUser.bind(userController));
router.put('/profile', validate(UpdateProfileDto), userController.updateProfile.bind(userController));
router.put('/:id', requirePermission('users:write'), validate(UpdateUserDto), userController.updateUser.bind(userController));
router.delete('/:id', requireRole('admin', 'manager'), requirePermission('users:delete'), userController.deleteUser.bind(userController));

export default router;
