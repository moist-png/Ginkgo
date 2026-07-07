import { Quote, EmailQuoteRequest, EmailAttachment } from '../types';
import { createEmptyQuote } from './storage';

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  folder: string;
}

// Extract quote information from email content
export const parseEmailForQuote = (emailRequest: EmailQuoteRequest): Quote => {
  const quote = createEmptyQuote();
  
  // Extract client information from email
  const { clientInfo, jobDetails, schedulingInfo } = extractEmailContent(emailRequest);
  
  // Populate quote with extracted information
  quote.clientName = clientInfo.name || extractNameFromEmail(emailRequest.from);
  quote.address = clientInfo.address || '';
  quote.mobile = clientInfo.phone || '';
  quote.siteContact = clientInfo.contact || '';
  
  // Set scheduling information
  if (schedulingInfo.date) {
    quote.scheduledDate = schedulingInfo.date;
  }
  if (schedulingInfo.time) {
    quote.scheduledTime = schedulingInfo.time;
  }
  
  // Set job description
  if (jobDetails.length > 0) {
    quote.jobDescription = jobDetails.map(detail => ({
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      description: detail
    }));
  } else {
    // Use subject as fallback
    quote.jobDescription = [{
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      description: emailRequest.subject
    }];
  }
  
  // Mark as new quote from email
  quote.status = 'new';
  
  return quote;
};

// Extract structured information from email content
const extractEmailContent = (emailRequest: EmailQuoteRequest) => {
  const content = `${emailRequest.subject}\n\n${emailRequest.body}`;
  
  return {
    clientInfo: extractClientInfo(content, emailRequest.from),
    jobDetails: extractJobDetails(content),
    schedulingInfo: extractSchedulingInfo(content)
  };
};

// Extract client information from email content
const extractClientInfo = (content: string, fromEmail: string) => {
  const info = {
    name: '',
    address: '',
    phone: '',
    contact: ''
  };
  
  // Extract name from various patterns
  const namePatterns = [
    /(?:my name is|i am|i'm)\s+([a-zA-Z\s]+)/i,
    /(?:from|regards|sincerely),?\s*([a-zA-Z\s]+)/i,
    /(?:contact|client):\s*([a-zA-Z\s]+)/i
  ];
  
  for (const pattern of namePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      info.name = match[1].trim();
      break;
    }
  }
  
  // If no name found, extract from email address
  if (!info.name) {
    info.name = extractNameFromEmail(fromEmail);
  }
  
  // Extract address
  const addressPatterns = [
    /(?:address|location|property):\s*([^\n]+)/i,
    /(?:at|located at)\s+([0-9]+[^,\n]+)/i,
    /([0-9]+\s+[a-zA-Z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|court|ct|place|pl)[^,\n]*)/i
  ];
  
  for (const pattern of addressPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      info.address = match[1].trim();
      break;
    }
  }
  
  // Extract phone number
  const phonePatterns = [
    /(?:phone|mobile|cell|contact):\s*([+\d\s\-\(\)]+)/i,
    /(?:call|reach)\s+(?:me\s+)?(?:at|on)\s*([+\d\s\-\(\)]+)/i,
    /(\+?[0-9\s\-\(\)]{10,})/
  ];
  
  for (const pattern of phonePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const phone = match[1].trim();
      // Validate phone number (basic check)
      if (phone.replace(/[^\d]/g, '').length >= 10) {
        info.phone = phone;
        break;
      }
    }
  }
  
  return info;
};

// Extract job details from email content
const extractJobDetails = (content: string): string[] => {
  const details: string[] = [];
  
  // Common service keywords
  const serviceKeywords = [
    'tree removal', 'tree cutting', 'tree pruning', 'tree trimming',
    'stump grinding', 'stump removal', 'tree assessment', 'tree inspection',
    'tree health', 'tree care', 'arborist', 'crown reduction', 'deadwood',
    'tree surgery', 'tree maintenance', 'hedge trimming', 'palm cleaning'
  ];
  
  // Look for service mentions
  const lowerContent = content.toLowerCase();
  for (const keyword of serviceKeywords) {
    if (lowerContent.includes(keyword)) {
      // Try to extract the full sentence containing the keyword
      const sentences = content.split(/[.!?]+/);
      for (const sentence of sentences) {
        if (sentence.toLowerCase().includes(keyword)) {
          details.push(sentence.trim());
          break;
        }
      }
    }
  }
  
  // Look for numbered lists or bullet points
  const listPatterns = [
    /(?:^|\n)\s*[-*•]\s*([^\n]+)/gm,
    /(?:^|\n)\s*\d+[.)]\s*([^\n]+)/gm
  ];
  
  for (const pattern of listPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const item = match[1].trim();
      if (item.length > 10 && !details.includes(item)) {
        details.push(item);
      }
    }
  }
  
  // If no specific details found, look for work-related sentences
  if (details.length === 0) {
    const workKeywords = ['need', 'require', 'want', 'looking for', 'quote for', 'estimate for'];
    const sentences = content.split(/[.!?]+/);
    
    for (const sentence of sentences) {
      const lowerSentence = sentence.toLowerCase();
      if (workKeywords.some(keyword => lowerSentence.includes(keyword)) && sentence.trim().length > 20) {
        details.push(sentence.trim());
      }
    }
  }
  
  return details.slice(0, 5); // Limit to 5 items
};

