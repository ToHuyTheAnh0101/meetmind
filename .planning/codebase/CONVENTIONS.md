# Code Style & Conventions

## Language & Runtime

- **Language**: TypeScript 5.7.x
- **Runtime**: Node.js (version specified in `.nvmrc` or `package.json`)
- **Framework**: NestJS 11.x

## File Organization & Naming

### File Naming Conventions

| Type | Pattern | Example | Location |
|------|---------|---------|----------|
| Entity | `entity-name.entity.ts` | `meeting.entity.ts` | `modules/{name}/entities/` |
| Service | `feature.service.ts` | `meetings.service.ts` | `modules/{name}/services/` |
| Controller | `feature.controller.ts` | `meetings.controller.ts` | `modules/{name}/controllers/` |
| Repository | `entity.repository.ts` | `meeting.repository.ts` | `modules/{name}/repositories/` |
| DTO | `verb-noun.dto.ts` | `create-meeting.dto.ts` | `modules/{name}/dto/` |
| Guard | `feature-auth.guard.ts` | `jwt-auth.guard.ts` | `modules/{name}/guards/` |
| Strategy | `provider.strategy.ts` | `google.strategy.ts` | `modules/{name}/strategies/` |
| Module | `feature.module.ts` | `meetings.module.ts` | `modules/{name}/` |
| Test | `filename.spec.ts` | `meetings.service.spec.ts` | Same dir as source |

### Directory Structure Rules

- Feature modules grouped under `modules/` directory
- Each module is self-contained with controllers, services, entities, DTOs
- Infrastructure providers (LiveKit, AI) in `src/providers/`
- Shared utilities in `src/common/`
- Entities organized by subdomain (core, collaboration, content, scheduling, ai)

## Naming Conventions

### Variables & Constants

- **camelCase** for variables and function parameters
  ```typescript
  const meetingId = meeting.id;
  let participantCount = 0;
  ```

- **UPPER_SNAKE_CASE** for constants
  ```typescript
  const DEFAULT_MEETING_DURATION = 3600; // seconds
  const MAX_PARTICIPANTS = 500;
  ```

- **PascalCase** for class and type names
  ```typescript
  class MeetingsService {}
  interface IMeetingRepository {}
  type MeetingStatus = 'scheduled' | 'ongoing' | 'completed';
  ```

### Database Naming

- **Table names**: lowercase plural (`meetings`, `users`, `participants`)
- **Column names**: camelCase in TypeScript, snake_case in database (TypeORM auto-converts)
- **Foreign key columns**: End with `Id` suffix
  ```typescript
  @Column()
  organizerId: string; // References User.id

  @Column()
  meetingId: string; // References Meeting.id
  ```

- **Relationship columns**: Named for what they reference
  ```typescript
  @ManyToOne(() => User, (user) => user.organizedMeetings)
  @JoinColumn({ name: 'organizerId' })
  organizer: User;
  ```

### Enums

- **PascalCase** enum names
- **UPPER_CASE** enum values (for string enums)
  ```typescript
  export enum MeetingStatus {
    SCHEDULED = 'scheduled',
    ONGOING = 'ongoing',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
  }
  ```

### Methods & Functions

- **camelCase** for method names
- **Verb-first naming** for methods: `get*`, `create*`, `update*`, `delete*`, `find*`
  ```typescript
  async getMeeting(id: string) { }
  async createMeeting(dto: CreateMeetingDto) { }
  async updateMeetingStatus(id: string, status: MeetingStatus) { }
  async deleteMeeting(id: string) { }
  async findMeetingsByOrganizer(userId: string) { }
  ```

- **Boolean methods** use `is*` or `has*` prefix
  ```typescript
  isParticipant(meetingId: string, userId: string): boolean
  hasAccessToMeeting(userId: string, meetingId: string): boolean
  ```

## Code Style

### Imports

- **Order imports**: Decorators first, then framework, then external packages, then relative imports
  ```typescript
  // Framework decorators
  import {
    Injectable,
    NotFoundException,
    BadRequestException,
  } from '@nestjs/common';

  // External packages
  import { ConfigService } from '@nestjs/config';

  // Entities and types
  import { Meeting, MeetingStatus } from '../entities';
  import { CreateMeetingDto } from '../dto/create-meeting.dto';

  // Services and repositories
  import { MeetingRepository } from '../repositories/meeting.repository';
  ```

### Classes

- Use **@Injectable()** decorator on all services
  ```typescript
  @Injectable()
  export class MeetingsService {
    constructor(
      private meetingsRepository: MeetingRepository,
      private configService: ConfigService,
    ) {}
  }
  ```

- Services use **constructor dependency injection**
  ```typescript
  constructor(
    private readonly repository: MeetingRepository,
    private readonly service: UserService,
    private readonly configService: ConfigService,
  ) {}
  ```

- Use `readonly` on injected dependencies (convention, not requirement)

### Methods

- Use **async/await** for asynchronous operations
  ```typescript
  async create(dto: CreateMeetingDto): Promise<Meeting> {
    const meeting = this.repository.create(dto);
    return this.repository.save(meeting);
  }
  ```

