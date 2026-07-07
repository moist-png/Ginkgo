import React, { useState } from 'react';
import { ArboristReport, TreeData, Photo, Note } from '../types';
import { TreeInfo } from './TreeInfo';
import { PhotoGallery } from './PhotoGallery';
import { NotesSection } from './NotesSection';
import { ReportPreview } from './ReportPreview';
import { ClinometerTool } from './ClinometerTool';
import { SpeciesIdentifier } from './SpeciesIdentifier';
import { ArrowLeft, Save, FileText, Camera, TreePine, StickyNote, Eye, Download, Ruler, Leaf } from 'lucide-react';
import { exportSingleTreeReport } from '../utils/exportUtils';
import { canUserEdit } from '../utils/auth';
import { ExportModal } from './ExportModal';

interface ReportEditorProps {
  report: ArboristReport;
  onSave: (report: ArboristReport) => void;
  onBack: () => void;
}

export const ReportEditor: React.FC<ReportEditorProps> = ({ report, onSave, onBack }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'tree' | 'species' | 'height' | 'photos' | 'notes' | 'preview'>(report.siteId ? 'tree' : 'info');
  const [editingReport, setEditingReport] = useState<ArboristReport>(report);
  const [showExportModal, setShowExportModal] = useState(false);
  const canEdit = canUserEdit();

  const handleSave = () => {
    if (!canEdit) return;
    const updatedReport = { ...editingReport, updatedAt: Date.now() };
    setEditingReport(updatedReport);
    onSave(updatedReport);
    onBack(); // Close the editing panel and go back
  };

  const updateReport = (updates: Partial<ArboristReport>) => {
    setEditingReport(prev => ({ ...prev, ...updates }));
  };

  const updateTreeData = (treeData: TreeData) => {
    updateReport({ treeData });
  };

  const updatePhotos = (photos: Photo[]) => {
    updateReport({ photos });
  };

  const updateNotes = (notes: Note[]) => {
    updateReport({ notes });
  };

  const tabs = [
    { id: 'tree', label: 'Tree Data', icon: TreePine },
    { id: 'species', label: 'Identify Species', icon: Leaf },
    { id: 'height', label: 'Measure Height', icon: Ruler },
    { id: 'photos', label: 'Photos', icon: Camera },
    { id: 'notes', label: 'Notes', icon: StickyNote }
  ];

  // Add Report Info tab only for standalone trees (not part of a site)
  if (!editingReport.siteId) {
    tabs.unshift({ id: 'info', label: 'Report Info', icon: FileText });
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-[var(--surface-raised)] shadow-sm border-b border-[var(--border)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowExportModal(true)}
              className="p-2 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--forest)] transition-colors"
              title="Export Data"
            >
              <Download size={16} />
            </button>
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Reports
            </button>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {editingReport.title || 'Untitled Report'}
            </h1>
          </div>
          {canEdit && (
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
            >
              <Save size={20} />
              Save
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <nav className="w-64 bg-[var(--forest)] border-r border-[var(--border)] p-4">
          <ul className="space-y-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <li key={tab.id}>
                  <button
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[rgba(90,143,90,0.15)] text-[var(--leaf)] font-medium'
                        : 'text-[var(--text-primary)] hover:bg-[var(--surface-overlay)]'
                    }`}
                  >
                    <Icon size={20} />
                    {tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex-1 overflow-auto">
          {activeTab === 'info' && (
            !editingReport.siteId && (
              <div className="p-6 max-w-2xl">
                <h2 className="text-xl font-semibold mb-6">Report Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Report Title
                    </label>
                    <input
                      type="text"
                      value={editingReport.title}
                      disabled={!canEdit}
                      onChange={(e) => updateReport({ title: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
                      placeholder="Enter report title"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Client Name
                    </label>
                    <input
                      type="text"
                      value={editingReport.clientName}
                      disabled={!canEdit}
                      onChange={(e) => updateReport({ clientName: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
                      placeholder="Enter client name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Property Address
                    </label>
                    <input
                      type="text"
                      value={editingReport.address}
                      disabled={!canEdit}
                      onChange={(e) => updateReport({ address: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
                      placeholder="Enter property address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Inspector Name
                    </label>
                    <input
                      type="text"
                      value={editingReport.inspector}
                      disabled={!canEdit}
                      onChange={(e) => updateReport({ inspector: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
                      placeholder="Enter inspector name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Inspection Date
                    </label>
                    <input
                      type="date"
                      value={editingReport.date}
                      disabled={!canEdit}
                      onChange={(e) => updateReport({ date: e.target.value })}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                      Report Status
                    </label>
                    <select
                      value={editingReport.status}
                      disabled={!canEdit}
                      onChange={(e) => updateReport({ status: e.target.value as any })}
                      className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
                    >
                      <option value="draft">Draft</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>
            )
          )}

          {activeTab === 'tree' && (
            <TreeInfo
              treeData={editingReport.treeData}
              readOnly={!canEdit}
              onUpdate={updateTreeData}
            />
          )}

          {activeTab === 'species' && (
            <SpeciesIdentifier
              treeData={editingReport.treeData}
              readOnly={!canEdit}
              onUpdate={updateTreeData}
            />
          )}

          {activeTab === 'height' && (
            <ClinometerTool
              treeData={editingReport.treeData}
              readOnly={!canEdit}
              onUpdate={updateTreeData}
            />
          )}

          {activeTab === 'photos' && (
            <PhotoGallery
              photos={editingReport.photos}
              readOnly={!canEdit}
              onUpdate={updatePhotos}
            />
          )}

          {activeTab === 'notes' && (
            <NotesSection
              notes={editingReport.notes}
              readOnly={!canEdit}
              onUpdate={updateNotes}
            />
          )}
        </div>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Tree Report"
        data={editingReport}
        exportFunctions={{
          report: () => exportSingleTreeReport(editingReport)
        }}
        emailOptions={{
          defaultSubject: `Tree Report - ${editingReport.title || 'Tree Assessment'}`,
          defaultBody: `Please find the attached comprehensive tree report. This includes detailed assessment information, photos, notes, and recommendations.`
        }}
      />
    </div>
  );
};