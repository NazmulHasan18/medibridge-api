import { google } from "googleapis";
import "dotenv/config";
import { config } from "../config/index.js";

const oauth2Client = new google.auth.OAuth2(
  config.googleClientId,
  config.googleClientSecret,
  config.googleRedirectUrl,
);

// set refresh token (important for server apps)
oauth2Client.setCredentials({
  refresh_token: config.googleRefreshToken,
});

const calendar = google.calendar({ version: "v3", auth: oauth2Client });

export async function createGoogleMeet(startDate: string, endDate: string, attendees: { email: string }[]) {
  const event = {
    summary: "Doctor Appointment",
    description: "Online consultation",
    start: {
      //   dateTime: "2026-06-06T10:00:00+06:00",
      dateTime: startDate,
    },
    end: {
      //   dateTime: "2026-06-06T10:30:00+06:00",
      dateTime: endDate,
    },
    conferenceData: {
      createRequest: {
        requestId: Date.now().toString(),
        conferenceSolutionKey: {
          type: "hangoutsMeet",
        },
      },
    },
    attendees,
  };

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
    conferenceDataVersion: 1,
  });

  const meetLink = res.data.conferenceData?.entryPoints?.[0]?.uri;
  console.log({
    eventId: res.data.id,
    meetLink,
  });
  return {
    eventId: res.data.id,
    meetLink,
  };
}
