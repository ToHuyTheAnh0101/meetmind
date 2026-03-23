# MeetMind Backend Setup Guide

## Project Structure

```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/          # Authentication & JWT
│   │   ├── users/         # User management
│   │   ├── meetings/      # Meeting management, transcripts, RAG
│   │   └── ai/            # AI services (Gemini integration)
│   ├── config/            # Configuration files
│   ├── database/          # Database migrations & schemas
│   ├── common/
│   │   ├── guards/        # Auth guards, role guards
│   │   ├── interceptors/  # Response interceptors
│   │   └── decorators/    # Custom decorators
│   ├── types/             # TypeScript types & interfaces
│   ├── main.ts            # Application entry point
│   └── app.module.ts      # Root module
└── docker-compose.yml     # PostgreSQL & Redis setup

```

## Prerequisites

- Node.js 18+
- npm/yarn
- Docker & Docker Compose (for database)

## Installation

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Setup environment variables:**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your actual API keys and configuration.

3. **Start PostgreSQL & Redis:**
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations (auto-sync with TypeORM):**
   The application will automatically sync the database schema on startup in development mode.

5. **Start the server:**
   ```bash
   npm run start
   # Or for development with hot reload:
   npm run start:dev
   ```

The server will start on `http://localhost:3000`

## Available Scripts

- `npm run start` - Start the application
- `npm run start:dev` - Start with hot reload
- `npm run build` - Build for production
- `npm run test` - Run unit tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run lint` - Run ESLint

## API Endpoints (To be implemented)

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/refresh` - Refresh JWT token

### Meetings
- `GET /meetings` - Get all user meetings
- `POST /meetings` - Create new meeting
- `GET /meetings/:id` - Get meeting details
- `PUT /meetings/:id` - Update meeting
- `DELETE /meetings/:id` - Delete meeting

### Transcripts & RAG
- `GET /meetings/:id/transcript` - Get meeting transcript
- `GET /meetings/:id/transcript/summary` - Get AI summary
- `POST /meetings/:id/chat` - Ask question via RAG chatbot

## Database Schema

### Users Table
- id (UUID)
- email (unique)
- firstName, lastName
- password (hashed)
- isActive
- timestamps

### Meetings Table
- id (UUID)
- title, description
- status (scheduled, ongoing, completed, cancelled)
- startTime, endTime
- organizerId (FK)
- duration (seconds)
- timestamps

### Transcripts Table
- id (UUID)
- content (full transcript text)
- summary (AI-generated)
- actionItems (array)
- keyPoints (array)
- meetingId (FK)
- isProcessed
- timestamps

### TranscriptChunks Table
- id (UUID)
- content (chunk text)
- embedding (pgvector)
- chunkIndex, startTime, endTime
- transcriptId (FK)
- createdAt

## Key Features Implemented

✅ TypeORM + PostgreSQL setup with pgvector
✅ Environment configuration
✅ CORS enabled
✅ Global validation pipe
✅ Entity models for Users, Meetings, Transcripts
✅ AI Service (Gemini integration)
✅ Docker Compose for easy database setup

## Next Steps

- Implement Auth module (JWT, bcrypt)
- Create Users service & controller
- Implement Meetings service & controller
- Create Transcript processing pipeline
- Setup RAG chatbot endpoint
- Implement WebRTC meeting room logic
- Add comprehensive error handling
- Setup testing framework
- Add API documentation (Swagger)

## Environment Variables

See `.env.example` for required environment variables:
- Database credentials
- JWT secret
- Gemini API key
- WebRTC/LiveKit configuration
- CORS origins
- Redis configuration (optional)
