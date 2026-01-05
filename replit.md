# Matn Tahlili (Text Analysis)

## Overview

This is an Uzbek language text analysis and correction application. Users can upload documents (DOCX, TXT, PDF) and the system uses OpenAI to identify and correct spelling and grammatical errors. Results are displayed in a side-by-side diff view showing original text alongside corrections.

The application follows a full-stack TypeScript architecture with React frontend, Express backend, and PostgreSQL database.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Animations**: Framer Motion for smooth UI transitions
- **Build Tool**: Vite with HMR support

The frontend uses a component-based architecture with:
- Pages in `client/src/pages/`
- Reusable components in `client/src/components/`
- Custom hooks in `client/src/hooks/`
- shadcn/ui primitives in `client/src/components/ui/`

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with tsx for development
- **File Processing**: Multer for file uploads, pdf-parse for PDF extraction, mammoth for DOCX
- **AI Integration**: OpenAI API via Replit AI Integrations for text correction
- **Build**: esbuild for production bundling

Key backend patterns:
- Routes defined in `server/routes.ts`
- Database operations abstracted through storage layer in `server/storage.ts`
- Shared types and schemas in `shared/` directory
- API routes follow REST conventions at `/api/*`

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` using Drizzle's table definitions
- **Validation**: Zod schemas generated from Drizzle schemas via drizzle-zod
- **Migrations**: Managed via `drizzle-kit push`

Main data model:
- `analyses` table stores original file name, original content, corrected content, and creation timestamp

### API Design
- Centralized route definitions in `shared/routes.ts`
- Type-safe API contracts using Zod for request/response validation
- Helper function `buildUrl()` for constructing parameterized URLs

## External Dependencies

### AI Services
- **OpenAI API**: Used for text correction, accessed via Replit AI Integrations
  - Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`
  - Also includes image generation capabilities in `server/replit_integrations/image/`

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: Session storage for Express (available but sessions not actively used in current flow)

### Document Processing
- **pdf-parse**: Extract text from PDF files
- **mammoth**: Convert DOCX files to text
- **diff**: Calculate text differences for side-by-side comparison view

### UI Components
- **Radix UI**: Headless UI primitives (dialogs, dropdowns, toasts, etc.)
- **Lucide React**: Icon library
- **class-variance-authority**: Component variant management