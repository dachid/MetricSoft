# MetricSoft Frontend

Next.js-based frontend application for the MetricSoft Performance Management Platform.

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- MetricSoft Backend API running

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Create .env.local file
NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be running at `http://localhost:3000`

## 🎨 Features

### Authentication
- **Traditional Login/Signup** - Email and password authentication
- **Passwordless Login** - Email-based verification codes
- **Beautiful Split-Screen Design** - Modern login interface
- **Animated SVG Infographics** - Performance management visualizations

### Dashboard
- **User Profile Management** - View and manage user information
- **Role-based Access** - Different permissions based on user roles
- **Multi-tenant Support** - Organization-level data isolation

### UI/UX
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Modern Animations** - Smooth transitions and interactions
- **Glassmorphism Effects** - Beautiful frosted glass styling
- **Performance Focused** - Optimized loading and interactions

## 🏗️ Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utilities and API client
│   └── types/            # TypeScript type definitions
├── package.json
├── next.config.js
└── tsconfig.json
```

## 🔧 Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks

## 🛠️ Technologies

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **React Query** - Data fetching and caching
- **Axios** - HTTP client
- **Tailwind CSS** - Utility-first CSS framework

## 🌐 API Integration

The frontend communicates with the backend API through:

- **Axios HTTP Client** - Configured with interceptors
- **Automatic Token Management** - JWT tokens handled automatically
- **Error Handling** - Global error responses and redirects
- **Type-Safe API** - Full TypeScript support for API calls

## 📱 Responsive Design

- **Desktop** - Full split-screen experience with infographics
- **Tablet** - Stacked layout with smaller infographics  
- **Mobile** - Authentication-focused with hidden infographics
