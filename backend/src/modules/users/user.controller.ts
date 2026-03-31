import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { UserQueryDto } from './dto/user.dto';
import { sendSuccess, sendCreated, sendPaginated } from '@common/utils/response.util';

const userService = new UserService();

export class UserController {
  /**
   * @swagger
   * /api/users:
   *   get:
   *     tags: [Users]
   *     summary: List users with pagination and filters
   *     parameters:
   *       - in: query
   *         name: page
   *         schema: { type: integer, default: 1 }
   *       - in: query
   *         name: limit
   *         schema: { type: integer, default: 10 }
   *       - in: query
   *         name: search
   *         schema: { type: string }
   *         description: Search by name or email
   *       - in: query
   *         name: role
   *         schema: { type: string, enum: [admin, manager, viewer] }
   *       - in: query
   *         name: isActive
   *         schema: { type: boolean }
   *       - in: query
   *         name: sortBy
   *         schema: { type: string, default: createdAt }
   *       - in: query
   *         name: sortOrder
   *         schema: { type: string, enum: [asc, desc], default: desc }
   *     responses:
   *       200:
   *         description: Paginated users list
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/UsersListResponse'
   */
  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = UserQueryDto.parse(req.query);
      const { users, pagination } = await userService.findAll(filters, req.user!);
      sendPaginated(res, users, pagination);
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/users/{id}:
   *   get:
   *     tags: [Users]
   *     summary: Get a user by ID
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: User details
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success: { type: boolean }
   *                 data:
   *                   $ref: '#/components/schemas/UserProfile'
   *       404:
   *         description: User not found
   */
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.findById(req.params.id, req.user!);
      sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/users:
   *   post:
   *     tags: [Users]
   *     summary: Create a new user
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateUserRequest'
   *     responses:
   *       201:
   *         description: User created
   *       409:
   *         description: Email already exists
   */
  async createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.create(req.body, req.user!);
      sendCreated(res, user, 'User created successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/users/{id}:
   *   put:
   *     tags: [Users]
   *     summary: Update a user
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/UpdateUserRequest'
   *     responses:
   *       200:
   *         description: User updated
   *       403:
   *         description: Access denied
   *       404:
   *         description: User not found
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.update(req.params.id, req.body, req.user!);
      sendSuccess(res, user, 'User updated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/users/{id}:
   *   delete:
   *     tags: [Users]
   *     summary: Deactivate a user (soft delete)
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: string, format: uuid }
   *     responses:
   *       200:
   *         description: User deactivated
   *       400:
   *         description: Cannot deactivate own account
   *       404:
   *         description: User not found
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await userService.softDelete(req.params.id, req.user!);
      sendSuccess(res, undefined, 'User deactivated successfully');
    } catch (err) {
      next(err);
    }
  }

  /**
   * @swagger
   * /api/users/profile:
   *   put:
   *     tags: [Users]
   *     summary: Update own profile
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               firstName: { type: string }
   *               lastName: { type: string }
   *     responses:
   *       200:
   *         description: Profile updated
   */
  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await userService.updateProfile(req.user!.id, req.body);
      sendSuccess(res, user, 'Profile updated');
    } catch (err) {
      next(err);
    }
  }
}

export const userController = new UserController();
