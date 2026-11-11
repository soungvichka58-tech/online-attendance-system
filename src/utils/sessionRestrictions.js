import { DEFAULT_RADIUS_METERS, validateLocationSettings } from './location.js';

export const emptyLocationSettings = () => ({
  requiresLocation: false, latitude: '', longitude: '', radiusMeters: DEFAULT_RADIUS_METERS,
});

export const locationSettingsFromSession = (session) => ({
  requiresLocation: session.requiresLocation === true,
  latitude: session.location?.latitude ?? '',
  longitude: session.location?.longitude ?? '',
  radiusMeters: session.radiusMeters ?? DEFAULT_RADIUS_METERS,
});

// The class list and location parts of a session request to attendflow-service.
// rosterList is a saved student list ({ id, ... }) or null. Throws on invalid location input.
export function buildSessionRestrictions(rosterList, settings) {
  const location = validateLocationSettings(settings);
  return {
    roster_list_id: rosterList?.id ?? null,
    location: location
      ? { latitude: location.latitude, longitude: location.longitude, radius_meters: location.radiusMeters }
      : null,
  };
}
