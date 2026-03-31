# SaaS Admin Dashboard

A production-ready, full-stack SaaS admin platform built with Node.js + React.js + TypeORM.

---

## Project Structure

```
saas-node-admin/
├── backend/                        # Node.js + Express API
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js         # PostgreSQL pool + helpers
│   │   │   ├── passport.js         # JWT + Local strategies
│   │   │   └── cloudinary.js       # Cloudinary + Multer config
│   │   ├── controllers/
│   │   │   ├── authController.js   # Register, Login, JWT refresh
│   │   │   ├── userController.js   # CRUD + avatar upload
│   │   │   ├── tenantController.js # Multi-tenancy management
│   │   │   ├── paymentController.js# Bkash integration
│   │   │   ├── analyticsController.js # Stats + reports
│   │   │   └── fileController.js   # Cloudinary file management
│   │   ├── middleware/
│   │   │   ├── auth.js             # JWT authentication
│   │   │   ├── rbac.js             # Role-based access control
│   │   │   ├── rateLimiter.js      # Express rate limiter
│   │   │   ├── cache.js            # In-memory response caching
│   │   │   ├── tenantMiddleware.js # Tenant isolation
│   │   │   └── errorHandler.js     # Global error handling
│   │   ├── routes/
│   │   │   ├── auth.js             # /api/auth/*
│   │   │   ├── users.js            # /api/users/*
│   │   │   ├── tenants.js          # /api/tenants/*
│   │   │   ├── payments.js         # /api/payments/*
│   │   │   ├── analytics.js        # /api/analytics/*
│   │   │   ├── files.js            # /api/files/*
│   │   │   └── notifications.js    # /api/notifications/*
│   │   ├── services/
│   │   │   ├── socketService.js    # Socket.io real-time events
│   │   │   ├── bkashService.js     # Bkash payment gateway
│   │   │   └── emailService.js     # Nodemailer email service
│   │   ├── utils/
│   │   │   ├── logger.js           # Winston logger
│   │   │   ├── pagination.js       # Pagination helpers
│   │   │   └── validators.js       # Joi validation schemas
│   │   └── __tests__/
│   │       ├── auth.test.js        # Auth endpoint tests
│   │       └── users.test.js       # User endpoint tests
│   ├── migrations/
│   │   ├── init.sql                # Full DB schema
│   │   └── migrate.js              # Migration runner
│   ├── server.js                   # Express app entry point
│   ├── vercel.json                 # Vercel deployment config
│   ├── package.json
│   └── .env.example
│
├── frontend/                       # React.js + Vite SPA
│   ├── public/
│   │   ├── index.html
│   │   └── manifest.json           # PWA manifest
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Button.jsx      # Reusable button component
│   │   │   │   ├── Sidebar.jsx     # Collapsible navigation
│   │   │   │   ├── Navbar.jsx      # Top navigation bar
│   │   │   │   ├── Modal.jsx       # Accessible modal
│   │   │   │   └── Loader.jsx      # Spinners + skeletons
│   │   │   ├── dashboard/
│   │   │   │   ├── StatsCard.jsx   # KPI metric cards
│   │   │   │   ├── SalesChart.jsx  # Revenue trend (Line/Bar)
│   │   │   │   ├── UserActivityChart.jsx
│   │   │   │   ├── PaymentDistributionChart.jsx (Doughnut)
│   │   │   │   └── RecentTransactions.jsx
│   │   │   └── auth/
│   │   │       ├── LoginForm.jsx
│   │   │       ├── RegisterForm.jsx
│   │   │       └── ProtectedRoute.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx       # Main analytics dashboard
│   │   │   ├── Users.jsx           # User management + RBAC
│   │   │   ├── Tenants.jsx         # Multi-tenancy admin
│   │   │   ├── Payments.jsx        # Bkash payments table
│   │   │   ├── Analytics.jsx       # Advanced charts + export
│   │   │   ├── Profile.jsx         # User profile + avatar
│   │   │   ├── Settings.jsx        # App settings + theme
│   │   │   ├── Notifications.jsx   # Real-time notifications
│   │   │   └── Files.jsx           # Cloudinary file manager
│   │   ├── store/
│   │   │   ├── index.js            # Redux store
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.js    # Auth state
│   │   │   │   ├── notificationSlice.js
│   │   │   │   └── tenantSlice.js
│   │   │   └── api/
│   │   │       ├── baseApi.js      # RTK Query base
│   │   │       ├── authApi.js
│   │   │       ├── usersApi.js
│   │   │       ├── analyticsApi.js
│   │   │       └── paymentsApi.js
│   │   ├── hooks/
│   │   │   ├── useAuth.js          # Auth helpers
│   │   │   ├── useSocket.js        # Socket.io hook
│   │   │   └── useDebounce.js
│   │   ├── utils/
│   │   │   ├── axiosInstance.js    # Auto token refresh
│   │   │   ├── formatters.js       # Currency, date, etc.
│   │   │   └── constants.js
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   ├── variables.css       # CSS custom properties
│   │   │   └── animations.css
│   │   ├── App.jsx                 # Router + layout
│   │   └── main.jsx                # Entry + PWA SW
│   ├── cypress/e2e/auth.cy.js      # E2E tests
│   ├── src/test/components.test.jsx# Unit tests
│   ├── vite.config.js              # Vite + PWA config
│   ├── vercel.json
│   └── package.json
│
├── .github/workflows/
│   ├── backend-deploy.yml          # CI/CD: test → deploy backend
│   └── frontend-deploy.yml         # CI/CD: build → deploy frontend
│
└── .gitignore
```

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- pgAdmin 4

