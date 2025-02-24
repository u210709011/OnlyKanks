import { useState, useEffect } from 'react';
import { LocationService, UserLocation } from '../services/location.service';

export function useLocation() {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateLocation = async () => {
    try {
      setLoading(true);
      const currentLocation = await LocationService.getCurrentLocation();
      setLocation(currentLocation);
      await LocationService.updateUserLocation(currentLocation);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    updateLocation();
  }, []);

  return { location, loading, error, updateLocation };
} 