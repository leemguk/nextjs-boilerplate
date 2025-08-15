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
SENDGRID_API_KEY=    # SendGrid API key for email sending
```

### Key Features
1. **Email Campaign Management**: Send review requests, track opens/clicks
2. **Customer Import**: Manual entry or CSV/Excel file upload (NOT YET IMPLEMENTED)
3. **Analytics Dashboard**: Real-time statistics on email performance
4. **User Settings**: Email configuration and preferences

### File Upload System (From Replit Reference)
- **File Types**: CSV, Excel (.xlsx/.xls), TSV files
- **File Processing**: Uses XLSX library for Excel files, CSV parsing
- **Validation**: 10MB file size limit, MIME type validation
- **Business Logic**: Complex order validation with same-day despatch rules
- **Name Formatting**: Proper capitalization with special cases (Mc/Mac/O' prefixes)
- **Column Detection**: Auto-detects customer data columns in uploads
- **Order Rules**: 
  - Before 3pm: must despatch same day
  - After 3pm: can despatch same day or next working day
  - Weekend orders: must despatch by Monday 3pm

### Email System Architecture
- **SendGrid Integration**: Emails sent via SendGrid API with tracking enabled
- **Webhook Processing**: Real-time email event processing at `/api/webhook/sendgrid`
- **Database Updates**: Email status tracked (sent, delivered, opened, clicked, bounced)
- **Template System**: Personalized email templates with customer name replacement
- **Security**: Vercel deployment protection with automation bypass for webhooks

### Webhook Configuration
- **URL**: `https://nextjs-boilerplate-git-staging-ransom-spares.vercel.app/api/webhook/sendgrid?x-VERCEL_AUTOMATION_BYPASS_SECRET=[SECRET]`
- **Events Tracked**: delivered, opened, clicked, bounced, spam, dropped
- **Matching Logic**: Uses SendGrid message ID with fallback to email address
- **Error Handling**: Graceful handling of unmatched emails (e-commerce vs review emails)

### Development Notes
- No formal testing framework currently implemented
- Manual testing available at `/api-test` page
- Database connection test at `/api/db-test`
- Health check endpoint at `/api/health`
- **TODO Management**: See `TODO.md` for current tasks and project roadmap
- **Replit Reference**: `Replit_Backend_Code_Reference_Only.md` contains the complete working backend code from the live version, including the file upload system that needs to be implemented