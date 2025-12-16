import { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import * as Location from 'expo-location';
import * as turf from '@turf/turf';
import { updatePolygonAvailability, supabase, getData } from '../../src/services/supabase';
import { Link } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function HomeScreen() {
  const [allSpots, setAllSpots] = useState<any[]>([]);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [inside, setInside] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [realTimeUpdate, setRealTimeUpdate] = useState<any []>([]);

  const loadAllSpots = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getData();

      if (!data || data.length === 0) {
        setError('No parking spots found');
        setAllSpots([]);
        setIsLoading(false);
        return;
      }

      setAllSpots(data);
      setIsLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An unknown error occurred');
      setAllSpots([]);
      setIsLoading(false);
      return;
    }
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
      async (location) => {
        if (allSpots.length === 0) return;

        const { latitude, longitude, accuracy } = location.coords;

        setCoords({ lat: latitude, lng: longitude });
        setAccuracy(accuracy ?? null);

        let activeSpotID = null;

        const point = turf.point([longitude, latitude]);

        for (const spot of allSpots) {
          if (!spot.polygon) continue;

          const isInside = turf.booleanPointInPolygon(point, spot.polygon);

          if (isInside) {
            activeSpotID = spot.id;
            break;
          }
        }

        if (activeSpotID) {
          setInside(true);
          updatePolygonAvailability(activeSpotID, true);
        } else {
          setInside(false);
        }
      }
    );
  };

  const showRealTime = () => {
    const channels =  supabase.channel('custom-update-channel')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parking_spots'},
    (payload) => {
        console.log('channel update received!')
        setRealTimeUpdate(prev => [...prev, payload]);
        
        // Update the allSpots state with the new data
        setAllSpots(prevSpots => 
          prevSpots.map(spot => 
            spot.id === payload.new.id 
              ? { ...spot, ...payload.new }
              : spot
          )
        );
    })
    .subscribe()
  }


  useEffect(() => {
    loadAllSpots();
    showRealTime();
  }, []);

  useEffect(() => {
    if (allSpots.length > 0) {
      startLocationTracking();
      
    }
  }, [allSpots]);


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
        <Pressable style={styles.actionButton} onPress={loadAllSpots} disabled={isLoading}>
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

      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <ThemedText type="subtitle">Real-time Updates</ThemedText>
          <View style={[styles.statusBadge, { backgroundColor: '#3b82f6' }]}>
            <ThemedText style={styles.statusText}>
              {realTimeUpdate.length > 0 ? `${realTimeUpdate.length}` : '0'}
            </ThemedText>
          </View>
        </View>
        
        <View style={styles.locationInfo}>
          <View style={styles.infoRow}>
            <IconSymbol name="antenna.radiowaves.left.and.right" size={16} color="#6b7280" />
            <ThemedText style={styles.infoText}>
              {realTimeUpdate.length > 0 
                ? `${realTimeUpdate.length} updates received` 
                : 'Listening for updates...'}
            </ThemedText>
          </View>
          
          {realTimeUpdate.length > 0 && (
            <ScrollView style={styles.updateList} nestedScrollEnabled={true}>
              {realTimeUpdate.slice(-3).reverse().map((update, index) => (
                <View key={index} style={styles.updateItem}>
                  <View style={styles.infoRow}>
                    <IconSymbol name="circle.fill" size={8} color={update.new?.status === 'occupied' ? '#ef4444' : '#22c55e'} />
                    <ThemedText style={styles.updateText}>
                      Status: {update.new?.status || 'Unknown'}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.updateTime}>
                    {new Date().toLocaleTimeString()}
                  </ThemedText>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>

      {allSpots.length > 0 && (
        <View style={styles.detailsCard}>
          <ThemedText type="subtitle">Parking Spots Status</ThemedText>
          <View style={styles.polygonInfo}>
            <ThemedText style={styles.detailLabel}>Total Spots:</ThemedText>
            <ThemedText style={styles.detailValue}>
              {allSpots.length} spots
            </ThemedText>
          </View>
          <ScrollView style={styles.spotsList} nestedScrollEnabled={true}>
            {allSpots.map((spot) => (
              <View key={spot.id} style={styles.spotItem}>
                <View style={styles.spotHeader}>
                  <ThemedText style={styles.spotId}>{spot.id}</ThemedText>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: spot.status === 'occupied' ? '#ef4444' : '#22c55e' }
                  ]}>
                    <ThemedText style={styles.statusText}>
                      {spot.status === 'occupied' ? 'OCCUPIED' : 'AVAILABLE'}
                    </ThemedText>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
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
  updateList: {
    maxHeight: 120,
    marginTop: 8,
  },
  updateItem: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  updateText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  updateTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  spotsList: {
    maxHeight: 200,
    marginTop: 12,
  },
  spotItem: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  spotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spotId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
});
