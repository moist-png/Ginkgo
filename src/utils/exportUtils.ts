import { ArboristReport, Site, Tree, ChlorophyllReading, Job, DailyRisk, Quote } from '../types';
import { protectionZoneTextLines } from './protectionZone';

// Generic CSV export utility
export const exportToCSV = (data: any[], filename: string, headers: string[]) => {
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => {
      const value = getNestedValue(row, header);
      // Escape commas and quotes in CSV
      return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
        ? `"${value.replace(/"/g, '""')}"` 
        : value;
    }).join(','))
  ].join('\n');

  downloadFile(csvContent, `${filename}.csv`, 'text/csv');
};

// Generic text export utility
export const exportToText = (content: string, filename: string) => {
  downloadFile(content, `${filename}.txt`, 'text/plain');
};

// Helper function to get nested object values
const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((current, key) => current?.[key], obj) || '';
};

// Helper function to download files
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Site exports
export const exportSitesCSV = (sites: Site[]) => {
  const headers = ['name', 'description', 'address', 'clientName', 'inspector', 'status', 'createdAt', 'updatedAt'];
  const data = sites.map(site => ({
    ...site,
    createdAt: new Date(site.createdAt).toLocaleDateString(),
    updatedAt: new Date(site.updatedAt).toLocaleDateString()
  }));
  exportToCSV(data, 'sites-export', headers);
};

export const exportSiteReport = (site: Site, trees: Tree[]) => {
  const content = `
SITE REGISTRY REPORT
===================

Site Information:
- Name: ${site.name}
- Description: ${site.description}
- Address: ${site.address}
- Client: ${site.clientName}
- Created: ${new Date(site.createdAt).toLocaleDateString()}
- Last Updated: ${new Date(site.updatedAt).toLocaleDateString()}

Tree Summary:
- Total Trees: ${trees.length}
- Trees by Health:
${getTreeHealthSummary(trees)}

TREE INVENTORY
==============

${trees.map((tree, index) => `
Tree ${index + 1}: ${tree.treeNumber || `T${index + 1}`}
- Species: ${tree.species} (${tree.commonName})
- Location: ${tree.location}
- DBH: ${tree.dbh}cm
- Height: ${tree.height}m
- Health: ${tree.treeHealth}
- Structure: ${tree.structure}
`).join('\n')}

Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
  `.trim();

  exportToText(content, `site-report-${site.name.replace(/[^a-zA-Z0-9]/g, '-')}`);
};

// Tree exports
export const exportTreesCSV = (trees: Tree[]) => {
  const headers = [
    'treeNumber', 'species', 'commonName', 'location', 'dbh', 'height',
    'canopySpreadNS', 'canopySpreadEW', 'treeHealth', 'structure',
    'woundWoodDevelopment', 'extensionGrowth', 'canopyCover'
  ];

  exportToCSV(trees, 'trees-export', headers);
};

export const exportSingleTreeReport = (report: ArboristReport) => {
  const content = `
ARBORIST REPORT
===================

Report Information:
- Title: ${report.title}
- Client: ${report.clientName}
- Address: ${report.address}
- Inspector: ${report.inspector}
- Date: ${report.date}
- Status: ${report.status}

TREES IN THIS REPORT (${report.trees.length})
==============
${report.trees.map((tree, index) => `
Tree ${index + 1}${tree.treeNumber ? ` — #${tree.treeNumber}` : ''}:
- Scientific Name: ${tree.species}
- Common Name: ${tree.commonName}
- Location: ${tree.location}
- DBH: ${tree.dbh} cm
- Height: ${tree.height} m
- Canopy Spread N-S: ${tree.canopySpreadNS} m
- Canopy Spread E-W: ${tree.canopySpreadEW} m
- Extension Growth: ${tree.extensionGrowth} mm
- Canopy Cover: ${tree.canopyCover}%
- Tree Health: ${tree.treeHealth}
- Structure: ${tree.structure}
- Wound Wood Development: ${tree.woundWoodDevelopment}
${tree.protectionZone ? protectionZoneTextLines(tree).map(l => `- ${l}`).join('\n') : ''}
`).join('\n---\n')}

${report.notes.length > 0 ? `
OBSERVATIONS & NOTES
===================
${report.notes.map(note => `
${note.title} (${note.category})
${'-'.repeat(note.title.length + note.category.length + 3)}
${note.content}
Recorded: ${new Date(note.timestamp).toLocaleDateString()} at ${new Date(note.timestamp).toLocaleTimeString()}
`).join('\n')}` : ''}

${report.photos.length > 0 ? `
PHOTO DOCUMENTATION
==================
${report.photos.map((photo, index) => `
Photo ${index + 1}: ${photo.category}
Caption: ${photo.caption}
Date: ${new Date(photo.timestamp).toLocaleDateString()}
`).join('\n')}` : ''}

${report.recommendations.length > 0 ? `
RECOMMENDATIONS
==============
${report.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}` : ''}

Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
  `.trim();

  exportToText(content, `report-${report.title.replace(/[^a-zA-Z0-9]/g, '-') || 'untitled'}`);
};