### 1. Database Setup (pgAdmin)
1. Open pgAdmin → Create a new database named `saas_admin_db`
2. Open Query Tool and run `backend/migrations/init.sql`

### 2. Backend Setup
```bash
cd backend
npm install
cp .env.example .env        # fill in DB creds
npm run migration:run       # create tables
npm run dev                 # starts on :5000, docs at /api/docs
npm test                    # integration tests (needs test DB)   
# Runs on http://localhost:5000
```


DROP TABLE IF EXISTS typeorm_migrations;

npm run typeorm -- migration:generate src/migrations/InitSchema -d src/config/data-source.cli.ts


### 3. Frontend Setup
```bash
cd frontend
cp .env.example .env
# Edit .env if needed
npm install
npm run dev        # Runs on http://localhost:5173
```

### 4. Default Login
- Email: `admin@saas.com`
- Password: `Admin@123`

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Login user |
| GET | `/api/auth/me` | JWT | Get current user |
| POST | `/api/auth/refresh` | None | Refresh access token |
| POST | `/api/auth/logout` | JWT | Logout |
| GET | `/api/users` | Manager+ | List users (paginated) |
| POST | `/api/users` | Manager+ | Create user |
| PUT | `/api/users/:id` | Manager+ | Update user |
| DELETE | `/api/users/:id` | Manager+ | Deactivate user |
| GET | `/api/tenants` | Admin | List tenants |
| POST | `/api/tenants` | Admin | Create tenant |
| GET | `/api/payments` | All | List payments |
| POST | `/api/payments` | All | Create Bkash payment |
| POST | `/api/payments/:id/refund` | Admin | Refund payment |
| GET | `/api/analytics/dashboard` | All | Dashboard stats |
| GET | `/api/analytics/sales-trend` | All | Revenue chart data |
| GET | `/api/analytics/export` | Manager+ | Export CSV |
| POST | `/api/files` | Manager+ | Upload to Cloudinary |
| GET | `/api/notifications` | All | Get notifications |

---

## Deployment (Vercel)

### Backend
1. Push `backend/` to Vercel
2. Set environment variables in Vercel dashboard (from `.env.example`)
3. Set GitHub secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_BACKEND_PROJECT_ID`

### Frontend
1. Push `frontend/` to Vercel
2. Set `VITE_API_URL` to your backend Vercel URL
3. Set GitHub secrets: `VERCEL_FRONTEND_PROJECT_ID`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express.js, PostgreSQL, Passport.js |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Real-time | Socket.io |
| Payments | Bkash Tokenized Checkout (Sandbox) |
| Storage | Cloudinary (free tier) |
| Email | Nodemailer + Gmail SMTP |
| Frontend | React 18, Vite, RTK Query |
| Charts | Chart.js + react-chartjs-2 |
| Forms | React Hook Form + Yup |
| Styling | Pure CSS (Grid/Flexbox, CSS Variables) |
| PWA | Vite PWA Plugin + Service Worker |
| Testing | Jest + Supertest (backend), Vitest + RTL (frontend), Cypress (E2E) |
| CI/CD | GitHub Actions → Vercel |
