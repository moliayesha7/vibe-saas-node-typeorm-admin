import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SaaS Admin API',
      version: '2.0.0',
      description:
        'Enterprise SaaS Admin Backend — TypeORM, JWT, Multi-tenancy, Bkash Payments',
      contact: {
        name: 'SaaS Admin Team',
        email: 'admin@saas.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url:
          process.env.NODE_ENV === 'production'
            ? process.env.API_URL || 'https://your-api.vercel.app'
            : `http://localhost:${process.env.PORT || 5000}`,
        description:
          process.env.NODE_ENV === 'production'
            ? 'Production Server'
            : 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT access token',
        },
      },
      schemas: {
        // ─── Common ─────────────────────────────────────────────
        PaginationMeta: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 100 },
            page: { type: 'integer', example: 1 },
            limit: { type: 'integer', example: 10 },
            totalPages: { type: 'integer', example: 10 },
            hasNextPage: { type: 'boolean', example: true },
            hasPrevPage: { type: 'boolean', example: false },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string', example: 'Error description' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        // ─── Auth ────────────────────────────────────────────────
        RegisterRequest: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'password'],
          properties: {
            firstName: { type: 'string', minLength: 2, example: 'John' },
            lastName: { type: 'string', minLength: 2, example: 'Doe' },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@company.com',
            },
            password: {
              type: 'string',
              minLength: 8,
              example: 'Secure@123',
              description:
                'Min 8 chars, must include uppercase, lowercase and number',
            },
            tenantName: {
              type: 'string',
              example: 'Acme Corp',
              description: 'Optional: creates a new tenant and makes you admin',
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@saas.com',
            },
            password: { type: 'string', example: 'Admin@123' },
          },
        },
        AuthResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Login successful' },
            data: {
              type: 'object',
              properties: {
                user: { $ref: '#/components/schemas/UserProfile' },
                accessToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiJ9...',
                },
                refreshToken: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiJ9...',
                },
              },
            },
          },
        },
        // ─── User ────────────────────────────────────────────────
        UserProfile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: 'a1b2c3d4-e5f6-...',
            },
            firstName: { type: 'string', example: 'John' },
            lastName: { type: 'string', example: 'Doe' },
            email: { type: 'string', example: 'john@example.com' },
            role: {
              type: 'string',
              enum: ['admin', 'manager', 'viewer'],
              example: 'admin',
            },
            isActive: { type: 'boolean', example: true },
            avatarUrl: {
              type: 'string',
              nullable: true,
              example: 'https://res.cloudinary.com/...',
            },
            tenantId: { type: 'string', format: 'uuid' },
            tenantName: { type: 'string', example: 'Acme Corp' },
            tenantPlan: { type: 'string', example: 'pro' },
            lastLogin: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateUserRequest: {
          type: 'object',
          required: ['firstName', 'lastName', 'email', 'password'],
          properties: {
            firstName: { type: 'string', example: 'Jane' },
            lastName: { type: 'string', example: 'Smith' },
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            password: { type: 'string', minLength: 8, example: 'Pass@1234' },
            role: {
              type: 'string',
              enum: ['admin', 'manager', 'viewer'],
              default: 'viewer',
            },
            tenantId: { type: 'string', format: 'uuid' },
          },
        },
        UpdateUserRequest: {
          type: 'object',
          properties: {
            firstName: { type: 'string', example: 'Jane' },
            lastName: { type: 'string', example: 'Smith' },
            role: { type: 'string', enum: ['admin', 'manager', 'viewer'] },
            isActive: { type: 'boolean' },
          },
        },
        UsersListResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'array',
              items: { $ref: '#/components/schemas/UserProfile' },
            },
            pagination: { $ref: '#/components/schemas/PaginationMeta' },
          },
        },
        // ─── Tenant ──────────────────────────────────────────────
        Tenant: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Acme Corp' },
            slug: { type: 'string', example: 'acme-corp-a1b2c3d4' },
            plan: {
              type: 'string',
              enum: ['free', 'starter', 'pro', 'enterprise'],
            },
            isActive: { type: 'boolean', example: true },
            settings: { type: 'object' },
            userCount: { type: 'integer', example: 5 },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreateTenantRequest: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', example: 'New Company Ltd' },
            plan: {
              type: 'string',
              enum: ['free', 'starter', 'pro', 'enterprise'],
              default: 'free',
            },
            settings: { type: 'object' },
          },
        },
        // ─── Payment ─────────────────────────────────────────────
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            amount: { type: 'number', example: 500.0 },
            currency: { type: 'string', example: 'BDT' },
            status: {
              type: 'string',
              enum: ['pending', 'completed', 'failed', 'refunded', 'cancelled'],
            },
            orderId: { type: 'string', example: 'ORDER-A1B2C3D4' },
            transactionId: { type: 'string', example: 'TRX123456789' },
            description: { type: 'string' },
            userEmail: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        CreatePaymentRequest: {
          type: 'object',
          required: ['amount'],
          properties: {
            amount: { type: 'number', minimum: 1, example: 500 },
            currency: { type: 'string', default: 'BDT' },
            description: { type: 'string', example: 'Pro plan subscription' },
          },
        },
        // ─── Notification ────────────────────────────────────────
        Notification: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            title: { type: 'string', example: 'Payment Received' },
            message: { type: 'string', example: 'Your payment was successful' },
            type: {
              type: 'string',
              enum: ['info', 'success', 'warning', 'error'],
            },
            isRead: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & authorization' },
      { name: 'Users', description: 'User management (CRUD + RBAC)' },
      { name: 'Tenants', description: 'Multi-tenancy management' },
      { name: 'Payments', description: 'Bkash payment processing' },
      { name: 'Notifications', description: 'Real-time notifications' },
      { name: 'Analytics', description: 'Dashboard & reporting' },
      { name: 'Health', description: 'System health checks' },
    ],
  },
  apis: ['./src/modules/**/*.routes.ts', './src/modules/**/*.controller.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

export const setupSwagger = (app: Express): void => {
  // Serve Swagger UI
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: `
        .swagger-ui .topbar { background: #0f172a; }
        .swagger-ui .topbar-wrapper img { display: none; }
        .swagger-ui .topbar-wrapper::after { content: 'SaaS Admin API'; color: #6366f1; font-size: 1.2rem; font-weight: 700; }
      `,
      customSiteTitle: 'SaaS Admin API Docs',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        docExpansion: 'list',
        filter: true,
      },
    })
  );

  // Serve raw JSON spec
  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
};
