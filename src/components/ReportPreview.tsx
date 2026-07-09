import React from 'react';
import { ArboristReport, Site } from '../types';
import { Download, Calendar, User, MapPin, TreePine, Camera, FileText } from 'lucide-react';
import { protectionZoneTextLines } from '../utils/protectionZone';

interface ReportPreviewProps {
  report: ArboristReport;
  site?: Site;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({ report, site }) => {
  const handleExport = () => {
    const reportContent = generateReportContent(report);
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${report.title || 'untitled'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateReportContent = (report: ArboristReport) => {
    return `
ARBORIST REPORT

Report Title: ${report.title}
Site: ${site?.name || ''}
Client: ${report.clientName}
Property Address: ${report.address}
Inspector: ${report.inspector}
Inspection Date: ${report.date}

TREES IN THIS REPORT (${report.trees.length})
================
${report.trees.map(tree => `
Tree Number: ${tree.treeNumber}
Scientific Name: ${tree.species}
Common Name: ${tree.commonName}
Location: ${tree.location}
DBH: ${tree.dbh} cm
Height: ${tree.height} m
Canopy Spread N-S: ${tree.canopySpreadNS} m
Canopy Spread E-W: ${tree.canopySpreadEW} m
Tree Health: ${tree.treeHealth}
Structure: ${tree.structure}
Wound Wood Development: ${tree.woundWoodDevelopment}
Extension Growth: ${tree.extensionGrowth} mm
Canopy Cover: ${tree.canopyCover}%
${tree.protectionZone ? `${protectionZoneTextLines(tree).join('\n')}` : ''}
`).join('\n---\n')}

OBSERVATIONS & NOTES
===================
${report.notes.map(note => `
${note.title} (${note.category})
${note.content}
`).join('\n')}

PHOTOS
======
${report.photos.map(photo => `
${photo.category}: ${photo.caption}
`).join('\n')}

Generated on: ${new Date().toLocaleDateString()}
    `.trim();
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'Excellent': return 'text-[var(--accent)]';
      case 'Good': return 'text-[var(--accent)]';
      case 'Fair': return 'text-[var(--text-secondary)]';
      case 'Poor': return 'text-[var(--text-secondary)]';
      case 'Critical': return 'text-[var(--danger)]';
      default: return 'text-[var(--text-muted)]';
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold">Report Preview</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-[var(--ink)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--accent)] transition-colors"
        >
          <Download size={20} />
          Export Report
        </button>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-[var(--ink)] text-[var(--cream)] p-6">
          <h1 className="text-2xl font-bold mb-2">ARBORIST REPORT</h1>
          <h2 className="text-xl">{report.title || 'Untitled Report'}</h2>
          {site && <p className="text-sm opacity-80 mt-1">{site.name}</p>}
        </div>

        {/* Report Information */}
        <div className="p-6 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <User className="text-[var(--text-muted)]" size={20} />
              <div>
                <span className="font-medium">Client:</span> {report.clientName}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="text-[var(--text-muted)]" size={20} />
              <div>
                <span className="font-medium">Date:</span> {report.date}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="text-[var(--text-muted)]" size={20} />
              <div>
                <span className="font-medium">Address:</span> {report.address}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="text-[var(--text-muted)]" size={20} />
              <div>
                <span className="font-medium">Inspector:</span> {report.inspector}
              </div>
            </div>
          </div>
        </div>

        {/* Tree Information */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-2 mb-4">
            <TreePine className="text-[var(--accent)]" size={24} />
            <h3 className="text-lg font-semibold">Trees in this Report ({report.trees.length})</h3>
          </div>

          <div className="space-y-6">
            {report.trees.map((tree, idx) => (
              <div key={tree.id} className={idx > 0 ? 'pt-6 border-t' : ''}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {tree.treeNumber && (
                    <div>
                      <span className="font-medium">Tree Number:</span> {tree.treeNumber}
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Scientific Name:</span> {tree.species}
                  </div>
                  <div>
                    <span className="font-medium">Common Name:</span> {tree.commonName}
                  </div>
                  <div>
                    <span className="font-medium">Location:</span> {tree.location}
                  </div>
                  <div>
                    <span className="font-medium">DBH:</span> {tree.dbh} cm
                  </div>
                  <div>
                    <span className="font-medium">Height:</span> {tree.height} m
                  </div>
                  <div>
                    <span className="font-medium">Canopy Spread N-S:</span> {tree.canopySpreadNS} m
                  </div>
                  <div>
                    <span className="font-medium">Canopy Spread E-W:</span> {tree.canopySpreadEW} m
                  </div>
                  <div>
                    <span className="font-medium">Extension Growth:</span> {tree.extensionGrowth} mm
                  </div>
                  <div>
                    <span className="font-medium">Canopy Cover:</span> {tree.canopyCover}%
                  </div>
                  <div>
                    <span className="font-medium">Tree Health:</span>
                    <span className={`ml-2 font-semibold ${getConditionColor(tree.treeHealth)}`}>
                      {tree.treeHealth}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Structure:</span>
                    <span className={`ml-2 font-semibold ${getConditionColor(tree.structure)}`}>
                      {tree.structure}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Wound Wood Development:</span>
                    <span className={`ml-2 font-semibold ${getConditionColor(tree.woundWoodDevelopment)}`}>
                      {tree.woundWoodDevelopment}
                    </span>
                  </div>
                </div>
                {tree.protectionZone && (
                  <div className="mt-3 pt-3 border-t rounded-lg" style={{ borderColor: 'var(--border)' }}>
                    <p className="font-medium mb-1">Tree Protection Zone / Structural Root Zone</p>
                    {protectionZoneTextLines(tree).map((line, i) => (
                      <p key={i} className="text-sm" style={{ color: 'var(--text-secondary)' }}>{line}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {report.trees.length === 0 && (
              <p className="text-[var(--text-muted)]">No trees attached to this report yet.</p>
            )}
          </div>
        </div>

        {/* Photos */}
        {report.photos.length > 0 && (
          <div className="p-6 border-b">
            <div className="flex items-center gap-2 mb-4">
              <Camera className="text-[var(--accent)]" size={24} />
              <h3 className="text-lg font-semibold">Photo Documentation</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {report.photos.map(photo => (
                <div key={photo.id} className="border rounded-lg overflow-hidden">
                  <img src={photo.url} alt={photo.caption} className="w-full h-32 object-cover" />
                  <div className="p-2">
                    <p className="text-sm font-medium">{photo.category}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{photo.caption}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {report.notes.length > 0 && (
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold mb-4">Observations & Notes</h3>
            <div className="space-y-4">
              {report.notes.map(note => (
                <div key={note.id} className="border-l-4 border-[var(--accent)] pl-4">
                  <h4 className="font-medium">{note.title}</h4>
                  <p className="text-sm text-[var(--text-secondary)] mb-1">{note.category}</p>
                  <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{note.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-6 bg-[var(--surface-overlay)] text-center text-sm text-[var(--text-secondary)]">
          <p>Report generated on {new Date().toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};
