import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { LiveKitModule } from './providers/livekit/livekit.module';
import { MeetingsModule } from './modules/meetings/meetings.module';
import { QaModule } from './modules/qa/qa.module';
import { PollsModule } from './modules/polls/polls.module';
import { BreakoutRoomsModule } from './modules/breakout-rooms/breakout-rooms.module';
import { SummariesModule } from './modules/summaries/summaries.module';
import { AttachmentsModule } from './modules/attachments/attachments.module';
import { MeetLogsModule } from './modules/meetlogs/meetlogs.module';
import { AiModule } from './providers/ai/ai.module';
import { MailModule } from './providers/mail/mail.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
        synchronize:
          configService.get('NODE_ENV') !== 'production' ||
          configService.get('DB_SYNCHRONIZE') === 'true',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
      }),
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: await redisStore({
          socket: {
            host: configService.get('REDIS_HOST', 'localhost'),
            port: parseInt(configService.get('REDIS_PORT', '6379')),
          },
        }),
      }),
    }),
    UsersModule,
    AuthModule,
    LiveKitModule,
    MeetingsModule,
    QaModule,
    PollsModule,
    BreakoutRoomsModule,
    SummariesModule,
    AttachmentsModule,
    MeetLogsModule,
    AiModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
