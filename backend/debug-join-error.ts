import { createConnection } from 'typeorm';
import { Meeting } from './src/modules/meetings/entities/core/meeting.entity';
import { Participant } from './src/modules/meetings/entities/core/participant.entity';
import { User } from './src/modules/users/user.entity';

async function debug() {
  const connection = await createConnection({
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    database: 'meetmind_db',
    entities: [Meeting, Participant, User],
    synchronize: false,
  });

  const meetingId = 'bf8631ab-caac-4d95-8f84-eba8a2127253';
  const meeting = await connection.getRepository(Meeting).findOne({
    where: { id: meetingId },
    relations: ['participants', 'participants.user'],
  });

  if (!meeting) {
    console.log('Meeting not found');
    return;
  }

  console.log('Meeting:', {
    id: meeting.id,
    title: meeting.title,
    status: meeting.status,
    livekitRoomName: meeting.livekitRoomName,
  });

  console.log('Participants:', meeting.participants.length);
  meeting.participants.forEach((p, i) => {
    console.log(`Participant ${i}:`, {
      userId: p.userId,
      userExists: !!p.user,
    });
  });

  await connection.close();
}

debug().catch(console.error);
