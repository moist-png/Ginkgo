import { ArboristReport, Site, ChlorophyllReading, Job, DailyRisk, Quote } from '../types';

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

export const exportSiteReport = (site: Site, trees: ArboristReport[]) => {
  const content = `
SITE REGISTRY REPORT
===================

Site Information:
- Name: ${site.name}
- Description: ${site.description}
- Address: ${site.address}
- Client: ${site.clientName}
- Inspector: ${site.inspector}
- Status: ${site.status}
- Created: ${new Date(site.createdAt).toLocaleDateString()}
- Last Updated: ${new Date(site.updatedAt).toLocaleDateString()}

Tree Summary:
- Total Trees: ${trees.length}
- Trees by Health:
${getTreeHealthSummary(trees)}

TREE INVENTORY
==============

${trees.map((tree, index) => `
Tree ${index + 1}: ${tree.treeData.treeNumber || `T${index + 1}`}
- Species: ${tree.treeData.species} (${tree.treeData.commonName})
- Location: ${tree.treeData.location}
- DBH: ${tree.treeData.dbh}cm
- Height: ${tree.treeData.height}m
- Health: ${tree.treeData.treeHealth}
- Structure: ${tree.treeData.structure}
- Status: ${tree.status}
- Photos: ${tree.photos.length}
- Notes: ${tree.notes.length}
${tree.notes.length > 0 ? `
  Key Observations:
${tree.notes.map(note => `  - ${note.title}: ${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}`).join('\n')}` : ''}
`).join('\n')}

Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
  `.trim();

  exportToText(content, `site-report-${site.name.replace(/[^a-zA-Z0-9]/g, '-')}`);
};

// Tree exports
export const exportTreesCSV = (trees: ArboristReport[]) => {
  const headers = [
    'title', 'treeData.treeNumber', 'treeData.species', 'treeData.commonName', 
    'treeData.location', 'treeData.dbh', 'treeData.height', 'treeData.canopySpreadNS',
    'treeData.canopySpreadEW', 'treeData.treeHealth', 'treeData.structure', 
    'treeData.woundWoodDevelopment', 'treeData.extensionGrowth', 'treeData.canopyCover',
    'clientName', 'address', 'inspector', 'date', 'status', 'photosCount', 'notesCount'
  ];
  
  const data = trees.map(tree => ({
    ...tree,
    photosCount: tree.photos.length,
    notesCount: tree.notes.length
  }));
  
  exportToCSV(data, 'trees-export', headers);
};

export const exportSingleTreeReport = (tree: ArboristReport) => {
  const content = `
ARBORIST TREE REPORT
===================

Report Information:
- Title: ${tree.title}
- Tree Number: ${tree.treeData.treeNumber}
- Client: ${tree.clientName}
- Address: ${tree.address}
- Inspector: ${tree.inspector}
- Date: ${tree.date}
- Status: ${tree.status}

Tree Details:
- Scientific Name: ${tree.treeData.species}
- Common Name: ${tree.treeData.commonName}
- Location: ${tree.treeData.location}
- DBH: ${tree.treeData.dbh} cm
- Height: ${tree.treeData.height} m
- Canopy Spread N-S: ${tree.treeData.canopySpreadNS} m
- Canopy Spread E-W: ${tree.treeData.canopySpreadEW} m
- Extension Growth: ${tree.treeData.extensionGrowth} mm
- Canopy Cover: ${tree.treeData.canopyCover}%

Assessment:
- Tree Health: ${tree.treeData.treeHealth}
- Structure: ${tree.treeData.structure}
- Wound Wood Development: ${tree.treeData.woundWoodDevelopment}

${tree.notes.length > 0 ? `
OBSERVATIONS & NOTES
===================
${tree.notes.map(note => `
${note.title} (${note.category})
${'-'.repeat(note.title.length + note.category.length + 3)}
${note.content}
Recorded: ${new Date(note.timestamp).toLocaleDateString()} at ${new Date(note.timestamp).toLocaleTimeString()}
`).join('\n')}` : ''}

${tree.photos.length > 0 ? `
PHOTO DOCUMENTATION
==================
${tree.photos.map((photo, index) => `
Photo ${index + 1}: ${photo.category}
Caption: ${photo.caption}
Date: ${new Date(photo.timestamp).toLocaleDateString()}
`).join('\n')}` : ''}

${tree.recommendations.length > 0 ? `
RECOMMENDATIONS
==============
${tree.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}` : ''}

Generated on: ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
  `.trim();

  exportToText(content, `tree-report-${tree.treeData.treeNumber || tree.title.replace(/[^a-zA-Z0-9]/g, '-')}`);
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
const getTreeHealthSummary = (trees: ArboristReport[]): string => {
  const healthCounts = trees.reduce((acc, tree) => {
    acc[tree.treeData.treeHealth] = (acc[tree.treeData.treeHealth] || 0) + 1;
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