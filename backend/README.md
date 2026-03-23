# MeetMind Backend

An intelligent meeting management platform built with NestJS. Manage meetings, participants, agendas, transcripts, and AI-powered insights.

## Features

✨ **Meeting Management**
- Create, schedule, and organize meetings
- Real-time participant management
- Meeting status tracking (scheduled, ongoing, completed, cancelled)
- Video recording URL storage

📝 **Meeting Content**
- Structured agendas with items
- Real-time Q&A functionality
- Interactive polls
- Automatic transcription and chunking
- AI-generated meeting summaries
- Attachment management
- Action item tracking

👥 **User Management**
- User registration and profiles
- Google OAuth 2.0 authentication
- JWT-based session management
- Participant tracking

🎥 **Real-time Features**
- LiveKit video conferencing integration
- Real-time event streaming
- Live participant updates

🤖 **AI Integration**
- Automatic meeting transcription
- Summary generation
- Key point extraction
- Action item identification

## Quick Start

### Prerequisites
- Node.js 18+ with npm
- PostgreSQL 12+
- Google OAuth credentials (optional, for social login)

### Installation

```bash
cd backend
npm install
```

### Environment Setup

Create a `.env` file in the `backend/` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=meetmind_user
DB_PASSWORD=your_secure_password
DB_NAME=meetmind
NODE_ENV=development

# Server Configuration
PORT=3000
CORS_ORIGIN=http://localhost:3001
FRONTEND_URL=http://localhost:3001

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_EXPIRATION=7d

# LiveKit Configuration (Optional)
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=http://localhost:7880

# AI Services (Optional)
AI_API_KEY=your_ai_api_key
```

### Database Setup

```bash
# Create PostgreSQL database and user
createuser -P meetmind_user  # Enter password when prompted
createdb -O meetmind_user meetmind
```

### Running the Application

```bash
# Development mode (with auto-reload)
npm run start:dev

# Production mode
npm run build
npm run start:prod

# Debug mode
npm run start:debug
```

The backend will be available at `http://localhost:3000`

## Available Scripts

```bash
# Development
npm run start          # Start the application
npm run start:dev      # Start with file watching
npm run start:debug    # Start with debugging enabled

# Building
npm run build          # Compile TypeScript to JavaScript

# Code Quality
npm run format         # Format code with Prettier
npm run lint           # Lint and fix code with ESLint

# Testing
npm run test           # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:cov       # Generate coverage report
npm run test:e2e       # Run end-to-end tests
```

## API Documentation

### Authentication Endpoints

**Google OAuth Login**
```
GET /auth/google
```
Redirects to Google login. Callback automatically creates/updates user.

**Verify Token**
```
GET /auth/verify
Authorization: Bearer <token>
```
Returns current user information if token is valid.

### Users Endpoints

**Get User Profile**
```
GET /users/:id
Authorization: Bearer <token>
```

**Update User Profile**
```
PUT /users/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Doe"
}
```

### Meetings Endpoints

**Create Meeting**
```
POST /meetings
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Q1 Planning",
  "description": "Quarterly planning meeting",
  "startTime": "2026-03-21T10:00:00Z"
}
```

