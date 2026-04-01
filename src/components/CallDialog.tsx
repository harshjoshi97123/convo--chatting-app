import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Settings2,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { callSignaling, CallSignalPayload } from '../utils/callSignaling';
import { toast } from 'sonner';
import AgoraRTC, { IAgoraRTCClient, ILocalVideoTrack, ILocalAudioTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { AGORA_CONFIG } from '../utils/agoraConfig';

/**
 * RemoteUserView Helper Component
 * Ensures that track.play() is only called when the DOM element is ready.
 */
function RemoteUserView({ user }: { user: IAgoraRTCRemoteUser }) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!user.videoTrack || !containerRef.current) return;
    
    console.log(`[Agora] Playing remote video for user: ${user.uid}`);
    user.videoTrack.play(containerRef.current);
    
    return () => {
      user.videoTrack?.stop();
    };
  }, [user.videoTrack, user.uid]);

  return (
    <div className="relative bg-slate-900 rounded-lg overflow-hidden border border-white/10 group w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 backdrop-blur-md rounded text-[10px] text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity">
        Participant {user.uid.toString().slice(0, 8)}
      </div>
    </div>
  );
}

interface CallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactName: string;
  contactId: string;
  isVideoCall: boolean;
  isIncoming?: boolean;
  currentUser: any;
  isRoomCall?: boolean;
}

