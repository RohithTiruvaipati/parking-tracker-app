import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import * as turf from '@turf/turf';
import { loadHomeData, updatePolygonAvailability } from '../../src/services/supabase';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

const HOME_ID = 'H1';

export default function HomeScreen() {
  const [polygon, setPolygon] = useState<any>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [inside, setInside] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadPolygon = async () => {
    setIsLoading(true);
    setError(null);

    const { data, error } = await loadHomeData(HOME_ID);

    if (error) {
      setError(error.message);
      setIsLoading(false);
      return;
    }

    if (!data || data.length === 0 || !data[0].polygon) {
      setError('Parking zone not found');
      setIsLoading(false);
      return;
    }

    setPolygon(data[0].polygon);
    setIsLoading(false);
  };

  const startLocationTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      setError('Location permission denied');
      return;
    }

    Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 2000,
        distanceInterval: 2
      },
      (location) => {
        const { latitude, longitude, accuracy } = location.coords;

        setCoords({ lat: latitude, lng: longitude });
        setAccuracy(accuracy ?? null);

        if (polygon) {
          const point = turf.point([longitude, latitude]);
          const isInside = turf.booleanPointInPolygon(point, polygon);
          setInside(isInside);
          updatePolygonAvailability(HOME_ID, isInside);
        }
      }
    );
  };


  useEffect(() => {
    loadPolygon();
  }, []);

  useEffect(() => {
    if (polygon) {
      startLocationTracking();
      
    }
  }, [polygon]);


  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <IconSymbol name="location.circle.fill" size={32} color="#2563eb" />
        <ThemedText type="title">Parking Tracker</ThemedText>
      </View>

      {error && (
        <View style={styles.errorCard}>
          <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#ef4444" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <ThemedText type="subtitle">Current Status</ThemedText>
          {inside !== null && (
            <View style={[styles.statusBadge, { backgroundColor: inside ? '#22c55e' : '#ef4444' }]}>
              <ThemedText style={styles.statusText}>
                {inside ? 'IN ZONE' : 'OUTSIDE'}
              </ThemedText>
            </View>
          )}
        </View>
        
        <View style={styles.locationInfo}>
          <View style={styles.infoRow}>
            <IconSymbol name="location.fill" size={16} color="#6b7280" />
            <ThemedText style={styles.infoText}>
              {coords ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}` : 'Detecting location...'}
            </ThemedText>
          </View>
          
          {accuracy && (
            <View style={styles.infoRow}>
              <IconSymbol name="scope" size={16} color="#6b7280" />
              <ThemedText style={styles.infoText}>Accuracy: ±{accuracy.toFixed(1)}m</ThemedText>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionsCard}>
        <Pressable style={styles.actionButton} onPress={loadPolygon} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <IconSymbol name="arrow.clockwise" size={20} color="#ffffff" />
              <ThemedText style={styles.buttonText}>Refresh Zone</ThemedText>
            </>
          )}
        </Pressable>

        <Link href="/homeTest" asChild>
          <Pressable style={[styles.actionButton, styles.secondaryButton]}>
            <IconSymbol name="gear" size={20} color="#2563eb" />
            <ThemedText style={[styles.buttonText, styles.secondaryButtonText]}>Test Mode</ThemedText>
          </Pressable>
        </Link>
      </View>

      {polygon && (
        <View style={styles.detailsCard}>
          <ThemedText type="subtitle">Zone Details</ThemedText>
          <View style={styles.polygonInfo}>
            <ThemedText style={styles.detailLabel}>Coordinates:</ThemedText>
            <ThemedText style={styles.detailValue}>
              {polygon.coordinates[0].length} points
            </ThemedText>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statusCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  locationInfo: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
  },
  actionsCard: {
    margin: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 12,
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#2563eb',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#2563eb',
  },
  detailsCard: {
    margin: 16,
    padding: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  polygonInfo: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  errorCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    flex: 1,
  },
});