// Report exports
export const exportReportsCSV = (reports: ArboristReport[]) => {
  const headers = [
    'title', 'clientName', 'address', 'inspector', 'date', 'status',
    'treeCount', 'photosCount', 'notesCount', 'recommendationsCount'
  ];

  const data = reports.map(report => ({
    ...report,
    treeCount: report.trees.length,
    photosCount: report.photos.length,
    notesCount: report.notes.length,
    recommendationsCount: report.recommendations.length
  }));

  exportToCSV(data, 'reports-export', headers);
};

// Chlorophyll exports
export const exportChlorophyllCSV = (readings: ChlorophyllReading[]) => {
  const headers = [
    'treeId', 'treeSpecies', 'treeLocation', 'treeMaturity', 'date', 
    'chlorophyllLevel', 'extensionGrowth', 'notes', 'createdAt', 'updatedAt'
  ];
  
  const data = readings.map(reading => ({
    ...reading,
    createdAt: new Date(reading.createdAt).toLocaleDateString(),
    updatedAt: new Date(reading.updatedAt).toLocaleDateString()
  }));
  
  exportToCSV(data, 'chlorophyll-readings-export', headers);
};

export const exportChlorophyllReport = (readings: ChlorophyllReading[]) => {
  // Group readings by tree
  const treeGroups = readings.reduce((acc, reading) => {
    const key = reading.treeId || `${reading.treeSpecies}-${reading.treeLocation}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(reading);
    return acc;
  }, {} as Record<string, ChlorophyllReading[]>);

  const content = `
CHLOROPHYLL MONITORING REPORT
============================

Summary:
- Total Readings: ${readings.length}
- Unique Trees: ${Object.keys(treeGroups).length}
- Date Range: ${getDateRange(readings)}
- Average Chlorophyll Level: ${getAverageChlorophyll(readings).toFixed(1)} SPAD

TREE MONITORING DATA
===================

${Object.entries(treeGroups).map(([treeKey, treeReadings]) => {
  const sortedReadings = treeReadings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latest = sortedReadings[0];
  
  return `
Tree: ${latest.treeSpecies} - ${latest.treeLocation}
Maturity: ${latest.treeMaturity}
Total Readings: ${treeReadings.length}

Reading History:
${sortedReadings.map(reading => `
  Date: ${reading.date}
  Chlorophyll: ${reading.chlorophyllLevel} SPAD (${getChlorophyllStatus(reading.chlorophyllLevel)})
  Extension Growth: ${reading.extensionGrowth}mm
  ${reading.notes ? `Notes: ${reading.notes}` : ''}
`).join('')}
`;
}).join('\n')}

CHLOROPHYLL LEVEL GUIDE
=======================
40+ SPAD: Excellent
30-39 SPAD: Good
20-29 SPAD: Fair
Below 20 SPAD: Poor

Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
  `.trim();

  exportToText(content, 'chlorophyll-monitoring-report');
};

// Risk assessment exports
export const exportRiskAssessmentsCSV = (risks: DailyRisk[]) => {
  const headers = [
    'siteAddress', 'date', 'clientName', 'clientMobile', 'firstAidLocation', 
    'nearestHospital', 'hazardCount', 'controlMeasuresCount', 'signaturesCount', 'createdAt'
  ];
  
  const data = risks.map(risk => ({
    ...risk,
    hazardCount: Object.values(risk.hazards).filter(Boolean).length,
    controlMeasuresCount: risk.hazardControls.length,
    signaturesCount: risk.signatures.length,
    createdAt: new Date(risk.createdAt).toLocaleDateString()
  }));
  
  exportToCSV(data, 'risk-assessments-export', headers);
};

export const exportSingleRiskAssessment = (risk: DailyRisk) => {
  const identifiedHazards = Object.entries(risk.hazards)
    .filter(([_, value]) => value)
    .map(([key, _]) => formatHazardName(key));

  const content = `
DAILY RISK ASSESSMENT
====================

Site Information:
- Address: ${risk.siteAddress}
- Date: ${risk.date}
- Client: ${risk.clientName}
- Client Mobile: ${risk.clientMobile}
- First Aid Location: ${risk.firstAidLocation}
- Nearest Hospital: ${risk.nearestHospital}

IDENTIFIED HAZARDS
=================
${identifiedHazards.length > 0 ? identifiedHazards.map(hazard => `• ${hazard}`).join('\n') : 'No hazards identified'}

HAZARD CONTROLS
===============
${risk.hazardControls.length > 0 ? risk.hazardControls.map((control, index) => `
${index + 1}. HAZARD: ${control.hazardIdentified}
   CONTROL MEASURES: ${control.controlMeasures}
`).join('\n') : 'No specific control measures documented'}

SIGNATURES
==========
${risk.signatures.length > 0 ? risk.signatures.map(sig => `
Name: ${sig.name}
Signed: ${new Date(sig.timestamp).toLocaleDateString()} at ${new Date(sig.timestamp).toLocaleTimeString()}
`).join('\n') : 'No signatures recorded'}

Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
  `.trim();

  exportToText(content, `risk-assessment-${risk.date}-${risk.siteAddress.replace(/[^a-zA-Z0-9]/g, '-')}`);
};

// Job exports
export const exportJobsCSV = (jobs: Job[]) => {
  const headers = [
    'title', 'clientName', 'location', 'date', 'startTime', 'endTime', 
    'timeSpent', 'workCompleted', 'workToComplete', 'status', 'jobType',
    'hourlyRate', 'totalCost', 'createdAt'
  ];
  
  const data = jobs.map(job => ({
    ...job,
    timeSpent: formatTime(job.timeSpent),
    createdAt: new Date(job.createdAt).toLocaleDateString()
  }));
  
  exportToCSV(data, 'jobs-export', headers);
};

export const exportSingleJob = (job: Job) => {
  const content = `
JOB REPORT
==========

Job Information:
- Title: ${job.title}
- Client: ${job.clientName}
- Location: ${job.location}
- Date: ${job.date}
- Status: ${job.status}
- Job Type: ${job.jobType}

Time Tracking:
- Start Time: ${job.startTime || 'Not recorded'}
- End Time: ${job.endTime || 'Not recorded'}
- Total Time: ${formatTime(job.timeSpent)}

Billing Information:
- Hourly Rate: $${(job.hourlyRate || 0).toFixed(2)}
- Total Cost: $${(job.totalCost || 0).toFixed(2)}

WORK COMPLETED
==============
${job.workCompleted || 'No work details recorded'}

WORK TO COMPLETE
================
${job.workToComplete || 'No remaining work noted'}

NOTES
=====
${job.notes || 'No additional notes'}

Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
  `.trim();

  exportToText(content, `job-report-${job.title.replace(/[^a-zA-Z0-9]/g, '-')}`);
};

// Quote exports
export const exportQuotesCSV = (quotes: Quote[]) => {
  const headers = [
    'clientName', 'address', 'mobile', 'siteContact', 'scheduledDate', 
    'scheduledTime', 'jobDescriptionItems', 'additionalEquipment', 
    'accessParking', 'status', 'archived', 'createdAt'
  ];
  
  const data = quotes.map(quote => ({
    ...quote,
    jobDescriptionItems: quote.jobDescription.length,
    createdAt: new Date(quote.createdAt).toLocaleDateString()
  }));
  
  exportToCSV(data, 'quotes-export', headers);
};

export const exportSingleQuote = (quote: Quote) => {
  const content = `
QUOTE
=====

Client Information:
- Name: ${quote.clientName}
- Address: ${quote.address}
- Mobile: ${quote.mobile}
- Site Contact: ${quote.siteContact || 'Same as client'}

Scheduled Time:
- Date: ${new Date(quote.scheduledDate).toLocaleDateString()}
- Time: ${quote.scheduledTime}

JOB DESCRIPTION
===============
${quote.jobDescription.map((item, index) => `${index + 1}. ${item.description}`).join('\n')}

ADDITIONAL EQUIPMENT
===================
${quote.additionalEquipment || 'No additional equipment specified'}

ACCESS AND PARKING
==================
${quote.accessParking || 'No special access requirements noted'}

Quote Status: ${quote.status.toUpperCase()}
${quote.archived ? 'ARCHIVED' : ''}

Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
  `.trim();

  exportToText(content, `quote-${quote.clientName.replace(/[^a-zA-Z0-9]/g, '-')}-${quote.scheduledDate}`);
};

// Helper functions
const getTreeHealthSummary = (trees: Tree[]): string => {
  const healthCounts = trees.reduce((acc, tree) => {
    acc[tree.treeHealth] = (acc[tree.treeHealth] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return Object.entries(healthCounts)
    .map(([health, count]) => `  - ${health}: ${count}`)
    .join('\n');
};

const getDateRange = (readings: ChlorophyllReading[]): string => {
  if (readings.length === 0) return 'No readings';
  const dates = readings.map(r => new Date(r.date).getTime()).sort();
  const earliest = new Date(dates[0]).toLocaleDateString();
  const latest = new Date(dates[dates.length - 1]).toLocaleDateString();
  return earliest === latest ? earliest : `${earliest} to ${latest}`;
};

const getAverageChlorophyll = (readings: ChlorophyllReading[]): number => {
  if (readings.length === 0) return 0;
  const sum = readings.reduce((acc, reading) => acc + reading.chlorophyllLevel, 0);
  return sum / readings.length;
};

const getChlorophyllStatus = (level: number): string => {
  if (level >= 40) return 'Excellent';
  if (level >= 30) return 'Good';
  if (level >= 20) return 'Fair';
  return 'Poor';
};

const formatHazardName = (key: string): string => {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
};

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};