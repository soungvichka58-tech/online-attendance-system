export const DEFAULT_RADIUS_METERS = 100;

export function validateLocationSettings(settings) {
  if (!settings.requiresLocation) return null;
  const latitude = Number(settings.latitude);
  const longitude = Number(settings.longitude);
  const radiusMeters = Number(settings.radiusMeters);
  if (settings.latitude == null || String(settings.latitude).trim() === '' || !Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error('Enter a classroom latitude between -90 and 90.');
  }
  if (settings.longitude == null || String(settings.longitude).trim() === '' || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error('Enter a classroom longitude between -180 and 180.');
  }
  if (!Number.isInteger(radiusMeters) || radiusMeters < 10 || radiusMeters > 5000) {
    throw new Error('Allowed distance must be a whole number between 10 and 5,000 meters.');
  }
  return { latitude, longitude, radiusMeters };
}

export function distanceInMeters(lat1, lon1, lat2, lon2) {
  const radians = (value) => value * Math.PI / 180;
  const a = Math.sin(radians(lat2 - lat1) / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(radians(lon2 - lon1) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(Math.min(1, a)), Math.sqrt(Math.max(0, 1 - a)));
}

export function checkStudentLocation(position, settings) {
  const target = validateLocationSettings(settings);
  const { latitude, longitude, accuracy } = position.coords;
  if (![latitude, longitude, accuracy].every(Number.isFinite)
      || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || accuracy < 0) {
    throw new Error('Your device returned an invalid location. Please try again.');
  }
  if (accuracy > target.radiusMeters) {
    throw new Error(`Location accuracy is ±${Math.ceil(accuracy)} m. Enable precise location and retry; accuracy must be within ${target.radiusMeters} m.`);
  }
  const distanceMeters = distanceInMeters(latitude, longitude, target.latitude, target.longitude);
  if (distanceMeters > target.radiusMeters) {
    throw new Error(`You are ${Math.ceil(distanceMeters)} m from the classroom. Move within ${target.radiusMeters} m to check in.`);
  }
  return { latitude, longitude, accuracy, distanceMeters };
}

export function getCurrentPosition() {
  if (!globalThis.isSecureContext) {
    return Promise.reject(new Error('Location requires HTTPS or localhost. Open the secure attendance link.'));
  }
  if (!globalThis.navigator?.geolocation) {
    return Promise.reject(new Error('This browser does not support location. Use a device with location services.'));
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, (error) => {
      const messages = {
        1: 'Location access was denied. Allow precise location in your browser settings and try again.',
        2: 'Your location is unavailable. Turn on location services and try again.',
        3: 'Finding your location timed out. Move to a place with better GPS reception and try again.',
      };
      reject(new Error(messages[error.code] || 'Unable to get your location. Please try again.'));
    }, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
  });
}
