# My Homeo Health - Replit Configuration

## Overview

My Homeo Health is a comprehensive full-stack homeopathy clinic management system. It provides role-based access control, patient and appointment management, prescription handling, and multilingual support (English/Bengali). The project aims to streamline clinic operations and enhance patient care through modern web technologies.

## Recent Updates (August 2025)

- ✅ **Admin Management System**: Complete admin user management with CRUD operations, security controls preventing self-deletion and last admin deletion protection  
- ✅ **Prescription Templates**: Added 10 comprehensive HTML prescription templates for both doctors covering common homeopathic conditions
- ✅ **Local Setup Scripts**: Created comprehensive setup automation for Windows (setup.bat), Linux/macOS (setup.sh), quick-start (quick-start.sh), and Docker (docker-setup.sh) with full dependency management, database setup, AI configuration, and port management
- ✅ **Setup Testing**: Added test-setup.sh script for validating local deployment readiness with comprehensive system checks
- ✅ **Code Cleanup**: Removed unnecessary files - test/temp files, duplicate documentation, outdated screenshots, and backup files
- ✅ **Smart Database Management**: Enhanced setup scripts with intelligent database detection, automatic creation with secure credentials, and existing database integration support
- ✅ **Interactive Database Selection**: Setup scripts now display all existing databases with numbered options, allowing users to select from existing databases or create new ones
- ✅ **Port Configuration**: Setup scripts now ask users to configure the server port with validation and availability checking

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

The application employs a modern full-stack architecture, separating client and server components.

### Frontend Architecture
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **UI Framework**: shadcn/ui on Radix UI
- **Styling**: Tailwind CSS with custom CSS variables
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter
- **Design**: Responsive, mobile-first with PWA capabilities

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Session Management**: Express sessions with PostgreSQL store
- **Authentication**: Session-based with role-based access control (admin, doctor, patient)

### Key Architectural Components & Decisions
- **Database Layer**: PostgreSQL with Neon serverless connection, Drizzle ORM, centralized schema, and connection pooling. Supports automatic migrations and seeding.
- **Authentication System**: Secure, session-based with HTTP-only cookies and role-based access for admin, doctor, and patient roles.
- **API Structure**: RESTful design, Zod schemas for validation, and centralized error handling.
- **User Interface**: Responsive design, PWA features, modular components, and intuitive navigation.
- **Data Flow**: Client requests via TanStack Query, validated by Express middleware, processed by API routes, interacting with PostgreSQL via Drizzle ORM, returning JSON responses.
- **Core Features**:
    - **Appointment Management**: Doctor availability system with past date prevention, dynamic time slot generation, and conversational WhatsApp booking with session management and multi-language support.
    - **Medicine Management**: Comprehensive medicine management with stock tracking, low stock alerts, and bulk upload functionality (CSV, Excel, PDF) with intelligent parsing and unique code validation. Includes AI-powered medicine suggestion and discussion features.
    - **Prescription Management**: AI-powered template generation with language selection (Bengali/English), customizable clinic details, real-time preview, and comprehensive print functionality with multiple professional templates.
    - **Patient Management**: Patient CRUD operations, including secure deletion with admin control and cascading data removal.
    - **Admin Dashboard**: Dedicated admin portal with statistics, doctor/medicine/patient management (full CRUD), and role-based routing.
    - **User Profile Management**: Centralized profile management with secure updates for personal details and password changes, accessible from all portals.

### Development & Deployment Strategy
- **Environment Alignment**: Consistent behavior across development and production with centralized configuration and environment-specific settings for database connections (e.g., connection pooling) and session security.
- **Local Development**: Comprehensive setup infrastructure for VS Code and standalone environments, including automated setup scripts and Docker support for PostgreSQL.

## External Dependencies

- **@neondatabase/serverless**: PostgreSQL database connection (for cloud deployments)
- **drizzle-orm**: Type-safe SQL ORM
- **@tanstack/react-query**: Server state management
- **express-session**: Session management
- **connect-pg-simple**: PostgreSQL session store
- **@radix-ui/***: Accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library
- **class-variance-authority**: CSS variant management
- **typescript**: Type safety
- **vite**: Build tool and dev server
- **tsx**: TypeScript execution for Node.js
- **Gemini API**: For AI-powered features (template generation, medicine suggestions, medicine discussion).
- **multer**: For handling multipart file uploads.
- **csv-parser**: For CSV file parsing.
- **xlsx**: For Excel file parsing.
- **pdf-parse**: For PDF file parsing.
```