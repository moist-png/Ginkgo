import React from 'react';
import { TreeData } from '../types';

interface TreeInfoProps {
  treeData: TreeData;
  readOnly?: boolean;
  onUpdate: (treeData: TreeData) => void;
}

export const TreeInfo: React.FC<TreeInfoProps> = ({ treeData, readOnly = false, onUpdate }) => {
  const handleChange = (field: keyof TreeData, value: string | number) => {
    if (readOnly) return;
    onUpdate({ ...treeData, [field]: value });
  };

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-semibold mb-6">Tree Information</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Tree Number
          </label>
          <input
            type="text"
            value={treeData.treeNumber}
            disabled={readOnly}
            onChange={(e) => handleChange('treeNumber', e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
            placeholder="e.g., T001, A-15"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Scientific Name
            </label>
            <input
              type="text"
              value={treeData.species}
              disabled={readOnly}
              onChange={(e) => handleChange('species', e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
              placeholder="e.g., Quercus alba"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Common Name
            </label>
            <input
              type="text"
              value={treeData.commonName}
              disabled={readOnly}
              onChange={(e) => handleChange('commonName', e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
              placeholder="e.g., White Oak"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Location Description
          </label>
          <input
            type="text"
            value={treeData.location}
            disabled={readOnly}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
            placeholder="e.g., Front yard, 6 metres from house"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              DBH (cm)
            </label>
            <input
              type="number"
              value={treeData.dbh}
              disabled={readOnly}
              onChange={(e) => handleChange('dbh', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
              placeholder="0.0"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Height (m)
            </label>
            <input
              type="number"
              value={treeData.height}
              disabled={readOnly}
              onChange={(e) => handleChange('height', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
              placeholder="0.0"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Extension Growth (mm)
            </label>
            <input
              type="number"
              value={treeData.extensionGrowth}
              disabled={readOnly}
              onChange={(e) => handleChange('extensionGrowth', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
              placeholder="0"
              step="1"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Canopy Spread North-South (m)
            </label>
            <input
              type="number"
              value={treeData.canopySpreadNS}
              disabled={readOnly}
              onChange={(e) => handleChange('canopySpreadNS', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
              placeholder="0.0"
              step="0.1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Canopy Spread East-West (m)
            </label>
            <input
              type="number"
              value={treeData.canopySpreadEW}
              disabled={readOnly}
              onChange={(e) => handleChange('canopySpreadEW', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
              placeholder="0.0"
              step="0.1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Canopy Cover (%)
          </label>
          <input
            type="number"
            value={treeData.canopyCover}
            disabled={readOnly}
            onChange={(e) => handleChange('canopyCover', parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
            placeholder="0"
            min="0"
            max="100"
            step="1"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Tree Health
            </label>
            <select
              value={treeData.treeHealth}
              disabled={readOnly}
              onChange={(e) => handleChange('treeHealth', e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
            >
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Structure
            </label>
            <select
              value={treeData.structure}
              disabled={readOnly}
              onChange={(e) => handleChange('structure', e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
            >
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Wound Wood Development
            </label>
            <select
              value={treeData.woundWoodDevelopment}
              disabled={readOnly}
              onChange={(e) => handleChange('woundWoodDevelopment', e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-[var(--surface-overlay)] disabled:cursor-not-allowed"
            >
              <option value="Excellent">Excellent</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Poor">Poor</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};