export function CallDialog({ 
  open, 
  onOpenChange, 
  contactName,
  contactId,
  isVideoCall,
  isIncoming = false,
  currentUser,
  isRoomCall = false,
}: CallDialogProps) {
  const [callStatus, setCallStatus] = useState<'ringing' | 'connecting' | 'connected' | 'ended'>(isRoomCall ? 'connecting' : 'ringing');
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(isVideoCall);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const agoraClient = useRef<IAgoraRTCClient | null>(null);
  const [localAudioTrack, setLocalAudioTrack] = useState<ILocalAudioTrack | null>(null);
  const [localVideoTrack, setLocalVideoTrack] = useState<ILocalVideoTrack | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);
  
  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const ringingAudio = useRef<HTMLAudioElement | null>(null);
  const ringtoneAudio = useRef<HTMLAudioElement | null>(null);

  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [selectedMic, setSelectedMic] = useState<string>('');
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

  // Sound URLs
  const RINGING_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3'; // Outgoing
  const RINGTONE_SOUND = 'https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3'; // Incoming

  const playSound = (type: 'ringing' | 'ringtone') => {
    stopSounds();
    const url = type === 'ringing' ? RINGING_SOUND : RINGTONE_SOUND;
    const audio = new Audio(url);
    audio.loop = true;
    if (type === 'ringtone') {
      ringtoneAudio.current = audio;
      // Vibrate on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate([500, 500, 500, 500, 500]);
      }
    }
    else ringingAudio.current = audio;
    
    audio.play().catch(err => {
      console.warn('[Audio] Autoplay blocked or failed:', err);
      // If blocked, we might want to show a "Click to play sound" button or toast
    });
  };

  const stopSounds = () => {
    if (ringtoneAudio.current) {
      ringtoneAudio.current.pause();
      ringtoneAudio.current = null;
    }
    if (ringingAudio.current) {
      ringingAudio.current.pause();
      ringingAudio.current = null;
    }
    // Stop vibration
    if ('vibrate' in navigator) {
      navigator.vibrate(0);
    }
  };

  // Initialize Agora RTC
  const initAgora = async () => {
    if (agoraClient.current) return;

    agoraClient.current = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });

    // Event listeners for remote users
    agoraClient.current.on('user-published', async (user, mediaType) => {
      console.log(`[Agora] REMOTE USER PUBLISHED: ${user.uid} (${mediaType})`);
      
      try {
        await agoraClient.current?.subscribe(user, mediaType);
        console.log(`[Agora] Subscribed to ${user.uid} ${mediaType}`);
        
        if (mediaType === 'video') {
          setRemoteUsers(prev => {
            const exists = prev.find(u => u.uid === user.uid);
            if (exists) return prev.map(u => u.uid === user.uid ? user : u);
            return [...prev, user];
          });
        }

        if (mediaType === 'audio') {
          user.audioTrack?.play();
        }

        setCallStatus('connected');
      } catch (err) {
        console.error(`[Agora] Subscription failed for ${user.uid}:`, err);
      }
    });

    agoraClient.current.on('user-unpublished', (user) => {
      // For room calls, we keep the user in the list but their track might be gone
      // Actually, standard Zoom behavior is to just remove or update state
    });

    agoraClient.current.on('user-left', (user) => {
      setRemoteUsers(prev => prev.filter(u => u.uid !== user.uid));
      if (remoteUsers.length <= 1 && !isRoomCall) {
        // endCall(false); // Optionally end if 1-on-1
      }
    });

    try {
      if (!AGORA_CONFIG.APP_ID || AGORA_CONFIG.APP_ID === 'YOUR_AGORA_APP_ID_HERE') {
        throw new Error('Agora App ID is not configured. Please add it to agoraConfig.ts');
      }

      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        throw new Error('Calling requires a secure context (HTTPS). Please use localhost or an SSL-enabled domain.');
      }

      // Join the channel
      let channelName = '';
      if (isRoomCall) {
        channelName = `room_${contactId}`;
      } else {
        const sortedIds = [currentUser.id, contactId].sort();
        channelName = `call_${sortedIds[0].slice(0, 20)}_${sortedIds[1].slice(0, 20)}`;
      }
      
      console.log(`[Agora] Joining channel: ${channelName} as UID: ${currentUser.id}`);
      await agoraClient.current.join(
        AGORA_CONFIG.APP_ID,
        channelName,
        AGORA_CONFIG.TOKEN || null,
        currentUser.id
      );
      console.log('[Agora] Join success');

      // Create local tracks based on call type
      let audioTrack: ILocalAudioTrack;
      let videoTrack: ILocalVideoTrack | null = null;

      if (isVideoCall) {
        [audioTrack, videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
          { microphoneId: selectedMic || undefined },
          { cameraId: selectedCamera || undefined }
        );
        setLocalVideoTrack(videoTrack);
      } else {
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack(
          { microphoneId: selectedMic || undefined }
        );
      }
      setLocalAudioTrack(audioTrack);
      
      // Publish local tracks
      if (videoTrack) {
        await agoraClient.current.publish([audioTrack, videoTrack]);
      } else {
        await agoraClient.current.publish([audioTrack]);
      }
      
      console.log('[Agora] Joined and published local tracks');
    } catch (err: any) {
      console.error('[Agora] ERROR DURING JOIN:', err);
      
      let errorMsg = err.message || 'Could not join call';
      
      if (err.code === 'PERMISSION_DENIED') {
        errorMsg = 'Camera or Microphone permission denied. Please check your system settings.';
      } else if (err.code === 'INVALID_APP_ID') {
        errorMsg = 'The Agora App ID is invalid or not found.';
      } else if (err.code === 'INVALID_TOKEN' || err.code === 'TOKEN_EXPIRED') {
        errorMsg = 'Agora Token is missing or expired. Switch to "Testing Mode" in Console or provide a token.';
      } else if (err.message?.includes('uid')) {
        errorMsg = 'UID configuration mismatch. Ensure "String UID" is enabled in Agora Console.';
      }

      toast.error(errorMsg, { duration: 5000 });
      setCallStatus('ended');
      setTimeout(() => onOpenChange(false), 2000);
    }
  };

  // Local video playback side-effect removed in favor of direct play in RemoteUserView logic (for remote) 
  // and local ref management.
  useEffect(() => {
    if (localVideoTrack && isVideoOn && localVideoRef.current) {
      console.log('[Agora] Playing local video track');
      localVideoTrack.play(localVideoRef.current);
    }
    return () => localVideoTrack?.stop();
  }, [localVideoTrack, isVideoOn]);

  useEffect(() => {
    if (open) {
      // Pre-warm the connection/camera for the caller
      if (isRoomCall || (!isIncoming && callStatus === 'ringing')) {
        initAgora();
      }

      const handleCallSignal = async (payload: CallSignalPayload) => {
        if (payload.from !== contactId && payload.to !== contactId && payload.from !== currentUser.id) return;

        switch (payload.type) {
          case 'call:hangup':
            console.log('[Signaling] Recipient hung up');
            endCall(false);
            break;
          case 'call:reject':
            toast.error('Call rejected');
            endCall(false);
            break;
          case 'call:accept':
            if (!isIncoming) {
              setCallStatus('connecting');
              initAgora();
            }
            break;
        }
      };

      callSignaling.subscribe(currentUser.id, handleCallSignal);

      return () => {
        callSignaling.unsubscribe(handleCallSignal);
      };
    }
  }, [open, contactId, isIncoming, callStatus]);

  useEffect(() => {
    if (open) {
      if (callStatus === 'ringing') {
        playSound(isIncoming ? 'ringtone' : 'ringing');
      } else if (callStatus === 'connected' || callStatus === 'ended') {
        stopSounds();
      }
    } else {
      stopSounds();
    }
    return () => stopSounds();
  }, [open, callStatus, isIncoming]);

  useEffect(() => {
    let interval: any;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  useEffect(() => {
    let interval: any;
    if (callStatus === 'ringing' && isIncoming) {
      const originalTitle = document.title;
      interval = setInterval(() => {
        document.title = document.title === originalTitle ? '📞 Incoming Call...' : originalTitle;
      }, 1000);
      return () => {
        clearInterval(interval);
        document.title = originalTitle;
      };
    }
  }, [callStatus, isIncoming]);

  useEffect(() => {
    AgoraRTC.getCameras().then(setCameras);
    AgoraRTC.getMicrophones().then(setMics);
  }, []);

  const switchCamera = async (deviceId: string) => {
    setSelectedCamera(deviceId);
    if (localVideoTrack) {
      await (localVideoTrack as any).setDevice(deviceId);
      toast.info('Camera switched');
    }
  };

  const switchMic = async (deviceId: string) => {
    setSelectedMic(deviceId);
    if (localAudioTrack) {
      await (localAudioTrack as any).setDevice(deviceId);
      toast.info('Microphone switched');
    }
  };

  const rejectCall = () => {
    saveCallLog('rejected');
    callSignaling.sendSignal({
      type: 'call:reject',
      from: currentUser.id,
      fromName: currentUser.name,
      to: contactId,
      isVideo: isVideoCall
    });
  };

  const answerCall = () => {
    setCallStatus('connecting');
    callSignaling.sendSignal({
      type: 'call:accept',
      from: currentUser.id,
      fromName: currentUser.name,
      to: contactId,
      isVideo: isVideoCall
    });
    initAgora();
  };

  const saveCallLog = (status: 'completed' | 'missed' | 'rejected') => {
    const newLog = {
      id: Math.random().toString(36).substr(2, 9),
      type: isIncoming ? 'incoming' : 'outgoing',
      isVideo: isVideoCall,
      participantName: contactName,
      participantId: contactId,
      timestamp: new Date().toISOString(),
      duration: callDuration,
      status: status
    };
    
    const existingLogs = JSON.parse(localStorage.getItem('call_logs') || '[]');
    localStorage.setItem('call_logs', JSON.stringify([...existingLogs, newLog]));
    window.dispatchEvent(new Event('storage'));
  };

  const endCall = async (sendSignal = true) => {
    if (callStatus === 'connected') {
      saveCallLog('completed');
    } else if (callStatus === 'ringing') {
      saveCallLog(isIncoming ? 'missed' : 'completed');
    }
    setCallStatus('ended');
    
    if (sendSignal && !isRoomCall) {
      callSignaling.sendSignal({
        type: 'call:hangup',
        from: currentUser.id,
        fromName: currentUser.name,
        to: contactId,
        isVideo: isVideoCall
      });
    }

    // Close tracks
    if (localAudioTrack) {
      localAudioTrack.stop();
      localAudioTrack.close();
      setLocalAudioTrack(null);
    }
    if (localVideoTrack) {
      localVideoTrack.stop();
      localVideoTrack.close();
      setLocalVideoTrack(null);
    }

    if (agoraClient.current) {
      await agoraClient.current.leave();
      agoraClient.current = null;
    }
    
    setRemoteUsers([]);
    
    setTimeout(() => {
      onOpenChange(false);
      setCallDuration(0);
      setIsMuted(false);
      setIsVideoOn(isVideoCall);
      setCallStatus('ringing');
    }, 1000);
  };

  const toggleMute = () => {
    if (localAudioTrack) {
      localAudioTrack.setEnabled(isMuted);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localVideoTrack) {
      localVideoTrack.setEnabled(!isVideoOn);
      setIsVideoOn(!isVideoOn);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getInitials = (name: string) => {
    if (!name || name === 'Loading...') return 'U';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${isFullscreen ? 'max-w-full w-screen h-screen' : 'max-w-3xl'} p-0 overflow-hidden border-0`}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">
          {isVideoCall ? 'Video' : 'Voice'} call with {contactName}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {callStatus === 'ringing' && (isIncoming ? 'Incoming call' : 'Outgoing call')}
          {callStatus === 'connecting' && 'Connecting to call'}
          {callStatus === 'connected' && `Call in progress - ${formatDuration(callDuration)}`}
          {callStatus === 'ended' && 'Call ended'}
        </DialogDescription>
        
        <div className={`relative ${isFullscreen ? 'h-screen' : 'h-[600px]'} overflow-hidden bg-slate-950 flex flex-col items-center justify-center`}>
          
          {/* Pulsing Background for Ringing */}
          <AnimatePresence>
            {callStatus === 'ringing' && (
              <>
                <motion.div
                  className="absolute inset-0 bg-indigo-600/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-x-0 inset-y-0 bg-purple-600/10 rounded-full scale-0"
                  animate={{ scale: [0, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </>
            )}
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/90 via-slate-900/95 to-purple-950/90 backdrop-blur-3xl" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/20 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[120px] animate-pulse" />
          </div>
          
          {(callStatus === 'connected' || callStatus === 'connecting') && isVideoCall ? (
            <div className={`absolute inset-0 grid gap-1 p-1 ${
              remoteUsers.length <= 1 ? 'grid-cols-1' :
              remoteUsers.length <= 2 ? 'grid-cols-2' :
              remoteUsers.length <= 4 ? 'grid-cols-2 grid-rows-2' :
              'grid-cols-3 grid-rows-2'
            }`}>
              {remoteUsers.map(user => (
                <RemoteUserView key={user.uid} user={user} />
              ))}
              
              {callStatus === 'connecting' && remoteUsers.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                   <div className="text-center text-white">
                      <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4" />
                      <p>Establishing secure connection...</p>
                   </div>
                </div>
              )}
              
              {callStatus === 'connected' && remoteUsers.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white/60">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Waiting for others to join...</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full space-y-8 relative z-10 px-6">
              <div className="relative">
                {(callStatus === 'ringing' || callStatus === 'connecting' || !isVideoCall) && (
                  <div className="absolute inset-0 -m-4 rounded-full border-4 border-indigo-500/30 animate-ping" />
                )}
                <Avatar className="w-32 h-32 border-4 border-white/20 shadow-2xl relative z-10">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-4xl font-bold">
                    {getInitials(contactName)}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-white tracking-tight drop-shadow-md">{contactName}</h2>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-indigo-200/80 font-medium uppercase tracking-[0.2em] text-xs animate-pulse">
                    {callStatus === 'ringing' ? (isIncoming ? 'Incoming Call' : 'Calling...') : callStatus === 'connecting' ? 'Connecting...' : callStatus === 'ended' ? 'Call Ended' : ''}
                  </p>
                  {callStatus === 'connected' && (
                    <p className="text-white/60 font-mono text-sm">{formatDuration(callDuration)}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {((callStatus === 'connected') || (callStatus === 'ringing' && !isIncoming)) && isVideoCall && (
            <motion.div 
              className="absolute top-4 right-4 w-40 h-32 rounded-xl overflow-hidden border-2 border-white/30 shadow-2xl z-20"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              {isVideoOn ? (
                <div
                  ref={localVideoRef}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                  <VideoOff className="w-8 h-8 text-white/60" />
                </div>
              )}
            </motion.div>
          )}

          {callStatus === 'connected' && (
            <div className="absolute top-4 left-4 flex gap-2 z-20">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={`text-white hover:bg-white/20 ${showDeviceSettings ? 'bg-white/20' : ''}`}
                onClick={() => setShowDeviceSettings(!showDeviceSettings)}
              >
                <Settings2 className="w-5 h-5" />
              </Button>
            </div>
          )}

          <AnimatePresence>
            {showDeviceSettings && (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="absolute top-16 left-4 bg-black/60 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl z-30 w-64"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Video className="w-3 h-3" /> Camera
                    </h3>
                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                      {cameras.map(cam => (
                        <button
                          key={cam.deviceId}
                          onClick={() => switchCamera(cam.deviceId)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                            selectedCamera === cam.deviceId ? 'bg-indigo-500 text-white' : 'text-white/70 hover:bg-white/10'
                          }`}
                        >
                          {cam.label || `Camera ${cam.deviceId.slice(0, 5)}`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <Mic className="w-3 h-3" /> Microphone
                    </h3>
                    <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                      {mics.map(mic => (
                        <button
                          key={mic.deviceId}
                          onClick={() => switchMic(mic.deviceId)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors ${
                            selectedMic === mic.deviceId ? 'bg-indigo-500 text-white' : 'text-white/70 hover:bg-white/10'
                          }`}
                        >
                          {mic.label || `Mic ${mic.deviceId.slice(0, 5)}`}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
            {callStatus === 'ringing' && isIncoming ? (
              <div className="flex gap-6">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-2xl"
                    onClick={() => endCall()}
                  >
                    <PhoneOff className="w-6 h-6" />
                  </Button>
                </motion.div>
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl"
                    onClick={answerCall}
                  >
                    <Mic className="w-6 h-6" />
                  </Button>
                </motion.div>
              </div>
            ) : (callStatus === 'connected' || callStatus === 'connecting') ? (
              <div className="flex items-center gap-4">
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    variant="ghost"
                    className={`w-14 h-14 rounded-full ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'} text-white shadow-xl`}
                    onClick={toggleMute}
                  >
                    {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                  </Button>
                </motion.div>

                {isVideoCall && (
                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      size="lg"
                      variant="ghost"
                      className={`w-14 h-14 rounded-full ${!isVideoOn ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'} text-white shadow-xl`}
                      onClick={toggleVideo}
                    >
                      {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
                    </Button>
                  </motion.div>
                )}

                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    variant="ghost"
                    className={`w-14 h-14 rounded-full ${!isSpeakerOn ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'} text-white shadow-xl`}
                    onClick={() => setIsSpeakerOn(!isSpeakerOn)}
                  >
                    {isSpeakerOn ? <Volume2 className="w-6 h-6" /> : <VolumeX className="w-6 h-6" />}
                  </Button>
                </motion.div>

                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-2xl"
                    onClick={() => endCall()}
                  >
                    <PhoneOff className="w-6 h-6" />
                  </Button>
                </motion.div>
              </div>
            ) : (
              callStatus === 'ringing' && !isIncoming && (
                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    size="lg"
                    className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 shadow-2xl"
                    onClick={() => endCall()}
                  >
                    <PhoneOff className="w-6 h-6" />
                  </Button>
                </motion.div>
              )
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}