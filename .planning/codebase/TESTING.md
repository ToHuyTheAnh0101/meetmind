# Testing Framework & Patterns

## Testing Stack

- **Test Runner**: Jest 30.x
- **Unit Testing**: Jest with `@nestjs/testing`
- **API Testing**: Supertest for HTTP requests
- **Assertions**: Jest matchers (expect)
- **TypeScript Support**: ts-jest transformer
- **Environment**: Node.js test environment

## Test Structure

### File Organization

**Unit Tests**: Colocated with source files
```
src/
├── modules/
│   └── meetings/
│       ├── services/
│       │   ├── meetings.service.ts
│       │   └── meetings.service.spec.ts  ← Colocated test
│       ├── controllers/
│       │   ├── meetings.controller.ts
│       │   └── meetings.controller.spec.ts
│       └── repositories/
│           ├── meeting.repository.ts
│           └── meeting.repository.spec.ts
```

**E2E Tests**: Separate test directory
```
test/
├── jest-e2e.json              ← E2E Jest config
└── app.e2e-spec.ts            ← E2E test file
```

### Test File Naming

- **Unit tests**: `filename.spec.ts`
- **E2E tests**: `filename.e2e-spec.ts`
- Jest automatically discovers `*.spec.ts` files
- E2E tests use separate config (`jest-e2e.json`) with regex: `.e2e-spec.ts$`

## Running Tests

### Unit Tests

```bash
# Run all unit tests once
npm run test

# Watch mode (re-run on changes)
npm run test:watch

# Coverage report
npm run test:cov

# Debug mode with breakpoints
npm run test:debug
```

### E2E Tests

```bash
# Run E2E tests only
npm run test:e2e

# Watch mode for E2E tests
npm run test:e2e -- --watch

# E2E with coverage
npm run test:e2e -- --coverage
```

## Unit Test Patterns

### Basic Service Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MeetingsService } from './meetings.service';
import { MeetingRepository } from '../repositories/meeting.repository';
import { UsersService } from '../../users/users.service';
import { LiveKitService } from '../../../providers/livekit/livekit.service';
import { CreateMeetingDto } from '../dto/create-meeting.dto';
import { Meeting, MeetingStatus } from '../entities';

