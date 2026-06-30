import { MeetingPermission } from '@/types/api';

/**
 * Checks if a user is the organizer of a meeting.
 */
export function checkIsOrganizer(
  userId?: string | null,
  organizerId?: string | null
): boolean {
  if (!userId || !organizerId) return false;
  return userId === organizerId;
}

/**
 * Checks if a participant has a specific permission in a meeting.
 * Also returns true if the participant is the organizer (since they have all permissions).
 */
export function hasMeetingPermission(
  userId: string,
  organizerId: string,
  participantPermissions?: MeetingPermission[] | null,
  requiredPermission?: MeetingPermission
): boolean {
  if (userId === organizerId) return true;
  if (!participantPermissions) return false;
  
  // Co-hosts automatically have co-host privileges
  if (participantPermissions.includes(MeetingPermission.CO_HOST)) {
    return true;
  }
  
  if (requiredPermission) {
    return participantPermissions.includes(requiredPermission);
  }
  
  return false;
}
