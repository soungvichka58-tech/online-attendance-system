// Add this helper function to calculate distance in meters using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

// Inside your check-in submit handler:
const handleCheckIn = async (e) => {
  e.preventDefault();
  
  // Optional: Check if session has a target GPS location set by teacher
  if (session.requiresLocation && session.latitude && session.longitude) {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });

      const studentLat = position.coords.latitude;
      const studentLon = position.coords.longitude;
      
      const distance = calculateDistance(
        studentLat, 
        studentLon, 
        session.latitude, 
        session.longitude
      );

      // Allow if within 100 meters of the classroom target
      if (distance > 100) {
        toast.error(`You are too far from the classroom! (${Math.round(distance)}m away).`);
        return;
      }
    } catch (err) {
      toast.error('Please enable GPS location access to check in.');
      return;
    }
  }

  // Proceed with standard Firestore submission...
};