- Always **specify return types** explicitly
  ```typescript
  async findById(id: string): Promise<Meeting> { }

  getStatus(): MeetingStatus { }
  ```

- Async methods should return `Promise<T>`

### Error Handling

- Throw **NestJS exceptions**, not generic Error
  ```typescript
  if (!meeting) {
    throw new NotFoundException(`Meeting ${id} not found`);
  }

  if (!dto.title) {
    throw new BadRequestException('Title is required');
  }

  if (!isAuthorized) {
    throw new ForbiddenException('You cannot modify this meeting');
  }

  if (error instanceof QueryFailedError) {
    throw new InternalServerErrorException('Database error');
  }
  ```

- **Common NestJS exceptions**:
  - `NotFoundException` - Resource not found (404)
  - `BadRequestException` - Invalid input (400)
  - `UnauthorizedException` - Not authenticated (401)
  - `ForbiddenException` - Not authorized (403)
  - `ConflictException` - Resource conflict (409)
  - `InternalServerErrorException` - Server error (500)

- Use **try-catch** for external service calls
  ```typescript
  try {
    await this.liveKitService.createRoom(meetingId);
  } catch (error) {
    logger.error(`Failed to create LiveKit room: ${error.message}`);
    throw new InternalServerErrorException('Failed to initialize video room');
  }
  ```

## Entities & Database

### Entity Decorator

```typescript
@Entity('table_name') // Table name in database
export class EntityName {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Columns
}
```

### Columns

```typescript
@Column() // Required column
name: string;

@Column({ nullable: true }) // Optional column
description: string;

@Column({ type: 'enum', enum: MeetingStatus, default: MeetingStatus.SCHEDULED })
status: MeetingStatus;

@Column({ length: 255 })
title: string;

@Column({ type: 'timestamp' })
startTime: Date;

@CreateDateColumn()
createdAt: Date;

@UpdateDateColumn()
updatedAt: Date;
```

### Relationships

```typescript
// Many-to-One
@ManyToOne(() => User, (user) => user.organizedMeetings)
@JoinColumn({ name: 'organizerId' })
organizer: User;

// One-to-Many
@OneToMany(() => MeetingParticipant, (participant) => participant.meeting, {
  cascade: true,
  eager: false,
})
participants: MeetingParticipant[];

// One-to-One
@OneToOne(() => Transcript, (transcript) => transcript.meeting, {
  cascade: true,
  eager: false,
})
@JoinColumn()
transcript: Transcript;
```

### Best Practices

- Always add **timestamps**: `createdAt`, `updatedAt`
- Use **UUID** primary keys (not auto-increment integers)
- Set `cascade: true` for parent-child delete relationships
- Set `eager: false` by default (eager load in service when needed)
- Define bidirectional relationships on both entities

## Validation

### DTOs

Use **class-validator** decorators in DTOs:

```typescript
export class CreateMeetingDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @IsDateString()
  startTime: string; // ISO 8601 format
}
```

### Common Decorators

- `@IsString()`, `@IsNumber()`, `@IsBoolean()`, `@IsDate()`
- `@IsEmail()`, `@IsURL()`, `@IsUUID()`
- `@IsNotEmpty()`, `@IsOptional()`
- `@MinLength(n)`, `@MaxLength(n)`
- `@Min(n)`, `@Max(n)`
- `@IsArray()`, `@ArrayMinSize(n)`, `@ArrayMaxSize(n)`
- `@IsEnum(MyEnum)`
- `@Matches(regex)` for pattern validation

### Global Validation

- Validation pipe is globally enabled in `main.ts`
- Set `whitelist: true` to strip unknown properties
- Set `transform: true` to auto-convert types

## Controllers

### Decorator Usage

```typescript
@Controller('meetings')
export class MeetingsController {
  constructor(private meetingsService: MeetingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Body() dto: CreateMeetingDto,
    @Request() req,
  ): Promise<Meeting> {
    return this.meetingsService.create(dto, req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string): Promise<Meeting> {
    return this.meetingsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMeetingDto,
  ): Promise<Meeting> {
    return this.meetingsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string): Promise<void> {
    return this.meetingsService.remove(id);
  }
}
```

- Use **route decorators** (`@Get`, `@Post`, `@Put`, `@Delete`)
- Use **@UseGuards(JwtAuthGuard)** for protected routes
- Use **@Body()** for request body
- Use **@Param()** for URL parameters
- Use **@Query()** for query strings
- Use **@Request()** to access full request object
- Always specify DTOs or types for @Body() parameters

## Services

### Service Pattern

