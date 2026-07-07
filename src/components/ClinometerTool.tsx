import React, { useEffect, useRef, useState } from 'react';
import { TreeData } from '../types';
import { Ruler, Compass, Check, RotateCcw, AlertTriangle } from 'lucide-react';

interface ClinometerToolProps {
  treeData: TreeData;
  readOnly?: boolean;
  onUpdate: (treeData: TreeData) => void;
}

type Mode = 'two-angle' | 'single-angle';

/**
 * Clinometer height calculator.
 *
 * Uses the phone's built-in tilt sensor to read the angle you are looking at,
 * then works out tree height with trigonometry.
 *
 * Two-angle method (most accurate, works on slopes):
 *   height = distance x ( tan(angle to top)  -  tan(angle to base) )
 *
 * Single-angle method (level ground, quicker):
 *   height = distance x tan(angle to top)  +  your eye height
 *
 * Angles are read from DeviceOrientationEvent.beta, which is 0 degrees when the
 * phone's top edge points at the horizon and increases as you tilt it upward.
 * Look ALONG the top edge of the phone at the target, then tap Capture.
 */
export const ClinometerTool: React.FC<ClinometerToolProps> = ({ treeData, readOnly = false, onUpdate }) => {
  const [mode, setMode] = useState<Mode>('two-angle');
  const [distance, setDistance] = useState<number>(0);
  const [eyeHeight, setEyeHeight] = useState<number>(1.6);
  const [topAngle, setTopAngle] = useState<number | null>(null);
  const [baseAngle, setBaseAngle] = useState<number | null>(null);

  const [sensorActive, setSensorActive] = useState(false);
  const [liveAngle, setLiveAngle] = useState<number | null>(null);
  const [sensorError, setSensorError] = useState<string>('');
  const [saved, setSaved] = useState(false);

  const liveAngleRef = useRef<number | null>(null);

  // Listen to the phone's tilt sensor while it is switched on.
  useEffect(() => {
    if (!sensorActive) return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.beta === null) return;
      // beta: 0 = top edge level with horizon, positive = tilted up.
      const angle = Math.round(e.beta * 10) / 10;
      liveAngleRef.current = angle;
      setLiveAngle(angle);
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => window.removeEventListener('deviceorientation', handleOrientation, true);
  }, [sensorActive]);

  const startSensor = async () => {
    setSensorError('');
    try {
      // iOS 13+ requires explicit permission, triggered by a user tap.
      const anyEvent = DeviceOrientationEvent as any;
      if (typeof anyEvent?.requestPermission === 'function') {
        const state = await anyEvent.requestPermission();
        if (state !== 'granted') {
          setSensorError('Motion access was declined. You can still type the angles in manually below.');
          return;
        }
      }
      if (typeof DeviceOrientationEvent === 'undefined') {
        setSensorError('This device has no tilt sensor. Type the angles in manually below.');
        return;
      }
      setSensorActive(true);
    } catch {
      setSensorError('Could not start the tilt sensor. Type the angles in manually below.');
    }
  };

  const captureTop = () => { if (liveAngleRef.current !== null) setTopAngle(liveAngleRef.current); };
  const captureBase = () => { if (liveAngleRef.current !== null) setBaseAngle(liveAngleRef.current); };

  const reset = () => {
    setTopAngle(null);
    setBaseAngle(null);
    setSaved(false);
  };

  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Work out the height from whatever has been entered so far.
  let height: number | null = null;
  if (distance > 0 && topAngle !== null) {
    if (mode === 'two-angle') {
      if (baseAngle !== null) {
        height = distance * (Math.tan(toRad(topAngle)) - Math.tan(toRad(baseAngle)));
      }
    } else {
      height = distance * Math.tan(toRad(topAngle)) + eyeHeight;
    }
  }
  const heightRounded = height !== null && isFinite(height) && height > 0 ? Math.round(height * 10) / 10 : null;

  const saveToReport = () => {
    if (readOnly || heightRounded === null) return;
    onUpdate({ ...treeData, height: heightRounded });
    setSaved(true);
  };

  const AngleReadout = ({ label, value, onCapture, hint }: {
    label: string; value: number | null; onCapture: () => void; hint: string;
  }) => (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--forest)] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
        <span className="text-2xl font-semibold text-[var(--leaf)]">
          {value !== null ? `${value.toFixed(1)}°` : '—'}
        </span>
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-3">{hint}</p>
      <button
        onClick={onCapture}
        disabled={readOnly || !sensorActive || liveAngle === null}
        className="w-full flex items-center justify-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-2 rounded-lg hover:bg-[var(--moss)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Compass size={16} />
        Capture {value !== null ? '(re-capture)' : ''}
      </button>
    </div>
  );

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-1">
        <Ruler className="text-[var(--leaf)]" size={22} />
        <h2 className="text-xl font-semibold">Measure Tree Height</h2>
      </div>
      <p className="text-sm text-[var(--text-muted)] mb-6">
        Stand a measured distance from the tree, aim your phone's top edge at the tree, and capture the angles.
      </p>

      {/* Method toggle */}
      <div className="flex gap-2 mb-6">
        {([
          { id: 'two-angle', label: 'Two-angle (best)' },
          { id: 'single-angle', label: 'Single-angle' },
        ] as { id: Mode; label: string }[]).map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); setSaved(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
              mode === m.id
                ? 'bg-[rgba(90,143,90,0.15)] text-[var(--leaf)] border-[var(--border-bright)]'
                : 'text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Distance + eye height inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
            Horizontal distance to trunk (m)
          </label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={distance || ''}
            disabled={readOnly}
            onChange={(e) => { setDistance(parseFloat(e.target.value) || 0); setSaved(false); }}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--forest)] text-[var(--text-primary)] focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="e.g., 10"
          />
        </div>
        {mode === 'single-angle' && (
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Your eye height (m)
            </label>
            <input
              type="number"
              min="0"
              step="0.05"
              value={eyeHeight || ''}
              disabled={readOnly}
              onChange={(e) => { setEyeHeight(parseFloat(e.target.value) || 0); setSaved(false); }}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--forest)] text-[var(--text-primary)] focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="e.g., 1.6"
            />
          </div>
        )}
      </div>

      {/* Sensor control */}
      {!sensorActive ? (
        <button
          onClick={startSensor}
          disabled={readOnly}
          className="w-full flex items-center justify-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-3 rounded-lg hover:bg-[var(--moss)] transition-colors mb-4"
        >
          <Compass size={18} />
          Turn on tilt sensor
        </button>
      ) : (
        <div className="rounded-lg border border-[var(--border-bright)] bg-[rgba(90,143,90,0.10)] p-3 mb-4 text-center">
          <span className="text-sm text-[var(--text-secondary)]">Live angle: </span>
          <span className="text-xl font-semibold text-[var(--leaf)]">
            {liveAngle !== null ? `${liveAngle.toFixed(1)}°` : 'move your phone…'}
          </span>
        </div>
      )}

      {sensorError && (
        <div className="flex items-start gap-2 rounded-lg border border-[rgba(212,160,23,0.3)] bg-[rgba(212,160,23,0.12)] p-3 mb-4">
          <AlertTriangle size={16} className="text-[var(--amber-light)] mt-0.5 shrink-0" />
          <p className="text-sm text-[var(--text-secondary)]">{sensorError}</p>
        </div>
      )}

      {/* Angle capture */}
      <div className={`grid grid-cols-1 ${mode === 'two-angle' ? 'md:grid-cols-2' : ''} gap-4 mb-4`}>
        <AngleReadout
          label="Angle to top"
          value={topAngle}
          onCapture={captureTop}
          hint="Aim at the very top of the tree, then capture."
        />
        {mode === 'two-angle' && (
          <AngleReadout
            label="Angle to base"
            value={baseAngle}
            onCapture={captureBase}
            hint="Aim at the base of the trunk (usually a downward angle)."
          />
        )}
      </div>

      {/* Manual entry fallback */}
      <details className="mb-6">
        <summary className="text-sm text-[var(--text-muted)] cursor-pointer hover:text-[var(--text-secondary)]">
          No sensor? Type angles manually
        </summary>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Top angle (°)</label>
            <input
              type="number" step="0.1" disabled={readOnly}
              value={topAngle ?? ''}
              onChange={(e) => { setTopAngle(e.target.value === '' ? null : parseFloat(e.target.value)); setSaved(false); }}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--forest)] text-[var(--text-primary)] focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          {mode === 'two-angle' && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Base angle (°)</label>
              <input
                type="number" step="0.1" disabled={readOnly}
                value={baseAngle ?? ''}
                onChange={(e) => { setBaseAngle(e.target.value === '' ? null : parseFloat(e.target.value)); setSaved(false); }}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--forest)] text-[var(--text-primary)] focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Negative if looking down"
              />
            </div>
          )}
        </div>
      </details>

      {/* Result */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 text-center mb-4">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-1">
          Estimated height
        </p>
        <p className="text-4xl font-semibold text-[var(--leaf)]">
          {heightRounded !== null ? `${heightRounded.toFixed(1)} m` : '—'}
        </p>
        {heightRounded === null && (
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Enter a distance and capture the angle{mode === 'two-angle' ? 's' : ''} to see the height.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={saveToReport}
          disabled={readOnly || heightRounded === null}
          className="flex-1 flex items-center justify-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-3 rounded-lg hover:bg-[var(--moss)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Check size={18} />
          {saved ? 'Saved to Tree Data' : 'Save height to Tree Data'}
        </button>
        <button
          onClick={reset}
          disabled={readOnly}
          className="flex items-center justify-center gap-2 border border-[var(--border)] text-[var(--text-secondary)] px-4 py-3 rounded-lg hover:text-[var(--text-primary)] hover:border-[var(--border-bright)] transition-colors"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>

      {saved && (
        <p className="text-xs text-[var(--leaf)] mt-3 text-center">
          Height added to Tree Data. Press <strong>Save</strong> on the report to store it permanently.
        </p>
      )}
    </div>
  );
};
