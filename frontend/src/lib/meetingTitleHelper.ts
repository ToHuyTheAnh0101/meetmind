/**
 * Generate default meeting title with format:
 * "Meeting HH:MM DD/MM/YYYY - Organizer Name"
 * or "Cuộc họp HH:MM DD/MM/YYYY - Tên tổ chức" for Vietnamese
 */
export const generateDefaultMeetingTitle = (
  startTime: Date | string,
  organizerName?: string,
  language: string = 'en'
): string => {
  const date = typeof startTime === 'string' ? new Date(startTime) : startTime
  
  // Format time as HH:MM (24-hour format)
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const timeStr = `${hours}:${minutes}`
  
  // Format date as DD/MM/YYYY
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  const dateStr = `${day}/${month}/${year}`
  
  // Get label based on language
  const meetingLabel = language === 'vi' ? 'Cuộc họp' : 'Meeting'
  
  let title = `${meetingLabel} ${timeStr} ${dateStr}`
  
  if (organizerName) {
    title += ` - ${organizerName}`
  }
  
  return title
}

/**
 * Get display name for organizer (firstName + lastName)
 */
export const getOrganizerDisplayName = (firstName?: string, lastName?: string): string => {
  if (!firstName && !lastName) return ''
  if (firstName && lastName) return `${firstName} ${lastName}`
  return firstName || lastName || ''
}
