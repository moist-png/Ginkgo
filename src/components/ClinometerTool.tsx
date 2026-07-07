import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TreeData } from '../types';
import { Ruler, Check, RotateCcw, AlertTriangle, Camera, ArrowDown, ArrowUp, X } from 'lucide-react';

interface ClinometerToolProps {
  treeData: TreeData;
  readOnly?: boolean;
  onUpdate: (treeData: TreeData) => void;
}

/**
 * Live-camera clinometer (two-angle method).
 *
 *   height = distance x ( tan(angleToTop) - tan(angleToBase) )
 *
 * The phone is held upright in portrait. The camera's line of sight runs
 * straight through the centre cross-hair. When the phone is vertical the
 * cross-hair points at the horizon (0 degrees). Tilting the top of the phone
 * back to look up increases DeviceOrientationEvent.beta beyond 90, so the
 * elevation angle we care about is (beta - 90).
 *
 * The two-angle method needs no eye-height and works on sloping ground: aim at
 * the base of the trunk and capture, then aim at the very top and capture.
 */

type Step = 'setup' | 'base' | 'top' | 'result';

export const ClinometerTool: React.FC<ClinometerToolProps> = ({ treeData, readOnly = false, onUpdate }) => {
  const [step, setStep] = useState<Step>('setup');
  const [distance, setDistance] = useState<number>(0);

  const [cameraOn, setCameraOn] = useState(false);
  const [liveAngle, setLiveAngle] = useState<number | null>(null);
  const [baseAngle, setBaseAngle] = useState<number | null>(null);
  const [topAngle, setTopAngle] = useState<number | null>(null);

  const [cameraError, setCameraError] = useState('');
  const [sensorError, setSensorError] = useState('');
  const [manualMode, setManualMode] = useState(false);
  const [saved, setSaved] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const liveAngleRef = useRef<number | null>(null);

  // --- Device tilt sensor --------------------------------------------------
  const handleOrientation = useCallback((e: DeviceOrientationEvent) => {
    if (e.beta === null || e.beta === undefined) return;
    const elevation = Math.round((e.beta - 90) * 10) / 10; // 0 = level with horizon
    liveAngleRef.current = elevation;
    setLiveAngle(elevation);
  }, []);

  // --- Start / stop --------------------------------------------------------
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    window.removeEventListener('deviceorientation', handleOrientation, true);
    setCameraOn(false);
  }, [handleOrientation]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  const start = async () => {
    setCameraError('');
    setSensorError('');

    // 1) Motion permission (iOS 13+ needs an explicit prompt on a tap)
    try {
      const anyEvent = DeviceOrientationEvent as any;
      if (typeof anyEvent?.requestPermission === 'function') {
        const state = await anyEvent.requestPermission();
        if (state !== 'granted') {
          setSensorError('Motion access was declined, so angles can\'t be read automatically. Use "Enter angle manually" instead.');
        }
      }
      if (typeof DeviceOrientationEvent !== 'undefined') {
        window.addEventListener('deviceorientation', handleOrientation, true);
      } else {
        setSensorError('This device has no tilt sensor. Use "Enter angle manually" instead.');
      }
    } catch {
      setSensorError('Could not start the tilt sensor. Use "Enter angle manually" instead.');
    }

    // 2) Camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraOn(true);
    } catch {
      setCameraError('Camera access was blocked. You can still measure using "Enter angle manually", or allow camera access in your browser settings.');
    }

    setStep('base');
  };

  // --- Capture -------------------------------------------------------------
  const captureCurrent = () => {
    const a = liveAngleRef.current;
    if (a === null) return;
    if (step === 'base') { setBaseAngle(a); setStep('top'); }
    else if (step === 'top') { setTopAngle(a); setStep('result'); }
  };

  const redo = () => {
    setBaseAngle(null);
    setTopAngle(null);
    setSaved(false);
    setStep('base');
  };

  // --- Height calculation --------------------------------------------------
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  let height: number | null = null;
  if (distance > 0 && topAngle !== null && baseAngle !== null) {
    height = distance * (Math.tan(toRad(topAngle)) - Math.tan(toRad(baseAngle)));
  }
  const heightRounded = height !== null && isFinite(height) && height > 0 ? Math.round(height * 10) / 10 : null;

  const saveToReport = () => {
    if (readOnly || heightRounded === null) return;
    onUpdate({ ...treeData, height: heightRounded });
    setSaved(true);
  };

  // --- Instruction text per step ------------------------------------------
  const banner = {
    base: { icon: ArrowDown, title: 'Aim at the BASE of the trunk', body: 'Line up the cross-hair with the bottom of the tree, hold steady, then tap Capture.' },
    top:  { icon: ArrowUp,   title: 'Aim at the TOP of the tree',   body: 'Line up the cross-hair with the very highest point, hold steady, then tap Capture.' },
  } as const;

  // ========================================================================
  //  SETUP STEP
  // ========================================================================
  if (step === 'setup') {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <Ruler className="text-[var(--leaf)]" size={22} />
          <h2 className="text-xl font-semibold">Measure Tree Height</h2>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-6">
          Uses your phone camera and tilt sensor. Stand back far enough to see the whole tree, then aim at its base and its top.
        </p>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-5 mb-5">
          <ol className="space-y-3 text-sm text-[var(--text-secondary)]">
            <li className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-[rgba(90,143,90,0.2)] text-[var(--leaf)] flex items-center justify-center font-semibold">1</span> Measure your distance from the trunk (e.g. with a tape or by pacing) and type it in below.</li>
            <li className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-[rgba(90,143,90,0.2)] text-[var(--leaf)] flex items-center justify-center font-semibold">2</span> Hold the phone upright. Aim the cross-hair at the base of the trunk and capture.</li>
            <li className="flex gap-3"><span className="shrink-0 w-6 h-6 rounded-full bg-[rgba(90,143,90,0.2)] text-[var(--leaf)] flex items-center justify-center font-semibold">3</span> Tilt up, aim the cross-hair at the treetop and capture. The height appears automatically.</li>
          </ol>
        </div>

        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
          Horizontal distance to the trunk (metres)
        </label>
        <input
          type="number" min="0" step="0.1" inputMode="decimal"
          value={distance || ''}
          disabled={readOnly}
          onChange={(e) => setDistance(parseFloat(e.target.value) || 0)}
          className="w-full px-3 py-3 text-lg border border-[var(--border)] rounded-lg bg-[var(--forest)] text-[var(--text-primary)] focus:ring-2 focus:ring-green-500 focus:border-transparent mb-5"
          placeholder="e.g. 10"
        />

        <button
          onClick={start}
          disabled={readOnly || distance <= 0}
          className="w-full flex items-center justify-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-4 rounded-lg hover:bg-[var(--moss)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-base font-medium"
        >
          <Camera size={20} />
          {distance > 0 ? 'Start camera' : 'Enter a distance first'}
        </button>

        {treeData.height ? (
          <p className="text-xs text-[var(--text-muted)] mt-4 text-center">Current saved height: <strong className="text-[var(--leaf)]">{treeData.height} m</strong></p>
        ) : null}
      </div>
    );
  }

  // ========================================================================
  //  RESULT STEP
  // ========================================================================
  if (step === 'result') {
    return (
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Ruler className="text-[var(--leaf)]" size={22} />
          <h2 className="text-xl font-semibold">Measurement complete</h2>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-6 text-center mb-5">
          <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--text-muted)] mb-1">Estimated height</p>
          <p className="text-5xl font-semibold text-[var(--leaf)]">
            {heightRounded !== null ? `${heightRounded.toFixed(1)} m` : '—'}
          </p>
          <div className="flex justify-center gap-6 mt-4 text-sm text-[var(--text-muted)]">
            <span>Distance: <strong className="text-[var(--text-secondary)]">{distance} m</strong></span>
            <span>Base: <strong className="text-[var(--text-secondary)]">{baseAngle?.toFixed(1)}°</strong></span>
            <span>Top: <strong className="text-[var(--text-secondary)]">{topAngle?.toFixed(1)}°</strong></span>
          </div>
          {heightRounded === null && (
            <p className="text-xs text-[var(--amber-light)] mt-3">
              That didn't produce a valid height. Make sure the top angle is higher than the base angle, then try again.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={saveToReport}
            disabled={readOnly || heightRounded === null}
            className="flex-1 flex items-center justify-center gap-2 bg-[var(--canopy)] text-[var(--cream)] px-4 py-4 rounded-lg hover:bg-[var(--moss)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            <Check size={18} />
            {saved ? 'Saved to Tree Data' : 'Save height to Tree Data'}
          </button>
          <button
            onClick={redo}
            disabled={readOnly}
            className="flex items-center justify-center gap-2 border border-[var(--border)] text-[var(--text-secondary)] px-4 py-4 rounded-lg hover:text-[var(--text-primary)] hover:border-[var(--border-bright)] transition-colors"
          >
            <RotateCcw size={16} /> Redo
          </button>
        </div>

        {saved && (
          <p className="text-xs text-[var(--leaf)] mt-4 text-center">
            Height added to Tree Data. Press <strong>Save</strong> on the report to store it permanently.
          </p>
        )}

        <button onClick={() => { stopCamera(); setStep('setup'); }} className="w-full mt-4 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
          Start a new measurement
        </button>
      </div>
    );
  }

  // ========================================================================
  //  CAMERA STEPS (base / top)
  // ========================================================================
  const b = banner[step as 'base' | 'top'];
  const BannerIcon = b.icon;

  return (
    <div className="relative w-full" style={{ height: 'min(78vh, 720px)', background: '#000' }}>
      {/* Live camera feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 w-full h-full"
        style={{ objectFit: 'cover' }}
      />
      {!cameraOn && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--forest)]">
          <div className="text-center text-[var(--text-muted)] px-6">
            <Camera size={32} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">{cameraError || 'Starting camera…'}</p>
          </div>
        </div>
      )}

      {/* Cross-hair overlay */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        {/* horizontal reference line */}
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.5)' }} />
        {/* vertical reference line */}
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.5)' }} />
        {/* centre reticle */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 54, height: 54, borderRadius: '50%',
          border: '2px solid var(--leaf)', boxShadow: '0 0 0 2px rgba(0,0,0,0.35)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          width: 6, height: 6, borderRadius: '50%', background: 'var(--leaf)',
        }} />
      </div>

      {/* Top instruction banner */}
      <div className="absolute top-0 left-0 right-0 p-3" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0))' }}>
        <div className="flex items-start gap-2 text-white max-w-2xl mx-auto">
          <div className="shrink-0 mt-0.5 w-8 h-8 rounded-full bg-[rgba(90,143,90,0.35)] border border-[var(--leaf)] flex items-center justify-center">
            <BannerIcon size={18} className="text-[var(--leaf)]" />
          </div>
          <div>
            <p className="font-semibold leading-tight">{b.title}</p>
            <p className="text-xs text-white/80 leading-snug">{b.body}</p>
          </div>
          <button onClick={() => { stopCamera(); setStep('setup'); }} className="ml-auto shrink-0 pointer-events-auto p-1.5 rounded-full bg-black/40 text-white/80 hover:text-white" title="Close camera">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Live angle read-out near the reticle */}
      <div style={{ position: 'absolute', top: 'calc(50% + 42px)', left: '50%', transform: 'translateX(-50%)' }} className="pointer-events-none">
        <span className="px-3 py-1 rounded-full text-sm font-semibold" style={{ background: 'rgba(0,0,0,0.55)', color: 'var(--leaf)' }}>
          {liveAngle !== null ? `${liveAngle.toFixed(1)}°` : (manualMode ? 'manual' : 'move phone…')}
        </span>
      </div>

      {/* Progress chips */}
      <div className="absolute left-0 right-0 flex justify-center gap-2" style={{ bottom: 108 }}>
        <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: baseAngle !== null ? 'rgba(90,143,90,0.85)' : 'rgba(0,0,0,0.5)', color: '#fff' }}>
          Base {baseAngle !== null ? `✓ ${baseAngle.toFixed(1)}°` : ''}
        </span>
        <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: topAngle !== null ? 'rgba(90,143,90,0.85)' : 'rgba(0,0,0,0.5)', color: '#fff' }}>
          Top {topAngle !== null ? `✓ ${topAngle.toFixed(1)}°` : ''}
        </span>
      </div>

      {/* Capture control */}
      <div className="absolute left-0 right-0 bottom-0 p-4" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))' }}>
        <div className="max-w-2xl mx-auto">
          {sensorError && (
            <div className="flex items-start gap-2 rounded-lg bg-black/50 p-2 mb-3">
              <AlertTriangle size={14} className="text-[var(--amber-light)] mt-0.5 shrink-0" />
              <p className="text-xs text-white/85">{sensorError}</p>
            </div>
          )}

          {manualMode ? (
            <div className="flex items-center gap-2 mb-2">
              <input
                type="number" step="0.1" inputMode="decimal" autoFocus
                placeholder={`${step === 'base' ? 'Base' : 'Top'} angle (°)`}
                onChange={(e) => { const v = parseFloat(e.target.value); liveAngleRef.current = isFinite(v) ? v : null; setLiveAngle(isFinite(v) ? v : null); }}
                className="flex-1 px-3 py-3 rounded-lg bg-white/95 text-gray-900 text-lg"
              />
            </div>
          ) : null}

          <button
            onClick={captureCurrent}
            disabled={liveAngle === null}
            className="w-full flex items-center justify-center gap-2 bg-[var(--leaf)] text-[var(--forest)] px-4 py-4 rounded-lg font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Camera size={20} />
            Capture {step === 'base' ? 'base' : 'top'} angle
          </button>

          {!manualMode && (
            <button onClick={() => setManualMode(true)} className="w-full mt-2 text-xs text-white/70 hover:text-white pointer-events-auto">
              No sensor reading? Enter angle manually
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
