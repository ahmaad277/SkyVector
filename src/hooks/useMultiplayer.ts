import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase, isSupabaseReady } from '../supabase/client';
import { ensureAuthSession } from '../supabase/auth';
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
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const authPromiseRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const prepareAuth = useCallback(async (): Promise<string | null> => {
    if (!isSupabaseReady) {
      setError('Supabase not configured');
      return null;
    }
    if (authUserId) return authUserId;
    if (authPromiseRef.current) return authPromiseRef.current;

    setIsLoadingAuth(true);
    setError(null);

    authPromiseRef.current = (async () => {
      try {
        const { id } = await ensureAuthSession();
        setAuthUserId(id);
        return id;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Authentication failed';
        setError(message);
        return null;
      } finally {
        setIsLoadingAuth(false);
        authPromiseRef.current = null;
      }
    })();

    return authPromiseRef.current;
  }, [authUserId]);

  useEffect(() => {
    if (!isSupabaseReady) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.id) {
        setAuthUserId(session.user.id);
        setIsLoadingAuth(false);
        setError(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

  const joinRealtimeChannel = useCallback((roomData: Room) => {
    if (channel) {
      supabase.removeChannel(channel);
    }

    const newChannel = supabase.channel(`room:${roomData.code}`);

    newChannel
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomData.id}` },
        () => {
          supabase
            .from('room_players')
            .select('*')
            .eq('room_id', roomData.id)
            .then(({ data }) => {
              if (data) setPlayers(data);
            });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomData.id}` },
        (payload) => {
          setRoom(payload.new as Room);
        }
      )
      .subscribe();

    setChannel(newChannel);
  }, [channel]);

  const createRoom = useCallback(async (username: string, mode: MultiplayerMode = 'coop_shared', level: number = 1) => {
    if (!isSupabaseReady) {
      setError('Supabase not configured');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { id: userId } = await ensureAuthSession();
      setAuthUserId(userId);

      const code = generateCode();
      const seed = Math.floor(Math.random() * 1000000);

      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert({
          code,
          host_id: userId,
          mode,
          level,
          seed,
          status: 'lobby',
        })
        .select()
        .single();

      if (roomError) throw roomError;

      const { data: playerData, error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: roomData.id,
          player_id: userId,
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
      joinRealtimeChannel(roomData);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : err instanceof Error
            ? err.message
            : 'Failed to create room';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [joinRealtimeChannel]);

  const joinRoom = useCallback(async (code: string, username: string) => {
    if (!isSupabaseReady) {
      setError('Supabase not configured');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { id: userId } = await ensureAuthSession();
      setAuthUserId(userId);

      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', code.toUpperCase())
        .single();

      if (roomError || !roomData) throw new Error('Room not found');
      if (roomData.status !== 'lobby') throw new Error('Room already in progress');

      const { data: existingPlayers, error: existingError } = await supabase
        .from('room_players')
        .select('*')
        .eq('room_id', roomData.id);

      if (existingError) throw existingError;
      if (existingPlayers.length >= roomData.max_players) throw new Error('Room is full');

      const slot = existingPlayers.length + 1;
      const colors = ['cyan', 'magenta', 'amber', 'lime', 'coral', 'violet'];
      const color = colors[(slot - 1) % colors.length];

      const { data: playerData, error: playerError } = await supabase
        .from('room_players')
        .insert({
          room_id: roomData.id,
          player_id: userId,
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
      joinRealtimeChannel(roomData);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to join room';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [joinRealtimeChannel]);

  const leaveRoom = useCallback(async () => {
    const currentRoom = roomRef.current;
    if (!currentRoom || !isSupabaseReady) return;
    try {
      const { id: userId } = await ensureAuthSession();
      await supabase
        .from('room_players')
        .delete()
        .eq('room_id', currentRoom.id)
        .eq('player_id', userId);

      if (channel) {
        supabase.removeChannel(channel);
        setChannel(null);
      }
      setRoom(null);
      setPlayers([]);
    } catch (err) {
      console.error('Error leaving room:', err);
    }
  }, [channel]);

  const updateReadyStatus = useCallback(async (isReady: boolean) => {
    const currentRoom = roomRef.current;
    if (!currentRoom || !isSupabaseReady) return;
    try {
      const { id: userId } = await ensureAuthSession();
      await supabase
        .from('room_players')
        .update({ is_ready: isReady })
        .eq('room_id', currentRoom.id)
        .eq('player_id', userId);
    } catch (err) {
      console.error('Error updating ready status:', err);
    }
  }, []);

  const startGame = useCallback(async () => {
    const currentRoom = roomRef.current;
    if (!currentRoom || !isSupabaseReady) return;
    try {
      const { id: userId } = await ensureAuthSession();
      if (userId !== currentRoom.host_id) throw new Error('Only host can start game');

      await supabase
        .from('rooms')
        .update({ status: 'playing' })
        .eq('id', currentRoom.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start game';
      setError(message);
    }
  }, []);

  return {
    room,
    players,
    loading,
    isLoadingAuth,
    authUserId,
    error,
    createRoom,
    joinRoom,
    leaveRoom,
    updateReadyStatus,
    startGame,
    channel,
    prepareAuth,
  };
}