describe('MeetingsService', () => {
  let service: MeetingsService;
  let repository: jest.Mocked<MeetingRepository>;
  let usersService: jest.Mocked<UsersService>;
  let liveKitService: jest.Mocked<LiveKitService>;

  beforeEach(async () => {
    // Create mocks for dependencies
    const mockMeetingRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const mockUsersService = {
      findById: jest.fn(),
    };

    const mockLiveKitService = {
      createRoom: jest.fn(),
      deleteRoom: jest.fn(),
    };

    // Create NestJS test module
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingsService,
        {
          provide: MeetingRepository,
          useValue: mockMeetingRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: LiveKitService,
          useValue: mockLiveKitService,
        },
      ],
    }).compile();

    service = module.get<MeetingsService>(MeetingsService);
    repository = module.get(MeetingRepository) as jest.Mocked<MeetingRepository>;
    usersService = module.get(UsersService) as jest.Mocked<UsersService>;
    liveKitService = module.get(LiveKitService) as jest.Mocked<LiveKitService>;
  });

  describe('create', () => {
    it('should create a meeting successfully', async () => {
      const dto: CreateMeetingDto = {
        title: 'Team Standup',
        description: 'Daily standup meeting',
        startTime: '2026-03-25T10:00:00Z',
      };

      const userId = 'user-123';
      const mockMeeting: Meeting = {
        id: 'meeting-123',
        ...dto,
        startTime: new Date(dto.startTime),
        organizerId: userId,
        status: MeetingStatus.SCHEDULED,
        // ... other fields
      };

      // Setup mock behavior
      repository.create.mockReturnValue(mockMeeting);
      repository.save.mockResolvedValue(mockMeeting);
      liveKitService.createRoom.mockResolvedValue(true);

      // Execute
      const result = await service.create(dto, userId);

      // Assert
      expect(result.title).toBe('Team Standup');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Team Standup',
          organizerId: userId,
        }),
      );
      expect(liveKitService.createRoom).toHaveBeenCalledWith('meeting-123');
    });

    it('should throw NotFoundException if user does not exist', async () => {
      const dto: CreateMeetingDto = {
        title: 'Meeting',
        startTime: '2026-03-25T10:00:00Z',
      };

      usersService.findById.mockResolvedValue(null);

      await expect(service.create(dto, 'invalid-user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should rollback meeting creation if LiveKit room fails', async () => {
      const dto: CreateMeetingDto = {
        title: 'Meeting',
        startTime: '2026-03-25T10:00:00Z',
      };

      const mockMeeting: Meeting = { id: 'meeting-123' };

      repository.create.mockReturnValue(mockMeeting);
      repository.save.mockResolvedValue(mockMeeting);
      liveKitService.createRoom.mockRejectedValue(new Error('LiveKit error'));
      repository.remove.mockResolvedValue(null);

      await expect(service.create(dto, 'user-123')).rejects.toThrow();
      expect(repository.remove).toHaveBeenCalledWith(mockMeeting);
    });
  });

  describe('findOne', () => {
    it('should return meeting if found', async () => {
      const mockMeeting: Meeting = { id: 'meeting-123', title: 'Test' };
      repository.findOne.mockResolvedValue(mockMeeting);

      const result = await service.findOne('meeting-123');

      expect(result).toEqual(mockMeeting);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 'meeting-123' },
      });
    });

    it('should throw NotFoundException if meeting does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```

### Controller Test with Guards

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { MeetingsController } from './meetings.controller';
import { MeetingsService } from '../services/meetings.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CreateMeetingDto } from '../dto/create-meeting.dto';

describe('MeetingsController', () => {
  let controller: MeetingsController;
  let service: jest.Mocked<MeetingsService>;

  beforeEach(async () => {
    const mockService = {
      create: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeetingsController],
      providers: [
        {
          provide: MeetingsService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard) // Override auth guard for testing
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MeetingsController>(MeetingsController);
    service = module.get(MeetingsService) as jest.Mocked<MeetingsService>;
  });

  describe('create', () => {
    it('should call service.create with dto and userId', async () => {
      const dto: CreateMeetingDto = {
        title: 'Test Meeting',
        startTime: '2026-03-25T10:00:00Z',
      };

      const mockRequest = { user: { id: 'user-123' } };
      const mockMeeting = { id: 'meeting-123', ...dto };

      service.create.mockResolvedValue(mockMeeting);

      const result = await controller.create(dto, mockRequest);

      expect(result).toEqual(mockMeeting);
      expect(service.create).toHaveBeenCalledWith(dto, 'user-123');
    });
  });
});
```

### Repository Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MeetingRepository } from './meeting.repository';
import { Meeting } from '../entities/core/meeting.entity';
import { Repository } from 'typeorm';

describe('MeetingRepository', () => {
  let repository: MeetingRepository;
  let typeormRepository: jest.Mocked<Repository<Meeting>>;

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingRepository,
        {
          provide: getRepositoryToken(Meeting),
          useValue: mockRepository,
        },
      ],
    }).compile();

    repository = module.get<MeetingRepository>(MeetingRepository);
    typeormRepository = module.get(
      getRepositoryToken(Meeting),
    ) as jest.Mocked<Repository<Meeting>>;
  });

  describe('findWithParticipants', () => {
    it('should load meeting with participants and organizer', async () => {
      const mockMeeting = {
        id: 'meeting-123',
        participants: [{ id: 'participant-1' }],
        organizer: { id: 'user-123' },
      };

      typeormRepository.findOne.mockResolvedValue(mockMeeting);

      const result = await repository.findWithParticipants('meeting-123');

      expect(result).toEqual(mockMeeting);
      expect(typeormRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'meeting-123' },
        relations: ['participants', 'organizer'],
      });
    });
  });
});
```

## E2E Test Patterns

### Basic E2E Test

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { MeetingsService } from '../src/modules/meetings/services/meetings.service';

describe('Meetings (e2e)', () => {
  let app: INestApplication;
  let meetingsService: MeetingsService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    meetingsService = moduleFixture.get<MeetingsService>(MeetingsService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /meetings', () => {
    it('should create a meeting with valid input', async () => {
      const createDto = {
        title: 'Team Standup',
        description: 'Daily standup',
        startTime: '2026-03-25T10:00:00Z',
      };

      const response = await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${validToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body.data).toEqual(
        expect.objectContaining({
          title: 'Team Standup',
          status: 'scheduled',
        }),
      );
    });

    it('should return 401 without authentication', async () => {
      const createDto = {
        title: 'Test',
        startTime: '2026-03-25T10:00:00Z',
      };

      await request(app.getHttpServer())
        .post('/meetings')
        .send(createDto)
        .expect(401);
    });

    it('should return 400 with invalid input', async () => {
      const invalidDto = {
        title: '', // Invalid: empty title
        startTime: 'invalid-date',
      };

      const response = await request(app.getHttpServer())
        .post('/meetings')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('validation');
    });
  });

  describe('GET /meetings/:id', () => {
    it('should return meeting if exists', async () => {
      const meeting = await meetingsService.create(
        {
          title: 'Test Meeting',
          startTime: new Date('2026-03-25T10:00:00Z'),
        },
        'user-123',
      );

      const response = await request(app.getHttpServer())
        .get(`/meetings/${meeting.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(meeting.id);
    });

    it('should return 404 if meeting does not exist', async () => {
      await request(app.getHttpServer())
        .get('/meetings/invalid-id')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
    });
  });

  describe('PUT /meetings/:id', () => {
    it('should update meeting with valid input', async () => {
      const meeting = await meetingsService.create(
        { title: 'Old Title', startTime: new Date() },
        'user-123',
      );

      const response = await request(app.getHttpServer())
        .put(`/meetings/${meeting.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ title: 'New Title' })
        .expect(200);

      expect(response.body.data.title).toBe('New Title');
    });
  });

  describe('DELETE /meetings/:id', () => {
    it('should delete meeting', async () => {
      const meeting = await meetingsService.create(
        { title: 'To Delete', startTime: new Date() },
        'user-123',
      );

      await request(app.getHttpServer())
        .delete(`/meetings/${meeting.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      // Verify deleted
      await request(app.getHttpServer())
        .get(`/meetings/${meeting.id}`)
        .set('Authorization', `Bearer ${validToken}`)
        .expect(404);
    });
  });
});
```

## Mocking Patterns

### Service Mocks

```typescript
// Mock external service
const mockLiveKitService = {
  createRoom: jest.fn().mockResolvedValue('room-id'),
  deleteRoom: jest.fn().mockResolvedValue(true),
  getAccessToken: jest.fn().mockResolvedValue('token'),
};

// Mock that throws error
const mockAiService = {
  generateSummary: jest.fn().mockRejectedValue(new Error('API error')),
};

// Mock with side effects
const mockRepository = {
  find: jest.fn().mockImplementation((options) => {
    if (options.where.id === 'test-id') {
      return Promise.resolve([{ id: 'test-id', title: 'Test' }]);
    }
    return Promise.resolve([]);
  }),
};
```

### Date Mocking

```typescript
// Mock current date
const mockDate = new Date('2026-03-22T10:00:00Z');
jest.useFakeTimers();
jest.setSystemTime(mockDate);

// ... run tests ...

jest.useRealTimers();
```

### Partial Mocks

```typescript
// Mock only specific methods, keep others real
jest.spyOn(service, 'publicMethod').mockResolvedValue(mockValue);

// Restore after test
jest.restoreAllMocks();
```

## Testing Best Practices

### 1. Test Organization

- **Describe blocks**: Organize by feature or method
  ```typescript
  describe('MeetingsService', () => {
    describe('create', () => {
      // create tests
    });
    describe('update', () => {
      // update tests
    });
  });
  ```

- **Test names**: Clear, specific, describe expected behavior
  ```typescript
  // Good
  it('should throw NotFoundException when meeting does not exist')
  it('should rollback LiveKit room if meeting save fails')
  it('should not allow participant to update organizer')

  // Bad
  it('should work')
  it('tests update method')
  it('error handling')
  ```

### 2. Test Structure (AAA Pattern)

```typescript
it('should do something', async () => {
  // Arrange: Setup test data and mocks
  const input = { title: 'Test' };
  const expectedOutput = { id: '123', title: 'Test' };
  repository.save.mockResolvedValue(expectedOutput);

  // Act: Execute the function
  const result = await service.create(input);

  // Assert: Verify the result
  expect(result).toEqual(expectedOutput);
  expect(repository.save).toHaveBeenCalledWith(input);
});
```

### 3. Common Assertions

```typescript
// Equality
expect(result).toBe(expected); // Strict equality (===)
expect(result).toEqual(expected); // Deep equality
expect(result).toStrictEqual(expected); // Exact match

// Existence
expect(value).toBeDefined();
expect(value).toBeNull();
expect(value).toBeTruthy();
expect(value).toBeFalsy();

// Arrays
expect(arr).toContain(item);
expect(arr).toHaveLength(3);
expect(arr).toEqual(expect.arrayContaining([item1, item2]));

// Objects
expect(obj).toEqual(expect.objectContaining({ key: value }));
expect(obj).toHaveProperty('key');

// Exceptions
await expect(promise).rejects.toThrow();
await expect(promise).rejects.toThrow(SpecificError);
expect(() => sync()).toThrow();

// Mocks
expect(mock).toHaveBeenCalled();
expect(mock).toHaveBeenCalledWith(arg1, arg2);
expect(mock).toHaveBeenCalledTimes(1);
expect(mock).toHaveReturnedWith(value);
```

### 4. Test Coverage Goals

- **Target**: 70-80% code coverage minimum
- **Focus on**:
  - Happy path (normal operation)
  - Error cases (exceptions, validation failures)
  - Edge cases (boundary conditions, null values)
  - Integration points (service calls, database queries)

- **Don't over-test**:
  - Trivial getters/setters
  - Framework boilerplate
  - Third-party library behavior

### 5. Async Testing

```typescript
// Promise-based
it('should handle async operations', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});

// Error handling
it('should throw on error', async () => {
  await expect(failingAsync()).rejects.toThrow(Error);
});

// Timeouts
it('should timeout after 5 seconds', async () => {
  jest.setTimeout(5000);
  await slowFunction();
});
```

### 6. Test Isolation

- Each test should be independent
- Use `beforeEach` for setup, `afterEach` for cleanup
- Don't share state between tests
- Reset mocks between tests: `jest.clearAllMocks()`

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  // Reset to known state
});

afterEach(() => {
  // Cleanup resources
  jest.clearAllMocks();
});
```

## Configuration Files

### jest.config.js (Unit Tests)

```javascript
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
```

### test/jest-e2e.json (E2E Tests)

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

## Coverage Report

```bash
# Generate coverage report
npm run test:cov

# View HTML coverage report
open coverage/index.html

# Check coverage thresholds
npm run test:cov -- --collectCoverageFrom="src/**/*.ts"
```

Coverage report includes:
- **Statements**: Percentage of statements executed
- **Branches**: Percentage of conditional branches executed
- **Functions**: Percentage of functions called
- **Lines**: Percentage of lines executed

## Common Testing Issues

| Issue | Solution |
|-------|----------|
| "Cannot find module" | Check import paths, use `moduleNameMapper` in jest config |
| Async test timeout | Increase timeout: `jest.setTimeout(10000)` |
| Mock not working | Reset mocks in beforeEach: `jest.clearAllMocks()` |
| Database connection | Use in-memory database or mock repository |
| Guard not working in tests | Override guard: `.overrideGuard(GuardName).useValue({ canActivate: () => true })` |
| Circular dependencies | Refactor modules, use interfaces for circular deps |

## Testing Checklist

- [ ] Unit tests for all services (happy path)
- [ ] Unit tests for error cases (exceptions)
- [ ] Unit tests for edge cases (null, empty, boundary)
- [ ] Integration tests for services working together
- [ ] E2E tests for critical user flows
- [ ] Guard and authentication tests
- [ ] DTO validation tests
- [ ] Repository query tests
- [ ] Database transaction tests
- [ ] External service mocking (LiveKit, AI)
- [ ] Coverage report generated and reviewed
- [ ] Failing tests fixed before commit
