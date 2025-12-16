import { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Collapsible } from '@/components/ui/collapsible';

import { getData, supabase } from '../../src/services/supabase';

interface ParkingSpot {
  id: string;
  status: string;
  created_at?: string;
}

export default function ExploreScreen() {
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setupRealTimeUpdates = () => {
    const channel = supabase.channel('parking-spots-updates')
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'parking_spots' 
      }, (payload) => {
        console.log('Real-time update received in zones tab:', payload);
        
        // Update the parkingSpots state with the new data
        setParkingSpots(prevSpots => 
          prevSpots.map(spot => 
            spot.id === payload.new.id 
              ? { ...spot, ...payload.new }
              : spot
          )
        );
      })
      .subscribe();
      
    return channel;
  };

  const fetchParkingSpots = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getData();
      console.log('Raw data from Supabase:', data);
      
      // Count the statuses for debugging
      const available = data?.filter(spot => spot.status?.trim().toLowerCase() === 'available').length || 0;
      const notAvailable = data?.filter(spot => spot.status?.trim().toLowerCase() === 'notavailable').length || 0;
      console.log('Status counts - Available:', available, 'Not Available:', notAvailable);
      
      setParkingSpots(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch parking spots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParkingSpots();
    
    // Set up real-time updates
    const channel = setupRealTimeUpdates();
    
    // Cleanup function to unsubscribe when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusColor = (status: string) => {
    // Normalize status by trimming whitespace and converting to lowercase
    const normalizedStatus = status?.trim().toLowerCase();
    
    switch (normalizedStatus) {
      case 'available':
        return '#22c55e';
      case 'notavailable':
      case 'occupied':
        return '#ef4444';
      case 'reserved':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    // Normalize status by trimming whitespace and converting to lowercase
    const normalizedStatus = status?.trim().toLowerCase();
    
    switch (normalizedStatus) {
      case 'available':
        return 'checkmark.circle.fill';
      case 'notavailable':
      case 'occupied':
        return 'xmark.circle.fill';
      case 'reserved':
        return 'clock.fill';
      default:
        return 'questionmark.circle.fill';
    }
  };

  const getDisplayStatus = (status: string) => {
    // Normalize status for display
    const normalizedStatus = status?.trim().toLowerCase();
    
    switch (normalizedStatus) {
      case 'available':
        return 'Available';
      case 'notavailable':
      case 'occupied':
        return 'Occupied';
      case 'reserved':
        return 'Reserved';
      default:
        return 'Unknown';
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={fetchParkingSpots} />
      }
    >
      <View style={styles.header}>
        <IconSymbol name="list.bullet.rectangle.fill" size={32} color="#2563eb" />
        <ThemedText type="title">Parking Zones</ThemedText>
      </View>

      {error && (
        <View style={styles.errorCard}>
          <IconSymbol name="exclamationmark.triangle.fill" size={20} color="#ef4444" />
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <ThemedText style={styles.statNumber}>{parkingSpots.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Zones</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statNumber}>
            {parkingSpots.filter(spot => spot.status?.trim().toLowerCase() === 'available').length}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Available</ThemedText>
        </View>
        <View style={styles.statCard}>
          <ThemedText style={styles.statNumber}>
            {parkingSpots.filter(spot => spot.status?.trim().toLowerCase() === 'notavailable').length}
          </ThemedText>
          <ThemedText style={styles.statLabel}>Occupied</ThemedText>
        </View>
      </View>

      <Collapsible title="All Parking Zones">
        {parkingSpots.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="parkingsign" size={48} color="#d1d5db" />
            <ThemedText style={styles.emptyText}>No parking zones found</ThemedText>
            <ThemedText style={styles.emptySubtext}>Pull down to refresh</ThemedText>
          </View>
        ) : (
          <View style={styles.spotsList}>
            {parkingSpots.map((spot) => (
              <View key={spot.id} style={styles.spotCard}>
                <View style={styles.spotHeader}>
                  <View style={styles.spotInfo}>
                    <IconSymbol 
                      name={getStatusIcon(spot.status)} 
                      size={20} 
                      color={getStatusColor(spot.status)} 
                    />
                    <ThemedText style={styles.spotId}>Zone {spot.id}</ThemedText>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(spot.status) }]}>
                    <ThemedText style={styles.statusText}>{getDisplayStatus(spot.status)}</ThemedText>
                  </View>
                </View>
                
                {spot.created_at && (
                  <ThemedText style={styles.timestamp}>
                    Created: {new Date(spot.created_at).toLocaleDateString()}
                  </ThemedText>
                )}
              </View>
            ))}
          </View>
        )}
      </Collapsible>

      <Collapsible title="System Information">
        <View style={styles.infoSection}>
          <View style={styles.infoRow}>
            <IconSymbol name="info.circle.fill" size={16} color="#6b7280" />
            <ThemedText style={styles.infoText}>Real-time parking zone tracking</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol name="location.fill" size={16} color="#6b7280" />
            <ThemedText style={styles.infoText}>GPS-based geofencing detection</ThemedText>
          </View>
          <View style={styles.infoRow}>
            <IconSymbol name="table.fill" size={16} color="#6b7280" />
            <ThemedText style={styles.infoText}>Powered by Supabase</ThemedText>
          </View>
        </View>
      </Collapsible>
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
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  spotsList: {
    gap: 12,
  },
  spotCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  spotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  spotInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spotId: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
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
  infoSection: {
    gap: 12,
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
});
