const ical = require('ical-generator');
const { google } = require('googleapis');
const axios = require('axios');

class CalendarUtils {
  constructor() {
    this.calendar = null;
    this.initializeGoogleCalendar();
  }

  initializeGoogleCalendar() {
    if (process.env.GOOGLE_CALENDAR_CLIENT_ID && process.env.GOOGLE_CALENDAR_CLIENT_SECRET) {
      this.calendar = google.calendar({
        version: 'v3',
        auth: new google.auth.OAuth2(
          process.env.GOOGLE_CALENDAR_CLIENT_ID,
          process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
          process.env.GOOGLE_CALENDAR_REDIRECT_URI
        )
      });
    }
  }

  // Generate iCal event for calendar integration
  generateICalEvent(meetingDetails, participants) {
    const cal = ical({
      name: 'Nexus Meeting',
      timezone: 'UTC'
    });

    const event = cal.createEvent({
      start: meetingDetails.scheduledFor,
      end: new Date(meetingDetails.scheduledFor.getTime() + meetingDetails.duration * 60000),
      summary: `Meeting: ${meetingDetails.agenda || 'Nexus Collaboration Meeting'}`,
      description: meetingDetails.agenda || '',
      location: meetingDetails.location || meetingDetails.meetingLink || '',
      url: meetingDetails.meetingLink || '',
      organizer: {
        name: 'Nexus Platform',
        email: 'noreply@nexus.com'
      },
      attendees: participants.map(p => ({
        name: p.name,
        email: p.email
      }))
    });

    return cal.toString();
  }

  // Create Google Calendar event (requires OAuth setup)
  async createGoogleCalendarEvent(accessToken, meetingDetails, participants) {
    if (!this.calendar) {
      throw new Error('Google Calendar not configured');
    }

    this.calendar.auth.setCredentials({ access_token: accessToken });

    const event = {
      summary: `Meeting: ${meetingDetails.agenda || 'Nexus Collaboration Meeting'}`,
      description: meetingDetails.agenda || '',
      location: meetingDetails.location || meetingDetails.meetingLink || '',
      start: {
        dateTime: meetingDetails.scheduledFor.toISOString(),
        timeZone: 'UTC',
      },
      end: {
        dateTime: new Date(meetingDetails.scheduledFor.getTime() + meetingDetails.duration * 60000).toISOString(),
        timeZone: 'UTC',
      },
      attendees: participants.map(p => ({
        email: p.email,
        displayName: p.name
      })),
      conferenceData: meetingDetails.meetingLink ? {
        createRequest: {
          requestId: `nexus-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet'
          }
        }
      } : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 },
          { method: 'popup', minutes: 30 },
        ],
      },
    };

    const response = await this.calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 1,
      sendUpdates: 'all'
    });

    return response.data;
  }
}

module.exports = new CalendarUtils();