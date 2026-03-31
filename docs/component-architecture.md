# MeetMind Component-Based Architecture

## Overview

MeetMind is an intelligent meeting management platform with a clear separation between Client, Server, and Infrastructure components. This architecture ensures scalability, maintainability, and seamless integration between real-time video, AI processing, and data storage.

## Client Cluster (ReactJS)

### 1. UI Components

**Internal**:
- Dashboard: Displays upcoming meetings, meeting history, and quick access to join buttons with real-time status indicators
- Room: Renders LiveKit video stream with participant grid, chat panel, and AI summary toggle
- History: Shows past meetings with filters by date, participants, and AI-generated summaries

**Integration**:
- Dashboard fetches upcoming meetings via GET /meetings/upcoming with JWT authentication
- Room connects to LiveKit using tokens received from POST /meetings/:id/join
- History loads meeting records from GET /meetings/history and displays AI summaries when toggled

### 2. Service Layer

**Internal**:
- LiveKit SDK: Manages WebRTC connections, subscribes to audio/video tracks, and handles participant events
- Axios: Wraps all API calls to backend with request/response interceptors for JWT token management

**Integration**:
- LiveKit SDK receives room name and token from /meetings/:id/join endpoint to establish real-time connection
- Axios calls POST /meetings/:id/summary to trigger AI summarization and receives structured JSON response with key points and action items

### 3. State Management

**Internal**:
- Manages Redux store with slices for: active meeting state, participant list, transcript chunks, and AI summary data
- Implements optimistic updates for UI feedback during API calls

**Integration**:
- Updates participant list when receiving LiveKit participant join/leave events
- Appends transcript chunks as they arrive from LiveKit audio tracks
- Stores AI summary data from /meetings/:id/summary response for offline access

## Server Cluster (NestJS - Orchestration Center)

### 1. API Gateway

**Internal**:
- Central request router and authentication layer
- Routes requests to appropriate services (Auth, Room Manager, etc.)
- Handles request validation and initial JWT verification

**Integration**:
- All client requests enter through API Gateway first
- Routes to Auth Service for authentication endpoints
- Routes to Room Manager for meeting operations
- Gateway <-> Redis for rate limiting and request caching

### 2. Auth Service

**Internal**:
- Implements JWT authentication with refresh tokens
- Uses Redis to track active sessions and enforce access control
- Validates tokens and manages user authentication state

**Integration**:
- Frontend sends JWT in Authorization header for protected requests
- Creates user records from Google OAuth and generates tokens
- Uses Redis for session tracking and single-device login enforcement

### 3. Room Manager

**Internal**:
- Handles meeting lifecycle: create, join, end, delete
- Validates user permissions and manages meeting status
- Coordinates with LiveKit for room operations
- Uses Redis for room state and participant tracking

**Integration**:
- Calls LiveKit API to create/delete rooms when meetings start/end
- Generates LiveKit access tokens with appropriate permissions
- Uses Redis to track active meetings and participants
- Triggers AI summary generation after meeting completion

### 4. AI Integration Service

**Internal**:
- Manages AI processing requests and integration
- Handles Gemini API calls with retry logic
- Formats and validates AI responses

**Integration**:
- Receives transcript data from meeting recordings in S3
- Sends formatted data to Gemini API for processing
- Stores AI results in PostgreSQL database
- Uses Redis for processing status tracking

## Infrastructure Cluster

### 1. LiveKit Server

**Internal**:
- Manages WebRTC connections for real-time audio/video streaming
- Handles participant authentication via token validation
- Provides real-time media processing and routing

**Integration**:
- NestJS calls LiveKit API to create/delete rooms when meetings start/end
- Uses Redis for room state management and participant tracking
- Webhooks notify NestJS of room events and participant changes

### 2. Database & Caching

**Internal**:
- PostgreSQL: Stores persistent data including users, meetings, participants, summaries
- Redis: Manages session state, room tracking, and acts as cache layer
- Implements connection pooling for efficient database access

**Integration**:
- PostgreSQL stores user profiles from Google OAuth and meeting metadata
- Redis tracks active sessions and room states for efficient access
- Redis caches frequently accessed data to reduce database load
- PostgreSQL stores AI-generated summaries and key points after processing

## Data Flow Summary

1. **Authentication**: Frontend → API Gateway → Auth Service → Redis (session) → JWT token → Frontend
2. **Meeting Creation**: Frontend → API Gateway → Room Manager → LiveKit Server (create room) → PostgreSQL (store meeting)
3. **Meeting Join**: Frontend → API Gateway → Room Manager → LiveKit Server (generate token) → Frontend connects via WebRTC
4. **Meeting Event**: LiveKit webhooks → Room Manager → AI Service → S3 → Gemini API → PostgreSQL (store summary)
5. **Summary Retrieval**: Frontend → API Gateway → Room Manager → PostgreSQL (retrieve summary) → Frontend display

## Security Considerations

- All API calls require JWT authentication
- LiveKit tokens are short-lived (1 hour) and scoped to specific rooms
- Redis session tracking prevents multi-device access
- Environment variables protect API keys and secrets
- CORS restricted to frontend origin only
- Input validation on all endpoints

## Scalability Considerations

- Stateless authentication with JWT
- LiveKit server can scale horizontally
- Redis provides distributed session and state management
- PostgreSQL connection pooling handles concurrent requests
- AI service can be deployed as separate microservice
- S3 storage provides scalable media storage
- Redis caching reduces database load
- API Gateway enables horizontal scaling of backend services

## Future Enhancements

- Add WebRTC fallback for browsers without LiveKit support
- Implement real-time collaboration features
- Expand AI capabilities with sentiment analysis
- Add meeting analytics dashboard
- Implement notification system for action items
- Add calendar integration
- Support breakout rooms
- Implement AI-powered meeting notes
- Add translation services