# EV Charging Station Financial Analysis Platform

## Overview

This is a full-stack web application designed for analyzing the financial viability of electric vehicle (EV) charging station projects. The platform enables users to create project proposals, perform Discounted Cash Flow (DCF) analysis with key metrics like NPV, IRR, and Levelized Cost of Charging (LCOC), and manage project documentation including Statement of Work (SOW) documents.

The application targets commercial EV charging infrastructure development, focusing on DC fast charging stations for fleet vehicles and commercial applications.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript running on Vite for fast development and hot module replacement
- **UI Library**: shadcn/ui components built on Radix UI primitives for accessible, customizable interfaces
- **Styling**: Tailwind CSS with custom design tokens and CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Charts**: Chart.js with react-chartjs-2 for financial data visualization
- **Forms**: React Hook Form with Zod validation for type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ESM modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **File Processing**: Multer for handling document uploads with in-memory storage
- **API Design**: RESTful endpoints with structured error handling and request logging

### Database Schema
- **Projects Table**: Stores project details, financial inputs, and calculated metrics (NPV, IRR, LCOC)
- **SOW Documents Table**: Manages uploaded Statement of Work documents with expense extraction
- **Relationships**: Foreign key relationship between SOW documents and projects for project-specific documentation

### Financial Calculations Engine
- **DCF Model**: Custom implementation using mathjs for complex financial calculations
- **Key Metrics**: 
  - Net Present Value (NPV) calculation with configurable discount rates
  - Internal Rate of Return (IRR) using iterative solving
  - Levelized Cost of Charging (LCOC) for pricing analysis
- **Revenue Modeling**: Includes LCFS credits, state rebates, and charging revenue projections
- **Cash Flow Projections**: 10-year financial modeling with utilization ramp-up assumptions

### Development Workflow
- **Build System**: Vite for frontend bundling, esbuild for backend compilation
- **Development**: Hot reload with Vite dev server and tsx for TypeScript execution
- **Database Migrations**: Drizzle Kit for schema management and database pushes
- **Code Organization**: Monorepo structure with shared types between frontend and backend

## External Dependencies

### Database Services
- **Neon Database**: Serverless PostgreSQL database with connection pooling
- **Connection Management**: WebSocket-based connections for serverless environments

### UI Component Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Type-safe component variant management

### Development and Build Tools
- **Replit Integration**: Vite plugins for Replit development environment
- **TypeScript**: Full type safety across frontend, backend, and shared schemas
- **PostCSS**: CSS processing with Tailwind and autoprefixer

### File Processing
- **Document Parsing**: Infrastructure for PDF and Excel document parsing (currently using mock data)
- **File Upload**: Multer middleware with size limits and memory storage

### Fonts and Assets
- **Google Fonts**: Custom font loading for DM Sans, Fira Code, Geist Mono, and Architects Daughter
- **Font Optimization**: Preconnect optimization for faster font loading