import { Quote, LineItem } from '../types';
import { createEmptyQuote } from './storage';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

export interface ICSEvent {
  summary: string;
  description?: string;
  dtstart: string;
  dtend: string;
  location?: string;
  organizer?: string;
  attendee?: string[];
}

// Parse ICS file content
export const parseICSFile = (icsContent: string): ICSEvent[] => {
  const events: ICSEvent[] = [];
  const lines = icsContent.split('\n').map(line => line.trim());
  
  let currentEvent: Partial<ICSEvent> = {};
  let inEvent = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEvent = {};
    } else if (line === 'END:VEVENT') {
      if (currentEvent.summary && currentEvent.dtstart) {
        events.push(currentEvent as ICSEvent);
      }
      inEvent = false;
      currentEvent = {};
    } else if (inEvent) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':');
      
      switch (key.split(';')[0]) {
        case 'SUMMARY':
          currentEvent.summary = value;
          break;
        case 'DESCRIPTION':
          currentEvent.description = value.replace(/\\n/g, '\n');
          break;
        case 'DTSTART':
          currentEvent.dtstart = value;
          break;
        case 'DTEND':
          currentEvent.dtend = value;
          break;
        case 'LOCATION':
          currentEvent.location = value;
          break;
        case 'ORGANIZER':
          currentEvent.organizer = value.replace('mailto:', '');
          break;
        case 'ATTENDEE':
          if (!currentEvent.attendee) currentEvent.attendee = [];
          currentEvent.attendee.push(value.replace('mailto:', ''));
          break;
      }
    }
  }
  
  return events;
};

// Convert ICS datetime to JavaScript Date
const parseICSDateTime = (icsDateTime: string): Date => {
  // Handle different ICS datetime formats
  if (icsDateTime.includes('T')) {
    // DateTime format: 20231215T140000Z or 20231215T140000
    const cleanDateTime = icsDateTime.replace(/[TZ]/g, '');
    const year = parseInt(cleanDateTime.substring(0, 4));
    const month = parseInt(cleanDateTime.substring(4, 6)) - 1; // Month is 0-indexed
    const day = parseInt(cleanDateTime.substring(6, 8));
    const hour = parseInt(cleanDateTime.substring(8, 10)) || 0;
    const minute = parseInt(cleanDateTime.substring(10, 12)) || 0;
    const second = parseInt(cleanDateTime.substring(12, 14)) || 0;
    
    return new Date(year, month, day, hour, minute, second);
  } else {
    // Date only format: 20231215
    const year = parseInt(icsDateTime.substring(0, 4));
    const month = parseInt(icsDateTime.substring(4, 6)) - 1;
    const day = parseInt(icsDateTime.substring(6, 8));
    
    return new Date(year, month, day);
  }
};

// Extract client information from event
const extractClientInfo = (event: ICSEvent): { clientName: string; mobile: string; address: string } => {
  let clientName = '';
  let mobile = '';
  let address = event.location || '';
  
  // Try to extract client name from summary
  const summaryMatch = event.summary.match(/(?:with|for|client:?)\s+([^-,\n]+)/i);
  if (summaryMatch) {
    clientName = summaryMatch[1].trim();
  }
  
  // Try to extract phone number from description
  if (event.description) {
    const phoneMatch = event.description.match(/(?:phone|mobile|tel|call):?\s*([+\d\s\-\(\)]+)/i);
    if (phoneMatch) {
      mobile = phoneMatch[1].trim();
    }
    
    // Try to extract address from description if not in location
    if (!address) {
      const addressMatch = event.description.match(/(?:address|location):?\s*([^\n]+)/i);
      if (addressMatch) {
        address = addressMatch[1].trim();
      }
    }
  }
  
  // Try to extract from organizer or attendee emails
  if (!clientName && event.organizer) {
    const emailName = event.organizer.split('@')[0].replace(/[._]/g, ' ');
    clientName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
  }
  
  return { clientName, mobile, address };
};

