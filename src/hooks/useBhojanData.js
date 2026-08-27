import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

export function useLiveDonations() {
  const [donations, setDonations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial records
  const fetchDonations = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDonations(data || []);
    } catch (err) {
      console.error('Error fetching donations:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDonations();

    // Unique channel per hook instance to prevent collision
    const channelId = `donations_stream_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'donations' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setDonations((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setDonations((prev) =>
              prev.map((item) => (item.id === payload.new.id ? payload.new : item))
            );
          } else if (payload.eventType === 'DELETE') {
            setDonations((prev) => prev.filter((item) => item.id === payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDonations]);

  const addDonation = async (newDonation) => {
    const { data, error } = await supabase
      .from('donations')
      .insert([newDonation])
      .select();

    if (error) throw error;
    return data;
  };

  const updateDonationStatus = async (id, updates) => {
    const payload = typeof updates === 'string' ? { status: updates } : updates;

    // Optimistic local state update
    setDonations((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...payload } : item))
    );

    const { data, error } = await supabase
      .from('donations')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) {
      fetchDonations(); // Rollback if server fails
      throw error;
    }
    return data;
  };

  return {
    donations,
    loading,
    addDonation,
    updateDonationStatus,
    refetch: fetchDonations
  };
}

export function useLiveLogistics() {
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchLogistics = useCallback(async () => {
    try {
      setLoading(true);
      const [driversRes, routesRes] = await Promise.all([
        supabase.from('drivers').select('*'),
        supabase.from('delivery_routes').select('*').order('created_at', { ascending: false })
      ]);

      if (driversRes.data) setDrivers(driversRes.data);
      if (routesRes.data) setRoutes(routesRes.data);
    } catch (err) {
      console.error('Error fetching logistics data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogistics();

    const channelId = `logistics_stream_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drivers' },
        () => fetchLogistics()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'delivery_routes' },
        () => fetchLogistics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchLogistics]);

  return { drivers, routes, loading, refetch: fetchLogistics };
}