# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 15.3.3 email campaign management system built with TypeScript, React 19, and PostgreSQL. The application allows businesses to send review request emails to customers and track engagement metrics.

## Key Commands

```bash
# Development
npm run dev        # Start development server with Turbopack

# Production
npm run build      # Build for production
npm run start      # Start production server

# Code Quality
npm run lint       # Run Next.js linter
```

## Architecture

### Tech Stack
- **Frontend**: Next.js 15.3.3 with App Router, React 19, TypeScript, Tailwind CSS v4
- **Backend**: Next.js API routes with PostgreSQL
- **Authentication**: JWT-based with bcrypt password hashing
- **Database**: PostgreSQL with connection pooling

### Directory Structure
- `/app` - Next.js App Router pages and API routes
- `/app/api` - Backend API endpoints following RESTful conventions
- `/app/components` - React components
- `/lib` - Shared utilities and database configuration
- `/public` - Static assets

### API Route Patterns
All API routes follow consistent patterns:
- Response format: `{ success: boolean, data?: any, error?: string }`
- Authentication via Bearer token in Authorization header
- Error handling with appropriate HTTP status codes

### Database Configuration
- Connection via `DATABASE_URL` environment variable
- Automatic SSL configuration for cloud providers
- Connection pooling with performance monitoring in `/lib/db.ts`

### Authentication Flow
1. Register at `/api/auth/register` (domain-restricted to ransomspares.co.uk)
2. Login at `/api/auth/login` returns JWT token
3. Protected routes require `Authorization: Bearer <token>` header
4. Token verification helper available in auth route files

### Environment Variables Required
```
DATABASE_URL=        # PostgreSQL connection string
JWT_SECRET=          # Secret for JWT signing
JWT_EXPIRES_IN=      # Token expiration (default: '7d')
```

### Key Features
1. **Email Campaign Management**: Send review requests, track opens/clicks
2. **Customer Import**: Manual entry or CSV/Excel file upload
3. **Analytics Dashboard**: Real-time statistics on email performance
4. **User Settings**: Email configuration and preferences

### Development Notes
- No formal testing framework currently implemented
- Manual testing available at `/api-test` page
- Database connection test at `/api/db-test`
- Health check endpoint at `/api/health`