// Extract job description from event
const extractJobDescription = (event: ICSEvent): LineItem[] => {
  const descriptions: string[] = [];
  
  // Use summary as primary description
  descriptions.push(event.summary);
  
  // Extract additional details from description
  if (event.description) {
    const lines = event.description.split('\n').filter(line => line.trim());
    
    // Look for service-related keywords
    const serviceKeywords = ['service', 'work', 'job', 'task', 'assessment', 'inspection', 'pruning', 'removal'];
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      if (serviceKeywords.some(keyword => lowerLine.includes(keyword)) && 
          !descriptions.some(desc => desc.toLowerCase().includes(lowerLine))) {
        descriptions.push(line.trim());
      }
    }
  }
  
  // Convert to LineItems
  return descriptions.map(desc => ({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    description: desc
  }));
};

// Convert calendar event to quote
export const convertEventToQuote = (event: ICSEvent): Quote => {
  const startDate = parseICSDateTime(event.dtstart);
  const { clientName, mobile, address } = extractClientInfo(event);
  const jobDescription = extractJobDescription(event);
  
  const quote = createEmptyQuote();
  
  return {
    ...quote,
    clientName,
    address,
    mobile,
    siteContact: '',
    scheduledDate: startDate.toISOString().split('T')[0],
    scheduledTime: startDate.toTimeString().substring(0, 5),
    jobDescription,
    additionalEquipment: '',
    accessParking: '',
    status: 'new'
  };
};

// Import quotes from ICS file
export const importQuotesFromICS = async (file: File): Promise<Quote[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const icsContent = e.target?.result as string;
        const events = parseICSFile(icsContent);
        
        // Filter events that look like appointments/quotes
        const appointmentKeywords = ['appointment', 'quote', 'assessment', 'inspection', 'consultation', 'visit', 'service'];
        
        const relevantEvents = events.filter(event => {
          const summary = event.summary.toLowerCase();
          return appointmentKeywords.some(keyword => summary.includes(keyword)) ||
                 event.location || // Has a location
                 (event.description && event.description.length > 10); // Has substantial description
        });
        
        const quotes = relevantEvents.map(convertEventToQuote);
        resolve(quotes);
      } catch (error) {
        reject(new Error(`Failed to parse calendar file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read calendar file'));
    };
    
    reader.readAsText(file);
  });
};

// Google Calendar integration (requires OAuth)
export class GoogleCalendarIntegration {
  private clientId: string;
  private apiKey: string;
  private accessToken?: string;

  constructor(clientId: string, apiKey: string) {
    this.clientId = clientId;
    this.apiKey = apiKey;
  }

  // Initialize Google Calendar API
  async initialize(): Promise<void> {
    // This would require loading the Google Calendar API
    // For now, we'll focus on ICS file import
    throw new Error('Google Calendar API integration requires additional setup');
  }

  // Get calendar events
  async getEvents(calendarId: string = 'primary', timeMin?: string, timeMax?: string): Promise<CalendarEvent[]> {
    if (!this.accessToken) {
      throw new Error('Not authenticated with Google Calendar');
    }

    const params = new URLSearchParams({
      key: this.apiKey,
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      singleEvents: 'true',
      orderBy: 'startTime'
    });

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch calendar events: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  }
}

// Export calendar events to ICS format
export const exportQuotesToICS = (quotes: Quote[]): string => {
  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Arborist App//Quote Calendar//EN',
    'CALSCALE:GREGORIAN'
  ];

  quotes.forEach(quote => {
    const startDateTime = new Date(`${quote.scheduledDate}T${quote.scheduledTime}`);
    const endDateTime = new Date(startDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours duration
    
    const formatICSDateTime = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:quote-${quote.id}@arborist-app.com`,
      `DTSTART:${formatICSDateTime(startDateTime)}`,
      `DTEND:${formatICSDateTime(endDateTime)}`,
      `SUMMARY:Quote - ${quote.clientName}`,
      `DESCRIPTION:${quote.jobDescription.map(item => item.description).join('\\n')}`,
      `LOCATION:${quote.address}`,
      `STATUS:${quote.status.toUpperCase()}`,
      'END:VEVENT'
    );
  });

  icsLines.push('END:VCALENDAR');
  
  return icsLines.join('\r\n');
};