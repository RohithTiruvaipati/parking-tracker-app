import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import * as Location from 'expo-location';
import * as turf from '@turf/turf';

import { loadHomeData, updatePolygonAvailability } from '../src/services/supabase';

const HOME_ID = 'H1';

export default function HomeTest() {
  const [polygon, setPolygon] = useState<any>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [inside, setInside] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  // 🔹 Load polygon from Supabase
  const loadPolygon = async () => {
    console.log('loadPolygon called')
    setError(null);

    const { data, error } = await loadHomeData(HOME_ID);

    console.log(data)

    if (error) {
      setError(error.message);
      return;
    }

    if (!data || data.length === 0 || !data[0].polygon) {
      setError('Polygon not found');
      return;
    }

    
    setPolygon(data[0].polygon);
    
  };

  // 🔹 Start GPS tracking
  const startLocationTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      setError('Location permission denied');
      return;
    }

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 1000,
        distanceInterval: 1
      },
      (location) => {
        const { latitude, longitude, accuracy } = location.coords;

        setCoords({ lat: latitude, lng: longitude });
        setAccuracy(accuracy ?? null);

        if (polygon) {
          const point = turf.point([longitude, latitude]);
          const isInside = turf.booleanPointInPolygon(point, polygon);
          setInside(isInside);
        }
      }
    );
  };

  // Use turf to check the phone coords in poilygon and send the responses in supabase and update status
  const checkPolygonLogic = (HOME_ID: string) => {
    if (polygon && coords) {
      const point = turf.point([coords.lng, coords.lat]);
      const isInside = turf.booleanPointInPolygon(point, polygon);
      setInside(isInside);
      console.log("isInside", isInside);
      updatePolygonAvailability(HOME_ID, isInside);
    }
  };




  // 🔹 Load polygon on mount
  useEffect(() => {
    loadPolygon();
  }, []);

  // 🔹 Start GPS once polygon exists
  useEffect(() => {
    if (polygon) {
      startLocationTracking();
      checkPolygonLogic(HOME_ID);
      
    }
  }, [polygon]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Home Test (Expo)</Text>

      {error && <Text style={styles.error}>Error: {error}</Text>}

      <View style={styles.card}>
        <Text style={styles.label}>Current Coordinates</Text>
        <Text style={styles.value}>
          {coords
            ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
            : 'Waiting for GPS...'}
        </Text>
        {accuracy && (
          <Text style={styles.subValue}>Accuracy: ±{accuracy.toFixed(1)}m</Text>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Geofence Status</Text>
        <Text
          style={[
            styles.value,
            { color: inside ? '#22c55e' : '#ef4444' }
          ]}
        >
          {inside === null ? 'Calculating...' : inside ? 'INSIDE' : 'OUTSIDE'}
        </Text>
      </View>

      <Pressable style={styles.button} onPress={loadPolygon}>
        <Text style={styles.buttonText}>Reload Polygon</Text>
      </Pressable>

      {polygon && (
        <View style={styles.card}>
          <Text style={styles.label}>Polygon GeoJSON</Text>
          <Text style={styles.json}>
            {JSON.stringify(polygon.coordinates[0], null, 2)}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#0f172a'
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16
  },
  label: {
    color: '#94a3b8',
    marginBottom: 6
  },
  value: {
    color: '#ffffff',
    fontSize: 18
  },
  subValue: {
    color: '#cbd5f5',
    marginTop: 4
  },
  error: {
    color: '#f87171',
    marginBottom: 12
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold'
  },
  json: {
    color: '#e5e7eb',
    fontSize: 12
  }
});