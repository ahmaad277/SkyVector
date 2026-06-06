import { useState, useCallback } from 'react';
import { supabase, isSupabaseReady } from '../supabase/client';
import { getCurrentUser } from '../supabase/queries';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type MultiplayerMode = 'coop_shared' | 'coop_squad' | 'versus';
export type RoomStatus = 'lobby' | 'playing' | 'finished';

export interface RoomPlayer {
  id: string;
  room_id: string;
  player_id: string;
  username: string;
  slot: number;
  color: string;
  is_ready: boolean;
}

export interface Room {
  id: string;
  code: string;
  host_id: string;
  mode: MultiplayerMode;
  level: number;
  seed: number;
  status: RoomStatus;
  max_players: number;
}

export function useMultiplayer() {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Generate a random 6-character code
  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const createRoom = useCallback(async (username: string, mode: MultiplayerMode = 'coop_shared', level: number = 1) => {
    if (!isSupabaseReady) return setError('Supabase not configured');
    setLoading(true);
    setError(null);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const code = generateCode();
      const seed = Math.floor(Math.random() * 1000000);

      // 1. Create room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert({
          code,
          host_id: user.id,
          mode,
          level,
          seed,
          status: 'lobby',
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // 2. Join as host
      const { data: playerData, error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: roomData.id,
          player_id: user.id,
          username,
          slot: 1,
          color: 'cyan',
          is_ready: true,
        })
        .select()
        .single();

      if (playerError) throw playerError;

      setRoom(roomData);
      setPlayers([playerData]);
      joinRealtimeChannel(roomData.code);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const joinRoom = useCallback(async (code: string, username: string) => {
    if (!isSupabaseReady) return setError('Supabase not configured');
    setLoading(true);
    setError(null);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // 1. Find room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (roomError || !roomData) throw new Error('Room not found');
      if (roomData.status !== 'lobby') throw new Error('Room already in progress');

      // 2. Get current players to find next slot/color
      const { data: existingPlayers, error: existingError } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomData.id);

      if (existingError) throw existingError;
      if (existingPlayers.length >= roomData.max_players) throw new Error('Room is full');

      const slot = existingPlayers.length + 1;
      const colors = ['cyan', 'magenta', 'amber', 'lime', 'coral', 'violet'];
      const color = colors[(slot - 1) % colors.length];

      // 3. Join room
      const { data: playerData, error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: roomData.id,
          player_id: user.id,
          username,
          slot,
          color,
          is_ready: false,
        })
        .select()
        .single();

      if (playerError) throw playerError;

      setRoom(roomData);
      setPlayers([...existingPlayers, playerData]);
      joinRealtimeChannel(roomData.code);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const leaveRoom = useCallback(async () => {
    if (!room || !isSupabaseReady) return;
    try {
      const user = await getCurrentUser();
      if (user) {
        await supabase
          .from('room_players')
          .delete()
          .eq('room_id', room.id)
          .eq('player_id', user.id);
      }
      if (channel) {
        supabase.removeChannel(channel);
        setChannel(null);
      }
      setRoom(null);
      setPlayers([]);
    } catch (err) {
      console.error('Error leaving room:', err);
    }
  }, [room, channel]);

  const updateReadyStatus = useCallback(async (isReady: boolean) => {
    if (!room || !isSupabaseReady) return;
    try {
      const user = await getCurrentUser();
      if (!user) return;
      await supabase
        .from('room_players')
        .update({ is_ready: isReady })
        .eq('room_id', room.id)
        .eq('player_id', user.id);
    } catch (err) {
      console.error('Error updating ready status:', err);
    }
  }, [room]);

  const startGame = useCallback(async () => {
    if (!room || !isSupabaseReady) return;
    try {
      const user = await getCurrentUser();
      if (user?.id !== room.host_id) throw new Error('Only host can start game');
      
      await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', room.id);
    } catch (err: any) {
      setError(err.message);
    }
  }, [room]);

  const joinRealtimeChannel = (code: string) => {
    const newChannel = supabase.channel(`room:${code}`);

    newChannel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${room?.id}` },
        () => {
          // Refresh players list
          supabase
            .from('room_players')
            .select('*')
            .eq('room_id', room?.id)
            .then(({ data }) => {
              if (data) setPlayers(data);
            });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${room?.id}` },
        (payload) => {
          setRoom(payload.new as Room);
        }
      )
      .subscribe();

    setChannel(newChannel);
  };

  return {
    room,
    players,
    loading,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    updateReadyStatus,
    startGame,
    channel,
  };
}
