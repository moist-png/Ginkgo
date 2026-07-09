import React, { useState } from 'react';
import { Tree } from '../types';
import { TreeInfo } from './TreeInfo';
import { defaultTreeData } from '../utils/mappers';
import { Plus, X, TreePine, Search, ExternalLink } from 'lucide-react';

interface ReportTreesTabProps {
  siteId: string;
  attachedTrees: Tree[];
  availableExistingTrees: Tree[]; // trees at this site not yet attached to the report
  readOnly: boolean;
  onAttach: (tree: Tree) => void;
  onRemove: (treeId: string) => void;
  onOpenTree?: (tree: Tree) => void; // only meaningful for trees already saved in the DB
}

export const ReportTreesTab: React.FC<ReportTreesTabProps> = ({
  siteId, attachedTrees, availableExistingTrees, readOnly, onAttach, onRemove, onOpenTree
}) => {
  const [mode, setMode] = useState<'list' | 'pick-existing' | 'add-new'>('list');
  const [search, setSearch] = useState('');
  const [newTree, setNewTree] = useState<Tree>({
    id: crypto.randomUUID(),
    siteId,
    ...defaultTreeData(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  const filteredExisting = availableExistingTrees.filter(t =>
    !search ||
    t.treeNumber.toLowerCase().includes(search.toLowerCase()) ||
    t.species.toLowerCase().includes(search.toLowerCase()) ||
    t.commonName.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddNew = () => {
    onAttach(newTree);
    setNewTree({ id: crypto.randomUUID(), siteId, ...defaultTreeData(), createdAt: Date.now(), updatedAt: Date.now() });
    setMode('list');
  };

  if (mode === 'add-new') {
    return (
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: '23px', color: 'var(--text-primary)' }}>New Tree</h2>
          <button onClick={() => setMode('list')} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        <TreeInfo treeData={newTree} readOnly={false} onUpdate={(d) => setNewTree(prev => ({ ...prev, ...d }))} />
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={handleAddNew} className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: 'var(--canopy)', color: 'var(--cream)' }}>
            <Plus size={18} />Add Tree to Report
          </button>
          <button onClick={() => setMode('list')} className="px-4 py-2 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>Cancel</button>
        </div>
      </div>
    );
  }

  if (mode === 'pick-existing') {
    return (
      <div className="p-6 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: '23px', color: 'var(--text-primary)' }}>Add Existing Tree</h2>
          <button onClick={() => setMode('list')} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2" size={18} style={{ color: 'var(--text-muted)' }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search trees at this site…" className="input-field pl-10" />
        </div>
        {filteredExisting.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>{availableExistingTrees.length === 0 ? 'No other trees registered at this site yet.' : 'No trees match your search.'}</p>
        ) : (
          <div className="space-y-2">
            {filteredExisting.map(t => (
              <button key={t.id} onClick={() => { onAttach(t); setMode('list'); }} className="w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                <div>
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{t.treeNumber ? `#${t.treeNumber} — ` : ''}{t.species || t.commonName || 'Untitled Tree'}</div>
                  {t.location && <div className="text-xs" style={{ color: 'var(--text-muted)' }}>{t.location}</div>}
                </div>
                <Plus size={18} style={{ color: 'var(--accent)' }} />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h2 style={{ fontFamily: 'Newsreader, serif', fontWeight: 500, fontSize: '23px', color: 'var(--text-primary)' }}>Trees in this Report</h2>
        {!readOnly && (
          <div className="flex gap-2">
            <button onClick={() => setMode('pick-existing')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--accent)', color: 'var(--leaf)' }}>
              <TreePine size={16} />Add Existing
            </button>
            <button onClick={() => setMode('add-new')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--canopy)', color: 'var(--cream)' }}>
              <Plus size={16} />New Tree
            </button>
          </div>
        )}
      </div>

      {attachedTrees.length === 0 ? (
        <div className="text-center py-12">
          <TreePine className="mx-auto h-12 w-12 mb-4" style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>No trees attached yet. Every report needs at least one.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {attachedTrees.map(t => {
            return (
              <div key={t.id} className="p-3 rounded-lg flex items-center justify-between" style={{ background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onOpenTree && onOpenTree(t)}>
                  <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{t.treeNumber ? `#${t.treeNumber} — ` : ''}{t.species || t.commonName || 'Untitled Tree'}</div>
                  {t.location && <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{t.location}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {onOpenTree && (
                    <button onClick={() => onOpenTree(t)} className="p-2 rounded-lg" style={{ color: 'var(--text-muted)' }} title="Open tree">
                      <ExternalLink size={16} />
                    </button>
                  )}
                  {!readOnly && (
                    <button onClick={() => onRemove(t.id)} className="p-2 rounded-lg" style={{ color: 'var(--danger)' }} title="Remove from report">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