// Extract scheduling information from email content
const extractSchedulingInfo = (content: string) => {
  const info = {
    date: '',
    time: ''
  };
  
  // Date patterns
  const datePatterns = [
    /(?:on|for|by)\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
    /(?:on|for|by)\s+(\d{1,2}(?:st|nd|rd|th)?\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i,
    /(?:on|for|by)\s+((?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)[^,\n]*)/i
  ];
  
  for (const pattern of datePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      try {
        const parsedDate = new Date(match[1]);
        if (!isNaN(parsedDate.getTime())) {
          info.date = parsedDate.toISOString().split('T')[0];
          break;
        }
      } catch (e) {
        // Continue to next pattern
      }
    }
  }
  
  // Time patterns
  const timePatterns = [
    /(?:at|around|about)\s+(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
    /(?:at|around|about)\s+(\d{1,2}\s*(?:am|pm))/i
  ];
  
  for (const pattern of timePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const timeStr = match[1].trim();
      // Convert to 24-hour format
      info.time = convertTo24Hour(timeStr);
      break;
    }
  }
  
  return info;
};

// Extract name from email address
const extractNameFromEmail = (email: string): string => {
  const localPart = email.split('@')[0];
  
  // Handle common email formats
  const name = localPart
    .replace(/[._-]/g, ' ')
    .replace(/\d+/g, '')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  return name || 'Unknown Client';
};

// Convert time string to 24-hour format
const convertTo24Hour = (timeStr: string): string => {
  const time = timeStr.toLowerCase().trim();
  
  if (time.includes(':')) {
    const [hourMin, period] = time.split(/\s*(am|pm)/);
    const [hour, minute] = hourMin.split(':');
    let hour24 = parseInt(hour);
    
    if (period === 'pm' && hour24 !== 12) {
      hour24 += 12;
    } else if (period === 'am' && hour24 === 12) {
      hour24 = 0;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minute.padStart(2, '0')}`;
  } else {
    // Handle formats like "2pm", "10am"
    const match = time.match(/(\d+)\s*(am|pm)/);
    if (match) {
      let hour = parseInt(match[1]);
      const period = match[2];
      
      if (period === 'pm' && hour !== 12) {
        hour += 12;
      } else if (period === 'am' && hour === 12) {
        hour = 0;
      }
      
      return `${hour.toString().padStart(2, '0')}:00`;
    }
  }
  
  return '09:00'; // Default time
};

// Process email attachments for additional information
export const processEmailAttachments = (attachments: EmailAttachment[]): string[] => {
  const additionalInfo: string[] = [];
  
  for (const attachment of attachments) {
    // Process text attachments
    if (attachment.contentType.startsWith('text/')) {
      try {
        const content = atob(attachment.content); // Decode base64
        const extracted = extractJobDetails(content);
        additionalInfo.push(...extracted);
      } catch (e) {
        console.warn('Failed to process text attachment:', attachment.filename);
      }
    }
    
    // Note image attachments
    if (attachment.contentType.startsWith('image/')) {
      additionalInfo.push(`Image attachment: ${attachment.filename}`);
    }
    
    // Note document attachments
    if (attachment.contentType.includes('pdf') || 
        attachment.contentType.includes('document') ||
        attachment.contentType.includes('word')) {
      additionalInfo.push(`Document attachment: ${attachment.filename}`);
    }
  }
  
  return additionalInfo;
};

// Validate if email looks like a quote request
export const isQuoteRequest = (emailRequest: EmailQuoteRequest): boolean => {
  const content = `${emailRequest.subject} ${emailRequest.body}`.toLowerCase();
  
  const quoteKeywords = [
    'quote', 'estimate', 'price', 'cost', 'tree', 'arborist', 'removal',
    'pruning', 'trimming', 'cutting', 'stump', 'assessment', 'inspection'
  ];
  
  const hasQuoteKeywords = quoteKeywords.some(keyword => content.includes(keyword));
  
  // Check for contact information (indicates serious inquiry)
  const hasContactInfo = /(?:phone|mobile|address|location)/.test(content) ||
                        /\d{10,}/.test(content) || // Phone number
                        /\d+\s+[a-zA-Z\s]+(?:street|st|avenue|ave|road|rd)/.test(content); // Address
  
  return hasQuoteKeywords && (hasContactInfo || emailRequest.attachments.length > 0);
};

// Create email quote request from raw email data
export const createEmailQuoteRequest = (
  from: string,
  subject: string,
  body: string,
  attachments: EmailAttachment[] = []
): EmailQuoteRequest => {
  return {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9),
    from,
    subject,
    body,
    attachments,
    receivedAt: Date.now(),
    processed: false
  };
};