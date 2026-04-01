import { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase/client';

export interface CallSignalPayload {
  type: 'call:request' | 'call:accept' | 'call:reject' | 'call:hangup' | 'webrtc:offer' | 'webrtc:answer' | 'webrtc:ice-candidate';
  from: string;
  fromName: string;
  to: string;
  isVideo: boolean;
  data?: any;
}

class CallSignalingService {
  private channel: RealtimeChannel | null = null;
  private currentUserId: string | null = null;
  private listeners: Set<(payload: CallSignalPayload) => void> = new Set();

  /**
   * Subscribes to the signaling channel for a specific user.
   */
  subscribe(userId: string, onSignal: (payload: CallSignalPayload) => void) {
    console.log(`[Signaling] Subscribing listener for user:${userId}`);
    this.listeners.add(onSignal);
    
    if (this.currentUserId === userId && this.channel) {
      console.log('[Signaling] Re-using existing channel for user:', userId);
      return this.channel;
    }

    this.currentUserId = userId;
    if (this.channel) {
      console.log('[Signaling] Closing old channel room...');
      this.channel.unsubscribe();
    }

    const supabase = getSupabaseClient();
    const roomName = `calls:${userId}`;
    
    this.channel = supabase.channel(roomName, {
      config: { broadcast: { self: true } }
    });

    this.channel
      .on('broadcast', { event: 'signal' }, ({ payload }) => {
        console.log(`[Signaling] RECV at ${new Date().toLocaleTimeString()}:`, payload.type, 'FROM:', payload.fromName || payload.from, 'PAYLOAD:', payload);
        this.listeners.forEach(l => l(payload as CallSignalPayload));
      })
      .subscribe((status) => {
        console.log(`[Signaling] Subscription Status (${roomName}):`, status);
      });

    return this.channel;
  }

  unsubscribe(onSignal?: (payload: CallSignalPayload) => void) {
    if (onSignal) {
      this.listeners.delete(onSignal);
      console.log(`[Signaling] Listener removed. Remaining: ${this.listeners.size}`);
    } else {
      console.log('[Signaling] Unsubscribing all listeners and closing channel...');
      this.listeners.clear();
      if (this.channel) {
        this.channel.unsubscribe();
        this.channel = null;
      }
      this.currentUserId = null;
    }
  }

  /**
   * Sends a signal to a specific recipient.
   */
  async sendSignal(payload: CallSignalPayload) {
    const supabase = getSupabaseClient();
    const targetRoom = `calls:${payload.to}`;
    
    console.log('[Signaling] SEND:', payload.type, 'TO:', payload.to);
    
    // If sending to ourselves, just broadcast on our own channel
    if (this.currentUserId === payload.to && this.channel) {
      console.log('[Signaling] Self-sending signal...');
      this.channel.send({ type: 'broadcast', event: 'signal', payload });
      return;
    }

    // Join the recipient's room temporarily to deliver the signal
    const tempChannel = supabase.channel(targetRoom, {
      config: { broadcast: { self: true } }
    });

    tempChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        console.log(`[Signaling] Joined ${targetRoom}, broadcasting ${payload.type}...`);
        
        const send = async () => {
          const result = await tempChannel.send({
            type: 'broadcast',
            event: 'signal',
            payload
          });
          console.log(`[Signaling] Broadcast result for ${payload.type}:`, result);
        };

        // Send multiple times to ensure delivery across flaky connections
        await send();
        setTimeout(send, 500); 
        setTimeout(send, 1000);
        
        // Wait then cleanup
        setTimeout(() => {
          supabase.removeChannel(tempChannel);
          console.log(`[Signaling] Temp channel ${targetRoom} removed`);
        }, 3000);
      } else if (status === 'CHANNEL_ERROR') {
        console.error(`[Signaling] Critical Error: Could not join ${targetRoom}`);
      }
    });
  }
}

export const callSignaling = new CallSignalingService();
