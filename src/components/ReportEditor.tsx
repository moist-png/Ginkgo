import React, { useState } from 'react';
import { ArboristReport, Photo, Note, Tree, Site } from '../types';
import { PhotoGallery } from './PhotoGallery';
import { NotesSection } from './NotesSection';
import { ReportPreview } from './ReportPreview';
import { ReportTreesTab } from './ReportTreesTab';
import { ArrowLeft, Save, FileText, Camera, TreePine, StickyNote, Eye, Download, Trash2, Search, Plus } from 'lucide-react';
import { exportSingleTreeReport } from '../utils/exportUtils';
import { canUserEdit } from '../utils/auth';
import { ExportModal } from './ExportModal';
import { db } from '../utils/offline';
import { supabase } from '../utils/supabase';
import { toDbReport, toDbTree, toDbSite, fromDbReport } from '../utils/mappers';

interface ReportEditorProps {
  report: any; // raw shell or already-normalised ArboristReport — normalised internally
  sites: Site[];
  allTrees: Tree[];
  isNew: boolean;
  onSave: (report: ArboristReport) => void;
  onDelete?: () => void;
  onBack: () => void;
  onOpenTree?: (tree: Tree) => void; // navigate to a tree's own page (saved trees only)
}

export const ReportEditor: React.FC<ReportEditorProps> = ({ report, sites, allTrees, isNew, onSave, onDelete, onBack, onOpenTree }) => {
  const initial = fromDbReport(report, report?.trees || []);
  const [editingReport, setEditingReport] = useState<ArboristReport>(initial);
  const [siteMode, setSiteMode] = useState<'picking' | 'new-site-form' | 'set'>(initial.siteId ? 'set' : 'picking');
  const [siteSearch, setSiteSearch] = useState('');
  const [newSiteDraft, setNewSiteDraft] = useState<Site>({
    id: crypto.randomUUID(), name: '', description: '', address: '', clientName: '', clientPhone: '', clientEmail: '',
    createdAt: Date.now(), updatedAt: Date.now(),
  });
  const [pendingNewSite, setPendingNewSite] = useState<Site | null>(null); // set once user confirms a brand-new site
  const [activeTab, setActiveTab] = useState<'info' | 'trees' | 'photos' | 'notes' | 'preview'>('info');
  const [showExportModal, setShowExportModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const canEdit = canUserEdit();

  const currentSite = sites.find(s => s.id === editingReport.siteId) || (pendingNewSite && pendingNewSite.id === editingReport.siteId ? pendingNewSite : undefined);

  const updateReport = (updates: Partial<ArboristReport>) => setEditingReport(prev => ({ ...prev, ...updates }));

  const handlePickExistingSite = (site: Site) => {
    updateReport({ siteId: site.id, address: editingReport.address || site.address, clientName: editingReport.clientName || site.clientName });
    setSiteMode('set');
  };

  const handleConfirmNewSite = () => {
    if (!newSiteDraft.name.trim()) return;
    setPendingNewSite(newSiteDraft);
    updateReport({ siteId: newSiteDraft.id, address: editingReport.address || newSiteDraft.address, clientName: editingReport.clientName || newSiteDraft.clientName });
    setSiteMode('set');
  };

  const handleChangeSite = () => {
    if (editingReport.trees.length > 0) return; // locked once trees are attached
    setSiteMode('picking');
  };

  const attachTree = (tree: Tree) => {
    updateReport({ trees: [...editingReport.trees, tree] });
  };
  const removeTree = (treeId: string) => {
    updateReport({ trees: editingReport.trees.filter(t => t.id !== treeId) });
  };

  const handleSave = async () => {
    if (!canEdit || saving) return;
    if (!editingReport.siteId) { setSaveError('Choose a site for this report first.'); setActiveTab('info'); return; }
    if (editingReport.trees.length === 0) { setSaveError('Add at least one tree before saving.'); setActiveTab('trees'); return; }

    setSaving(true);
    setSaveError('');
    try {
      if (pendingNewSite) {
        await db.upsert('sites', toDbSite(pendingNewSite));
      }
      for (const tree of editingReport.trees) {
        await db.upsert('trees', toDbTree(tree));
      }
      await db.upsert('reports', toDbReport(editingReport));

      // Sync the report_trees links: clear existing, then insert current set.
      await supabase.from('report_trees').delete().eq('report_id', editingReport.id);
      const links = editingReport.trees.map(t => ({ report_id: editingReport.id, tree_id: t.id }));
      if (links.length > 0) await supabase.from('report_trees').insert(links);

      onSave(editingReport);
      onBack();
    } catch (err: any) {
      setSaveError(err?.message || 'Could not save. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!confirm('Delete this report? It will move to Recently Deleted. Trees themselves will not be deleted.')) return;
    db.softDelete('reports', editingReport.id).then(() => onDelete && onDelete());
  };

  const filteredSites = sites.filter(s => !siteSearch || s.name.toLowerCase().includes(siteSearch.toLowerCase()) || s.address.toLowerCase().includes(siteSearch.toLowerCase()));
  const existingTreesForSite = allTrees.filter(t => t.siteId === editingReport.siteId && !editingReport.trees.some(at => at.id === t.id));

  const tabs: { id: typeof activeTab; label: string; icon: any }[] = [
    { id: 'info', label: 'Report Info', icon: FileText },
    { id: 'trees', label: `Trees (${editingReport.trees.length})`, icon: TreePine },
    { id: 'photos', label: 'Photos', icon: Camera },
    { id: 'notes', label: 'Notes', icon: StickyNote },
    { id: 'preview', label: 'Preview', icon: Eye },
  ];
  const siteChosen = !!editingReport.siteId;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--forest)' }}>
      <div className="border-b p-3 sm:p-4" style={{ background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={onBack} className="flex items-center gap-2 transition-colors shrink-0" style={{ color: 'var(--text-secondary)' }}>
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Back to Reports</span>
          </button>
          <h1 className="text-lg sm:text-[22px] truncate flex-1 min-w-0" style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, color: 'var(--text-primary)' }}>
            {editingReport.title || 'Untitled Report'}
          </h1>
          {!isNew && canEdit && (
            <button onClick={handleDelete} className="p-2 rounded-lg transition-colors shrink-0" style={{ border: '1px solid var(--border)', color: 'var(--danger)' }} title="Delete Report">
              <Trash2 size={16} />
            </button>
          )}
          <button onClick={() => setShowExportModal(true)} className="p-2 rounded-lg transition-colors shrink-0" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }} title="Export Data">
            <Download size={16} />
          </button>
          {canEdit && (
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-colors shrink-0 disabled:opacity-50" style={{ background: 'var(--ink)', color: 'var(--cream)' }}>
              <Save size={20} />
              <span className="hidden sm:inline">{saving ? 'Saving…' : 'Save'}</span>
            </button>
          )}
        </div>
        {saveError && <p className="text-sm mt-2" style={{ color: 'var(--danger)' }}>{saveError}</p>}
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <nav className="md:hidden flex overflow-x-auto gap-2 p-3 border-b" style={{ WebkitOverflowScrolling: 'touch', background: 'var(--forest-mid)', borderColor: 'var(--border)' }}>
          {tabs.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            const disabled = tab.id !== 'info' && !siteChosen;
            return (
              <button key={tab.id} disabled={disabled} onClick={() => setActiveTab(tab.id)} className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors disabled:opacity-40"
                style={active ? { background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600, border: '1px solid var(--accent-soft-strong)' } : { color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                <Icon size={16} />{tab.label}
              </button>
            );
          })}
        </nav>

        <nav className="hidden md:block w-[236px] border-r p-4 shrink-0" style={{ background: 'var(--forest-mid)', borderColor: 'var(--border)' }}>
          <ul className="space-y-2">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              const disabled = tab.id !== 'info' && !siteChosen;
              return (
                <li key={tab.id}>
                  <button disabled={disabled} onClick={() => setActiveTab(tab.id)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors disabled:opacity-40"
                    style={active ? { background: 'var(--accent-soft)', color: 'var(--accent)', fontWeight: 600 } : { color: 'var(--text-secondary)' }}>
                    <Icon size={20} />{tab.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex-1 overflow-auto">
          {activeTab === 'info' && (
            <div className="p-6 max-w-2xl space-y-6">
              <div>
                <h2 className="mb-4" style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: '23px', color: 'var(--text-primary)' }}>Site</h2>

                {siteMode === 'set' && currentSite && (
                  <div className="p-4 rounded-lg flex items-center justify-between" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{currentSite.name}</div>
                      {currentSite.address && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{currentSite.address}</div>}
                    </div>
                    {canEdit && editingReport.trees.length === 0 && (
                      <button onClick={handleChangeSite} className="text-sm px-3 py-1.5 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Change</button>
                    )}
                  </div>
                )}
                {siteMode === 'set' && editingReport.trees.length > 0 && (
                  <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Site is locked because trees are attached to this report.</p>
                )}

                {siteMode === 'picking' && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: 'var(--text-muted)' }} />
                      <input type="text" value={siteSearch} onChange={e => setSiteSearch(e.target.value)} placeholder="Search existing sites…" className="input-field pl-10" />
                    </div>
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {filteredSites.map(s => (
                        <button key={s.id} onClick={() => handlePickExistingSite(s)} className="w-full text-left p-3 rounded-lg transition-colors" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{s.name}</div>
                          {s.address && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.address}</div>}
                        </button>
                      ))}
                      {filteredSites.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No sites match your search.</p>}
                    </div>
                    <button onClick={() => setSiteMode('new-site-form')} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm" style={{ background: 'var(--canopy)', color: 'var(--cream)' }}>
                      <Plus size={16} />Create New Site
                    </button>
                  </div>
                )}

                {siteMode === 'new-site-form' && (
                  <div className="space-y-3">
                    <div>
                      <label>Site Name</label>
                      <input type="text" value={newSiteDraft.name} onChange={e => setNewSiteDraft(prev => ({ ...prev, name: e.target.value }))} className="input-field" placeholder="e.g. 24 Rivergum Street" />
                    </div>
                    <div>
                      <label>Address</label>
                      <input type="text" value={newSiteDraft.address} onChange={e => setNewSiteDraft(prev => ({ ...prev, address: e.target.value }))} className="input-field" placeholder="Property address" />
                    </div>
                    <div>
                      <label>Client Name</label>
                      <input type="text" value={newSiteDraft.clientName} onChange={e => setNewSiteDraft(prev => ({ ...prev, clientName: e.target.value }))} className="input-field" placeholder="Client name" />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleConfirmNewSite} disabled={!newSiteDraft.name.trim()} className="flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50" style={{ background: 'var(--canopy)', color: 'var(--cream)' }}>
                        <Plus size={16} />Use This Site
                      </button>
                      <button onClick={() => setSiteMode('picking')} className="px-4 py-2 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>You can fill in more site details later from the Sites tab.</p>
                  </div>
                )}
              </div>

              {siteChosen && (
                <div>
                  <h2 className="mb-4" style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: '23px', color: 'var(--text-primary)' }}>Report Details</h2>
                  <div className="space-y-4">
                    <div>
                      <label>Report Title</label>
                      <input type="text" value={editingReport.title} disabled={!canEdit} onChange={(e) => updateReport({ title: e.target.value })} className="input-field disabled:cursor-not-allowed" placeholder="Enter report title" />
                    </div>
                    <div>
                      <label>Client Name</label>
                      <input type="text" value={editingReport.clientName} disabled={!canEdit} onChange={(e) => updateReport({ clientName: e.target.value })} className="input-field disabled:cursor-not-allowed" placeholder="Enter client name" />
                    </div>
                    <div>
                      <label>Property Address</label>
                      <input type="text" value={editingReport.address} disabled={!canEdit} onChange={(e) => updateReport({ address: e.target.value })} className="input-field disabled:cursor-not-allowed" placeholder="Enter property address" />
                    </div>
                    <div>
                      <label>Inspector Name</label>
                      <input type="text" value={editingReport.inspector} disabled={!canEdit} onChange={(e) => updateReport({ inspector: e.target.value })} className="input-field disabled:cursor-not-allowed" placeholder="Enter inspector name" />
                    </div>
                    <div>
                      <label>Inspection Date</label>
                      <input type="date" value={editingReport.date} disabled={!canEdit} onChange={(e) => updateReport({ date: e.target.value })} className="input-field disabled:cursor-not-allowed" />
                    </div>
                    <div>
                      <label>Report Status</label>
                      <select value={editingReport.status} disabled={!canEdit} onChange={(e) => updateReport({ status: e.target.value as any })} className="input-field disabled:cursor-not-allowed">
                        <option value="draft">Draft</option>
                        <option value="in-progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'trees' && siteChosen && (
            <ReportTreesTab
              siteId={editingReport.siteId}
              attachedTrees={editingReport.trees}
              availableExistingTrees={existingTreesForSite}
              readOnly={!canEdit}
              onAttach={attachTree}
              onRemove={removeTree}
              onOpenTree={onOpenTree}
            />
          )}

          {activeTab === 'photos' && siteChosen && (
            <PhotoGallery photos={editingReport.photos} readOnly={!canEdit} onUpdate={(photos: Photo[]) => updateReport({ photos })} />
          )}

          {activeTab === 'notes' && siteChosen && (
            <NotesSection notes={editingReport.notes} readOnly={!canEdit} onUpdate={(notes: Note[]) => updateReport({ notes })} />
          )}

          {activeTab === 'preview' && siteChosen && (
            <ReportPreview report={editingReport} site={currentSite} />
          )}
        </div>
      </div>

      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Report"
        data={editingReport}
        exportFunctions={{
          report: () => exportSingleTreeReport(editingReport)
        }}
        emailOptions={{
          defaultSubject: `Report - ${editingReport.title || 'Tree Assessment'}`,
          defaultBody: `Please find the attached report. This includes detailed assessment information, photos, notes, and recommendations.`
        }}
      />
    </div>
  );
};