```typescript
@Injectable()
export class MeetingsService {
  constructor(
    private readonly repository: MeetingRepository,
    private readonly userService: UsersService,
    private readonly liveKitService: LiveKitService,
    private readonly logger: Logger,
  ) {}

  async create(dto: CreateMeetingDto, userId: string): Promise<Meeting> {
    // Validation
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Business logic
    const meeting = this.repository.create({
      ...dto,
      organizerId: userId,
    });

    try {
      // External service calls
      await this.liveKitService.createRoom(meeting.id);
      meeting.livekitRoomName = meeting.id;
    } catch (error) {
      this.logger.error(`LiveKit error: ${error.message}`);
      throw new InternalServerErrorException('Failed to create video room');
    }

    // Persistence
    return this.repository.save(meeting);
  }

  async update(id: string, dto: UpdateMeetingDto): Promise<Meeting> {
    const meeting = await this.repository.findOne({ where: { id } });
    if (!meeting) {
      throw new NotFoundException(`Meeting ${id} not found`);
    }

    Object.assign(meeting, dto);
    return this.repository.save(meeting);
  }

  async remove(id: string): Promise<void> {
    const meeting = await this.repository.findOne({ where: { id } });
    if (!meeting) {
      throw new NotFoundException(`Meeting ${id} not found`);
    }

    await this.repository.remove(meeting);
  }
}
```

### Service Best Practices

- Use **repository pattern** for data access (never query DB directly in service)
- **Validate input** at service layer
- **Throw exceptions** for errors, don't return error objects
- **Log important operations** and errors
- **Composition over inheritance** - inject services, don't extend

## Repositories

### Repository Pattern

```typescript
@EntityRepository(Meeting)
export class MeetingRepository extends Repository<Meeting> {
  async findWithParticipants(id: string): Promise<Meeting> {
    return this.findOne({
      where: { id },
      relations: ['participants', 'organizer'],
    });
  }

  async findByOrganizer(userId: string): Promise<Meeting[]> {
    return this.find({
      where: { organizerId: userId },
      order: { createdAt: 'DESC' },
    });
  }
}
```

- Extend `Repository<Entity>` from TypeORM
- Add custom query methods specific to entity
- Return fully formed entities with eager-loaded relations if needed
- Use `relations` array to specify relations to load
- Use `order` to specify ordering

## Type Safety

### Types vs Interfaces

- Prefer **interfaces** for object shapes (particularly exported types)
  ```typescript
  export interface IMeetingRepository {
    find(id: string): Promise<Meeting>;
    create(dto: CreateMeetingDto): Promise<Meeting>;
  }
  ```

- Use **types** for unions, primitives, and internal types
  ```typescript
  type MeetingStatusFilter = 'all' | 'scheduled' | 'ongoing' | 'completed';
  ```

### Generics

- Use generics for reusable patterns
  ```typescript
  export class PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
  }
  ```

## Imports & Exports

### Barrel Exports

- Use `index.ts` for barrel exports in entities directory
  ```typescript
  // entities/index.ts
  export { Meeting, MeetingStatus } from './core/meeting.entity';
  export { Participant } from './core/participant.entity';
  export { MeetingEvent } from './collaboration/meeting-event.entity';
  ```

- Reduces import complexity: `import { Meeting } from '../entities'`

### Relative vs Absolute Imports

- Prefer **relative imports** within same module
  ```typescript
  import { MeetingRepository } from '../repositories/meeting.repository';
  ```

- Use **absolute imports** for cross-module dependencies (if configured)
  ```typescript
  import { UsersService } from '@modules/users/users.service';
  ```

## Comments & Documentation

### When to Comment

- **Complex business logic**: Explain the "why", not the "what"
  ```typescript
  // We filter out cancelled meetings because they should not appear in the user's calendar
  const activeMeetings = meetings.filter(m => m.status !== MeetingStatus.CANCELLED);
  ```

- **Non-obvious algorithms**: Explain the approach
- **Workarounds**: Document why the workaround exists
- **TODO/FIXME**: Use sparingly and with context

### When NOT to Comment

- Self-explanatory code: Comments that restate code are noise
  ```typescript
  // DON'T: This is obvious
  const count = meetings.length; // Get the length of meetings

  // DO: This explains the context
  const count = meetings.length; // Total participants in this meeting
  ```

## Logging

### Logger Usage

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  async create(dto: CreateMeetingDto): Promise<Meeting> {
    this.logger.log(`Creating meeting: ${dto.title}`);
    try {
      const meeting = await this.repository.save(...);
      this.logger.debug(`Meeting created with ID: ${meeting.id}`);
      return meeting;
    } catch (error) {
      this.logger.error(`Failed to create meeting: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Creation failed');
    }
  }
}
```

- Use **NestJS Logger** (not console.log)
- **Log levels**: error, warn, log (info), debug, verbose
- **Error logging** includes stack trace as second argument
- **Avoid logging sensitive data** (passwords, API keys, tokens)

## Best Practices Summary

| Practice | Reason |
|----------|--------|
| Explicit return types | Type safety and IDE support |
| Async/await over .then() | More readable, easier debugging |
| Composition over inheritance | More flexible, easier testing |
| Repository pattern | Decouples business logic from data access |
| DTO validation | Ensures only valid data enters system |
| Throw exceptions | Consistent error handling |
| Constructor injection | Testable, DI container managed |
| readonly on dependencies | Prevents accidental mutations |
| UUID primary keys | Better distribution, privacy |
| Timestamps (createdAt, updatedAt) | Audit trail and business logic needs |