**Get All Meetings (User's)**
```
GET /meetings
Authorization: Bearer <token>
```

**Get Meeting Details**
```
GET /meetings/:id
Authorization: Bearer <token>
```

**Update Meeting**
```
PUT /meetings/:id
Authorization: Bearer <token>
```

**Delete Meeting**
```
DELETE /meetings/:id
Authorization: Bearer <token>
```

**Join Meeting (Get LiveKit Token)**
```
POST /meetings/:id/join
Authorization: Bearer <token>
```

### Meeting Features Endpoints

**Agenda Items** - `GET|POST /meetings/:meetingId/agenda`
**Q&A** - `GET|POST /meetings/:meetingId/qa-questions`
**Polls** - `GET|POST /meetings/:meetingId/polls`
**Summaries** - `GET|POST /meetings/:meetingId/summaries`
**Attachments** - `GET|POST /meetings/:meetingId/attachments`
**Action Items** - `GET|POST /meetings/:meetingId/action-items`
**Transcripts** - `GET /meetings/:meetingId/transcript`

See `src/modules/meetings/controllers/` for complete endpoint documentation.

## Project Structure

```
src/
├── modules/
│   ├── auth/              # Authentication (JWT, Google OAuth)
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── strategies/    # Passport strategies
│   │   ├── guards/        # Auth guards
│   │   └── dto/           # Data transfer objects
│   │
│   ├── users/             # User management
│   │   ├── user.entity.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   └── dto/
│   │
│   └── meetings/          # Meeting management (core module)
│       ├── entities/      # Database entities
│       ├── services/      # Business logic
│       ├── controllers/   # API endpoints
│       ├── repositories/  # Data access
│       ├── dto/           # Request/response types
│       └── meetings.module.ts
│
├── providers/
│   ├── livekit/          # Video conferencing
│   ├── ai/               # AI/ML services
│   └── database/         # Database setup
│
├── common/               # Shared utilities
├── config/               # Configuration
├── types/                # TypeScript types
├── app.module.ts         # Root module
└── main.ts               # Application entry
```

## Database Schema

### Core Entities

**User**
- id (UUID)
- email (unique)
- firstName, lastName
- googleId, picture (from OAuth)
- isActive, createdAt, updatedAt

**Meeting**
- id (UUID)
- title, description
- status (scheduled|ongoing|completed|cancelled)
- startTime, endTime, duration
- organizerId, livekitRoomName, recordingUrl
- createdAt, updatedAt

**MeetingParticipant**
- Links users to meetings
- Role tracking possible

**Supporting Entities**
- MeetingAgenda - Structured meeting items
- MeetingEvent - Real-time events during meetings
- QAQuestion - Q&A pairs
- MeetingPoll - Polls and voting
- Transcript & TranscriptChunk - Transcription data
- MeetingSummary - Auto-generated or manual summaries
- MeetingAttachment - Files
- MeetingActionItem - Follow-up tasks

## Testing

### Unit Tests
```bash
npm run test
```

### Test with Coverage
```bash
npm run test:cov
```

### E2E Tests
```bash
npm run test:e2e
```

### Debug Tests
```bash
npm run test:debug
```

## Authentication Flow

### Google OAuth
1. User clicks "Login with Google"
2. Frontend redirects to `/auth/google`
3. User authenticates with Google
4. Google redirects to `/auth/google/callback`
5. Backend auto-creates/updates user in database
6. Backend redirects to frontend with JWT token
7. Frontend stores token and uses for subsequent requests

### JWT Verification
- All protected endpoints use `JwtAuthGuard`
- Token must be included in `Authorization: Bearer <token>` header
- Token is validated and user context is injected into request

## Configuration

### CORS
- Enabled for `CORS_ORIGIN` (default: localhost:3001)
- Credentials allowed for cross-origin requests

### Validation
- Global `ValidationPipe` enabled
- Whitelist enabled (unknown properties stripped)
- Auto-transform to DTO types enabled

### Database
- PostgreSQL with TypeORM ORM
- Auto-sync enabled in development
- Connection pooling configured
- Cascading deletes for related entities

## Deployment

### Build for Production
```bash
npm run build
```

Output goes to `dist/` directory.

### Run in Production
```bash
export NODE_ENV=production
node dist/main
```

### Environment Variables for Production
Update `.env` with production values:
- Use strong JWT_SECRET
- Configure real database credentials
- Set CORS_ORIGIN to your frontend domain
- Update Google OAuth callback URL
- Configure all provider API keys

## Troubleshooting

### Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
- Ensure PostgreSQL is running
- Verify DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME in .env
- Check database exists: `psql -U meetmind_user -d meetmind`

### Google OAuth Not Working
- Verify credentials in Google Cloud Console
- Ensure callback URL matches: `http://localhost:3000/auth/google/callback`
- Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env

### Port Already in Use
```bash
# Change PORT in .env or kill the process
lsof -i :3000
kill -9 <PID>
```

### Tests Failing
- Clear jest cache: `npm test -- --clearCache`
- Run in debug mode: `npm run test:debug`
- Check test database connection

## Performance Optimization

- Database indexes on frequently queried fields (email, meetingId)
- Connection pooling via TypeORM
- Pagination for large result sets
- Transcript chunking for efficient processing
- Caching opportunities for summaries and transcripts

## Security Considerations

- ✅ JWT tokens with expiration
- ✅ Google OAuth for secure authentication
- ✅ Password hashing with bcrypt
- ✅ Input validation with class-validator
- ✅ CORS properly configured
- ⚠️ SQL injection protected by TypeORM ORM
- ⚠️ Use HTTPS in production
- ⚠️ Rotate JWT_SECRET in production

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -m 'Add feature'`
3. Push to branch: `git push origin feature/my-feature`
4. Create Pull Request

## Resources

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeORM Documentation](https://typeorm.io)
- [Passport.js](http://www.passportjs.org/)
- [LiveKit Documentation](https://docs.livekit.io)

## License

This project is proprietary. All rights reserved.

## Support

For issues and questions, please open an issue in the repository.

---

**Backend API Port**: 3000
**Frontend URL**: http://localhost:3001
**Database**: PostgreSQL
**Last Updated**: 2026-03-20
