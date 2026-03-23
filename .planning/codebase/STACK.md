# Technology Stack

**Analysis Date:** 2026-03-22

## Languages

**Primary:**
- TypeScript 5.7.3 - Full codebase with strict type checking

**Runtime:**
- Node.js (ESM/CommonJS compatible) - Backend server runtime

## Runtime

**Environment:**
- Node.js with ES2023 target compilation
- Module resolution: `nodenext` with ESM interoperability

**Package Manager:**
- npm (Node Package Manager)
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- NestJS 11.0.1 - Progressive Node.js framework for building server-side applications
  - `@nestjs/common` 11.0.1 - Core framework utilities
  - `@nestjs/core` 11.0.1 - Core DI container and decorators
  - `@nestjs/platform-express` 11.0.1 - Express adapter for HTTP handling
  - `@nestjs/cli` 11.0.0 - Development CLI with schematics

**Authentication:**
- Passport.js 0.7.0 - Authentication middleware
  - `@nestjs/passport` 11.0.5 - NestJS Passport integration
  - `passport-jwt` 4.0.1 - JWT strategy for token-based auth
  - `passport-google-oauth20` 2.0.0 - Google OAuth 2.0 strategy
  - `@nestjs/jwt` 11.0.2 - JWT token generation and verification

**Database:**
- TypeORM 0.3.28 - ORM for database operations
  - `@nestjs/typeorm` 11.0.0 - NestJS TypeORM integration
  - `pg` 8.20.0 - PostgreSQL client driver

**Configuration:**
- `@nestjs/config` 4.0.3 - Environment configuration management
- `dotenv` 17.3.1 - Environment variable loading

**Testing:**
- Jest 30.0.0 - Testing framework
  - `ts-jest` 29.2.5 - TypeScript transformer for Jest
  - `@nestjs/testing` 11.0.1 - NestJS testing utilities
  - Supertest 7.0.0 - HTTP assertion library for API testing
  - `@types/jest` 30.0.0 - TypeScript types for Jest

**Build/Dev:**
- TypeScript 5.7.3 - Language compiler
- ts-loader 9.5.2 - Webpack TypeScript loader
- ts-node 10.9.2 - Direct TypeScript execution
- tsconfig-paths 4.2.0 - Path alias resolution for imports
- ESLint 9.18.0 - Code linting (see CONVENTIONS.md)
- Prettier 3.4.2 - Code formatting

## Key Dependencies

**Critical:**
- axios 1.13.6 - HTTP client for API calls (used for Gemini API, external requests)
- bcrypt 6.0.0 - Password hashing for security
- livekit-server-sdk 2.15.0 - LiveKit video conferencing server SDK
- reflect-metadata 0.2.2 - Metadata reflection library (required by TypeORM and NestJS decorators)
- rxjs 7.8.1 - Reactive programming library (core NestJS dependency)

**Validation & Transformation:**
- class-validator 0.15.1 - Decorator-based validation
- class-transformer 0.5.1 - Object transformation and serialization

**Type Definitions:**
- `@types/express` 5.0.0 - Express types
- `@types/node` 22.10.7 - Node.js types
- `@types/passport-google-oauth20` 2.0.17 - Google OAuth types
- `@types/supertest` 6.0.2 - Supertest types

## Configuration

**Environment:**
- Configuration managed via `.env` file (see `.env.example` for template)
- ConfigModule loads environment variables globally
- Environment variables are NOT committed; `.env.example` provides template

**TypeScript Configuration:**
- `tsconfig.json`: Main TypeScript compiler options
  - Target: ES2023
  - Module: nodenext
  - Strict null checks enabled
  - Decorator metadata emission enabled
  - Source maps enabled

- `tsconfig.build.json`: Build-specific configuration

**Build System:**
- NestJS CLI with `@nestjs/schematics` 11.0.0
- Compiled output to `dist/` directory
- `nest-cli.json`: NestJS CLI configuration with automatic output directory cleanup

**Code Quality:**
- ESLint with TypeScript support (see `eslint.config.mjs`)
- Prettier formatter (see `.prettierrc`)
  - Single quotes enabled
  - Trailing commas on all multiline structures

## Platform Requirements

**Development:**
- Node.js (version compatible with ES2023 target)
- npm for package management
- PostgreSQL database (local or remote)
- Optional: LiveKit server instance (for video conferencing)
- Optional: Redis (configured but not required for basic functionality)

**Production:**
- Node.js runtime
- PostgreSQL database
- LiveKit server (for video conferencing features)
- Google Gemini API key (for AI features)

**Build Output:**
- JavaScript/CommonJS compiled to `dist/` directory
- Ready for Node.js execution with `node dist/main`

---

*Stack analysis: 2026-03-22*
