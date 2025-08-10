# MetricSoft Backend API

Next.js-based backend API server for the MetricSoft Performance Management Platform.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your database URL and other configurations.

3. Set up the database:
```bash
npm run prisma:migrate
npm run prisma:seed
```

4. Start the development server:
```bash
npm run dev
```

The API server will be running at `http://localhost:5000`

## 📋 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/passwordless` - Passwordless authentication

### Users
- `GET /api/users/profile` - Get user profile

### Health Check
- `GET /health` - Server health status

## 🏗️ Project Structure

```
backend/
├── src/
│   ├── app/api/          # Next.js API routes
│   ├── lib/              # Utility libraries
│   └── types/            # TypeScript type definitions
├── prisma/               # Database schema and seeds
├── package.json
├── next.config.js
└── tsconfig.json
```

## 🔧 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:seed` - Seed database
- `npm run db:reset` - Reset and seed database

## 🛠️ Technologies

- **Next.js 14** - Full-stack React framework
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **PostgreSQL** - Database
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **Zod** - Input validation
