import React, { useId, useState } from 'react';
import { LocateFixed, MapPin } from 'lucide-react';
import { getCurrentPosition } from '../utils/location';

const LocationRestriction = ({ value, onChange, disabled = false, onBusyChange }) => {
  const id = useId();
  const [locating, setLocating] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const change = (field, fieldValue) => onChange({ ...value, [field]: fieldValue });

  const useMyLocation = async () => {
    setLocating(true);
    onBusyChange?.(true);
    setMessage('');
    setError('');
    try {
      const { coords } = await getCurrentPosition();
      onChange({ ...value, latitude: coords.latitude.toFixed(7), longitude: coords.longitude.toFixed(7) });
      setMessage(`Classroom point set. Device accuracy: ±${Math.ceil(coords.accuracy)} m. Check the coordinates before saving.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLocating(false);
      onBusyChange?.(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900"><MapPin className="w-4 h-4" />Classroom location</h3>
      <label className="flex items-start gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" checked={value.requiresLocation} disabled={disabled || locating} onChange={(event) => change('requiresLocation', event.target.checked)} className="mt-1 rounded text-indigo-600" />
        Require students to be near the classroom
      </label>
      {value.requiresLocation ? <>
        <p className="text-xs text-slate-600">Set the classroom point and maximum distance. Students must allow precise location when submitting attendance.</p>
        <button type="button" disabled={disabled || locating} onClick={useMyLocation} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"><LocateFixed className="w-4 h-4" />{locating ? 'Finding location…' : 'Use my current location'}</button>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label htmlFor={`${id}-latitude`} className="block text-xs font-semibold text-slate-600 mb-1">Classroom latitude</label><input id={`${id}-latitude`} type="number" step="any" min="-90" max="90" required value={value.latitude} disabled={disabled || locating} onChange={(event) => change('latitude', event.target.value)} placeholder="e.g., 11.5564" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></div>
          <div><label htmlFor={`${id}-longitude`} className="block text-xs font-semibold text-slate-600 mb-1">Classroom longitude</label><input id={`${id}-longitude`} type="number" step="any" min="-180" max="180" required value={value.longitude} disabled={disabled || locating} onChange={(event) => change('longitude', event.target.value)} placeholder="e.g., 104.9282" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></div>
        </div>
        <div><label htmlFor={`${id}-radius`} className="block text-xs font-semibold text-slate-600 mb-1">Allowed distance (meters)</label><input id={`${id}-radius`} type="number" min="10" max="5000" step="1" required disabled={disabled || locating} value={value.radiusMeters} onChange={(event) => change('radiusMeters', event.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></div>
        <p className="text-xs text-slate-500">100 m is the default. Poor location accuracy blocks check-in and asks the student to retry. Location works on HTTPS or localhost.</p>
        {message && <p role="status" className="text-xs text-emerald-700">{message}</p>}
        {error && <p role="alert" className="text-xs text-rose-700">{error} You can also enter the classroom coordinates manually.</p>}
      </> : <p className="text-xs text-slate-500">Location is not requested for this session.</p>}
    </section>
  );
};

export default LocationRestriction;
