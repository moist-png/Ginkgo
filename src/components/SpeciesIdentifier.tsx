import React, { useRef, useState } from 'react';
import { TreeData } from '../types';
import { Leaf, Camera, Upload, Check, Loader2, AlertTriangle, X } from 'lucide-react';

interface SpeciesIdentifierProps {
  treeData: TreeData;
  readOnly?: boolean;
  onUpdate: (treeData: TreeData) => void;
}

/**
 * ============================================================================
 *  PASTE YOUR FREE PLANTNET API KEY HERE (between the quotes).
 *  Get one free at:  https://my.plantnet.org  ->  Settings  ->  API key
 *  The free tier allows 500 identifications per day.
 * ============================================================================
 */
const PLANTNET_API_KEY = '2b10TRyV4ebjycZmZ6Z66sGW';

type Organ = 'auto' | 'leaf' | 'flower' | 'fruit' | 'bark';

interface Candidate {
  scientificName: string;
  commonName: string;
  score: number; // 0..1
}

export const SpeciesIdentifier: React.FC<SpeciesIdentifierProps> = ({ treeData, readOnly = false, onUpdate }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [organ, setOrgan] = useState<Organ>('auto');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  // Lets the user paste a key in the app if they didn't edit the file above.
  const [apiKey, setApiKey] = useState<string>(PLANTNET_API_KEY);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickFile = (file: File | null) => {
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setCandidates([]);
    setSelected(null);
    setError('');
    setSaved(false);
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview('');
    setCandidates([]);
    setSelected(null);
    setError('');
    setSaved(false);
  };

  const identify = async () => {
    setError('');
    setCandidates([]);
    setSelected(null);

    if (!apiKey) {
      setError('No PlantNet API key set. Add your free key from my.plantnet.org in the box below.');
      return;
    }
    if (!imageFile) {
      setError('Take or upload a photo of the tree first.');
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append('images', imageFile);
      form.append('organs', organ);

      const url = `https://my-api.plantnet.org/v2/identify/all?api-key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(url, { method: 'POST', body: form });

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error('The API key was rejected. Check it is copied correctly from my.plantnet.org.');
        }
        if (res.status === 404) {
          throw new Error('No plant could be recognised in that photo. Try a clearer photo of a leaf, flower, fruit or bark.');
        }
        if (res.status === 429) {
          throw new Error('Daily free limit reached (500/day). Try again tomorrow.');
        }
        throw new Error(`Identification failed (error ${res.status}). Please try again.`);
      }

      const data = await res.json();
      const results: Candidate[] = (data.results || []).slice(0, 5).map((r: any) => ({
        scientificName: r?.species?.scientificNameWithoutAuthor || 'Unknown',
        commonName: (r?.species?.commonNames && r.species.commonNames[0]) || '',
        score: typeof r?.score === 'number' ? r.score : 0,
      }));

      if (results.length === 0) {
        setError('No matches found. Try a clearer, closer photo of a single leaf, flower, fruit or the bark.');
      } else {
        setCandidates(results);
        setSelected(0);
      }
    } catch (e) {
      // A network/CORS failure lands here too.
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveToReport = () => {
    if (readOnly || selected === null) return;
    const c = candidates[selected];
    onUpdate({ ...treeData, species: c.scientificName, commonName: c.commonName || treeData.commonName });
    setSaved(true);
  };

  const organs: { id: Organ; label: string }[] = [
    { id: 'auto', label: 'Auto' },
    { id: 'leaf', label: 'Leaf' },
    { id: 'flower', label: 'Flower' },
    { id: 'fruit', label: 'Fruit' },
    { id: 'bark', label: 'Bark' },
  ];

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Leaf className="text-[var(--leaf)]" size={22} />
        <h2 className="text-xl font-semibold">Identify Species</h2>
      </div>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Take or upload a photo and PlantNet will suggest the most likely species. Pick one to add it to Tree Data.
      </p>

      {/* Hidden file inputs */}
      <input
        ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] || null)}
      />
      <input
        ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => pickFile(e.target.files?.[0] || null)}
      />

      {/* Photo area */}
      {imagePreview ? (
        <div className="relative mb-4">
          <img src={imagePreview} alt="Tree to identify" className="w-full max-h-80 object-contain rounded-lg border border-[var(--border)] bg-[var(--forest)]" />
          <button
            onClick={clearImage}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-[var(--forest)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Remove photo"
          >
            <X size={16} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={readOnly}
            className="flex flex-col items-center justify-center gap-2 border border-[var(--border)] rounded-lg py-8 text-[var(--text-secondary)] hover:border-[var(--border-bright)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Camera size={24} />
            <span className="text-sm font-medium">Take photo</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={readOnly}
            className="flex flex-col items-center justify-center gap-2 border border-[var(--border)] rounded-lg py-8 text-[var(--text-secondary)] hover:border-[var(--border-bright)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Upload size={24} />
            <span className="text-sm font-medium">Upload photo</span>
          </button>
        </div>
      )}

      {/* Which part of the plant */}
      <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">What is in the photo?</label>
      <div className="flex flex-wrap gap-2 mb-4">
        {organs.map(o => (
          <button
            key={o.id}
            onClick={() => setOrgan(o.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              organ === o.id
                ? 'bg-[rgba(90,143,90,0.15)] text-[var(--leaf)] border-[var(--border-bright)]'
                : 'text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {/* API key box (only shown if not set in the file) */}
      {!PLANTNET_API_KEY && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            PlantNet API key
            <span className="text-[var(--text-muted)] font-normal"> — free from my.plantnet.org</span>
          </label>
          <input
            type="text"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value.trim())}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--forest)] text-[var(--text-primary)] focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Paste your API key here"
          />
        </div>
      )}

      <button
        onClick={identify}
        disabled={readOnly || loading || !imageFile}
        className="w-full flex items-center justify-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-3 rounded-lg hover:bg-[var(--moss)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed mb-4"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Leaf size={18} />}
        {loading ? 'Identifying…' : 'Identify species'}
      </button>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-[rgba(212,160,23,0.3)] bg-[rgba(212,160,23,0.12)] p-3 mb-4">
          <AlertTriangle size={16} className="text-[var(--amber-light)] mt-0.5 shrink-0" />
          <p className="text-sm text-[var(--text-secondary)]">{error}</p>
        </div>
      )}

      {/* Results */}
      {candidates.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--text-muted)]">
            Suggestions — tap to select
          </p>
          {candidates.map((c, i) => (
            <button
              key={i}
              onClick={() => { setSelected(i); setSaved(false); }}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${
                selected === i
                  ? 'border-[var(--border-bright)] bg-[rgba(90,143,90,0.12)]'
                  : 'border-[var(--border)] hover:border-[var(--border-bright)]'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[var(--text-primary)] font-medium">
                    {c.commonName || c.scientificName}
                  </p>
                  <p className="text-sm italic text-[var(--text-muted)]">{c.scientificName}</p>
                </div>
                <span className="badge badge-green shrink-0">{Math.round(c.score * 100)}% match</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {candidates.length > 0 && (
        <>
          <button
            onClick={saveToReport}
            disabled={readOnly || selected === null}
            className="w-full flex items-center justify-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-3 rounded-lg hover:bg-[var(--moss)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check size={18} />
            {saved ? 'Saved to Tree Data' : 'Save selected species to Tree Data'}
          </button>
          {saved && (
            <p className="text-xs text-[var(--leaf)] mt-3 text-center">
              Species added to Tree Data. Press <strong>Save</strong> on the report to store it permanently.
            </p>
          )}
        </>
      )}
    </div>
  );
};
