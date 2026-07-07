import React, { useState, useEffect } from 'react';
import { Job, Site } from '../types';
import { ArrowLeft, Save, Trash2, Clock, Download } from 'lucide-react';
import { exportSingleJob } from '../utils/exportUtils';
import { loadSites } from '../utils/storage';
import { ExportModal } from './ExportModal';
import { ConfirmationModal } from './ConfirmationModal';

interface JobEditorProps {
  job: Job;
  onSave: (job: Job) => void;
  onDelete?: (jobId: string) => void;
  onBack: () => void;
  isNew?: boolean;
}

export const JobEditor: React.FC<JobEditorProps> = ({
  job,
  onSave,
  onDelete,
  onBack,
  isNew = false
}) => {
  const [editingJob, setEditingJob] = useState<Job>(job);
  const [showExportModal, setShowExportModal] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  useEffect(() => {
    const loadedSites = loadSites();
    setSites(loadedSites);
  }, []);

  // Calculate time spent when start/end times change
  useEffect(() => {
    if (editingJob.startTime && editingJob.endTime) {
      const start = new Date(`2000-01-01T${editingJob.startTime}`);
      const end = new Date(`2000-01-01T${editingJob.endTime}`);
      
      if (end > start) {
        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = Math.round(diffMs / (1000 * 60));
        setEditingJob(prev => ({ ...prev, timeSpent: diffMinutes }));
      }
    }
  }, [editingJob.startTime, editingJob.endTime]);

  const handleSave = () => {
    const updatedJob = { ...editingJob, updatedAt: Date.now() };
    setEditingJob(updatedJob);
    onSave(updatedJob);
  };

  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  const handleConfirmDelete = () => {
    if (onDelete) {
      onDelete(job.id);
    }
  };

  const updateJob = (field: keyof Job, value: any) => {
    setEditingJob(prev => ({ ...prev, [field]: value }));
  };

  const formatTimeInput = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const parseTimeInput = (timeString: string): number => {
    const [hours, mins] = timeString.split(':').map(Number);
    return (hours || 0) * 60 + (mins || 0);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="bg-[var(--surface-raised)] shadow-sm border-b border-[var(--border)] p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft size={20} />
              Back to Jobs
            </button>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {isNew ? 'New Job' : 'Edit Job'}
            </h1>
          </div>
          <div className="flex gap-2">
            {!isNew && onDelete && (
              <>
                <button
                  onClick={() => setShowExportModal(true)}
                  className="p-2 border border-[var(--border)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--forest)] transition-colors"
                  title="Export Data"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 bg-red-600 text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 size={20} />
                  Delete
                </button>
              </>
            )}
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--forest-light)] transition-colors"
            >
              <Save size={20} />
              Save Job
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Job Information</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Job Title *
                </label>
                <input
                  type="text"
                  value={editingJob.title}
                  onChange={(e) => updateJob('title', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., Tree Assessment - Oak Removal, Pruning - Maple Trees"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Link to Site (Optional)
                </label>
                <select
                  value={editingJob.siteId || ''}
                  onChange={(e) => updateJob('siteId', e.target.value || undefined)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">None - Standalone Job</option>
                  {sites.map(site => (
                    <option key={site.id} value={site.id}>
                      {site.name} - {site.address}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Link this job to a site registry to track work done at specific locations
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Client Name
                  </label>
                  <input
                    type="text"
                    value={editingJob.clientName}
                    onChange={(e) => updateJob('clientName', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Client or organization name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={editingJob.date}
                    onChange={(e) => updateJob('date', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={editingJob.location}
                  onChange={(e) => updateJob('location', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Job site address or location"
                />
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <div className="flex items-center gap-2 mb-6">
              <Clock className="text-[var(--leaf)]" size={24} />
              <h2 className="text-xl font-semibold">Time Tracking</h2>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={editingJob.startTime}
                    onChange={(e) => updateJob('startTime', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={editingJob.endTime}
                    onChange={(e) => updateJob('endTime', e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Total Time Spent (HH:MM)
                </label>
                <input
                  type="time"
                  value={formatTimeInput(editingJob.timeSpent)}
                  onChange={(e) => updateJob('timeSpent', parseTimeInput(e.target.value))}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  Auto-calculated from start/end times, or enter manually
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[var(--surface-raised)] rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Work Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Work Completed
                </label>
                <textarea
                  value={editingJob.workCompleted}
                  onChange={(e) => updateJob('workCompleted', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Describe the work that has been completed..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Work To Complete
                </label>
                <textarea
                  value={editingJob.workToComplete}
                  onChange={(e) => updateJob('workToComplete', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Describe any remaining work or follow-up tasks..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Notes
                </label>
                <textarea
                  value={editingJob.notes}
                  onChange={(e) => updateJob('notes', e.target.value)}
                  className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  rows={4}
                  placeholder="Additional notes, observations, or important details..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Job Report"
        data={editingJob}
        exportFunctions={{
          report: () => exportSingleJob(editingJob)
        }}
        emailOptions={{
          defaultSubject: `Job Report - ${editingJob.title}`,
          defaultBody: `Please find the attached job report containing detailed information about work completed, time tracking, and billing details.`
        }}
      />

      <ConfirmationModal
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Job"
        message="Are you sure you want to delete this job? The job will be moved to trash and can be recovered for a short while."
        confirmButtonText="Move to Trash"
        cancelButtonText="Keep Job"
        isDestructive={true}
      />
    </div>
  );
};