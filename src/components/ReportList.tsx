import React, { useState } from 'react';
import { ArboristReport, Site } from '../types';
import { formatDate } from '../utils/storage';
import { Plus, Search, FileText, TreePine, Calendar, User, MapPin, Building2, Download } from 'lucide-react';
import { exportReportsCSV } from '../utils/exportUtils';
import { canUserEdit } from '../utils/auth';
import { ExportModal } from './ExportModal';

interface ReportListProps {
  reports: ArboristReport[];
  sites: Site[];
  onSelectReport: (report: ArboristReport) => void;
  onCreateReport: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const ReportList: React.FC<ReportListProps> = ({
  reports,
  sites,
  onSelectReport,
  onCreateReport,
  searchQuery,
  onSearchChange
}) => {
  const [showExportModal, setShowExportModal] = useState(false);
  const canEdit = canUserEdit();

  const getStatusColor = (status: ArboristReport['status']) => {
    switch (status) {
      case 'draft': return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
      case 'in-progress': return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
      case 'completed': return 'bg-[rgba(138,111,76,0.15)] text-[var(--accent)]';
      default: return 'bg-[var(--surface-overlay)] text-[var(--text-secondary)]';
    }
  };

  const siteName = (siteId: string) => sites.find(s => s.id === siteId)?.name || '';

  const q = searchQuery.toLowerCase();
  const filteredReports = reports.filter(report =>
    report.title.toLowerCase().includes(q) ||
    report.clientName.toLowerCase().includes(q) ||
    report.address.toLowerCase().includes(q) ||
    siteName(report.siteId).toLowerCase().includes(q) ||
    report.trees.some(t =>
      t.treeNumber.toLowerCase().includes(q) ||
      t.species.toLowerCase().includes(q) ||
      t.commonName.toLowerCase().includes(q)
    )
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <h1 className="text-3xl font-bold text-[var(--text-primary)]">Reports</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="p-2 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--forest)] transition-colors"
            title="Export Data"
          >
            <Download size={16} />
          </button>
          {canEdit && (
            <button
              onClick={onCreateReport}
              className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
            >
              <Plus size={20} />
              New Report
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" size={20} />
        <input
          type="text"
          placeholder="Search reports..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent"
        />
      </div>

      <div className="grid gap-4">
        {filteredReports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-[var(--text-muted)] mb-4" />
            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No reports found</h3>
            <p className="text-[var(--text-muted)] mb-4">
              {searchQuery ? 'Try adjusting your search terms' : 'Get started by writing your first report'}
            </p>
            {!searchQuery && canEdit && (
              <button
                onClick={onCreateReport}
                className="bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
              >
                Create First Report
              </button>
            )}
          </div>
        ) : (
          filteredReports.map((report) => (
            <div
              key={report.id}
              onClick={() => onSelectReport(report)}
              className="bg-[var(--surface-raised)] rounded-lg shadow-md border border-[var(--border)] p-6 hover:shadow-lg transition-shadow cursor-pointer"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-[var(--text-primary)]">
                      {report.title || 'Untitled Report'}
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                    <div className="flex items-center gap-1">
                      <Building2 size={16} />
                      {siteName(report.siteId) || 'Unknown site'}
                    </div>
                    <div className="flex items-center gap-1">
                      <User size={16} />
                      {report.clientName || 'No client'}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={16} />
                      {report.address || 'No address'}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={16} />
                      {formatDate(report.updatedAt)}
                    </div>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(report.status)}`}>
                  {report.status}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                <span className="flex items-center gap-1 font-medium text-[var(--text-primary)]">
                  <TreePine size={14} />
                  {report.trees.length} {report.trees.length === 1 ? 'tree' : 'trees'}
                </span>
                <span>{report.photos.length} photos</span>
                <span>{report.notes.length} notes</span>
                <span>{report.recommendations.length} recommendations</span>
              </div>
            </div>
          ))
        )}
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Reports"
        data={reports}
        exportFunctions={{
          csv: () => exportReportsCSV(reports)
        }}
        emailOptions={{
          defaultSubject: 'Reports Export',
          defaultBody: 'Please find the attached reports export.'
        }}
      />
    </div>
  );
};
