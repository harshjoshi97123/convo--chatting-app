import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Bell, Lock, MessageSquare, Palette, Moon, Sun, User as UserIcon, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { projectId } from '../utils/supabase/info';

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessToken: string;
  currentUser: any; // Added to enable SQL fallback mapping
  onWallpaperChange?: (wallpaper: string) => void;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  theme?: string;
  onThemeChange?: (theme: string) => void;
  onLogoutClick?: () => void;
  onProfileClick?: () => void;
}

const WALLPAPERS = [
  { id: 'default', name: 'Default', preview: 'bg-white' },
  { id: 'light-gradient', name: 'Light Gradient', preview: 'bg-gradient-to-br from-blue-50 to-purple-50' },
  { id: 'dark-gradient', name: 'Dark Gradient', preview: 'bg-gradient-to-br from-gray-800 to-gray-900' },
  { id: 'geometric', name: 'Geometric', preview: 'bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(0,0,0,.05)_10px,rgba(0,0,0,.05)_20px)]' },
  { id: 'dots', name: 'Dots Pattern', preview: 'bg-[radial-gradient(circle,rgba(0,0,0,.05)_1px,transparent_1px)] bg-[size:20px_20px]' },
  { id: 'waves', name: 'Waves', preview: 'bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50' },
];

const THEMES = [
  { id: 'light', name: 'Light', preview: 'bg-white border text-black' },
  { id: 'dark', name: 'Dark', preview: 'bg-zinc-950 text-white border-zinc-800' },
  { id: 'purple', name: 'Purple Gradient', preview: 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white' },
  { id: 'sunset', name: 'Sunset Silk', preview: 'bg-gradient-to-br from-orange-400 to-rose-500 text-white' },
  { id: 'glass', name: 'Glass UI', preview: 'bg-slate-900 border border-white/20 text-white backdrop-blur-md' },
  { id: 'liquid-glass', name: 'Liquid Glass 2.0', preview: 'bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-[0_0_20px_rgba(34,211,238,0.6)]' },
  { id: 'nebula', name: 'Nebula', preview: 'bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(217,70,239,0.5)]' },
  { id: 'aurora', name: 'Aurora Borealis', preview: 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', preview: 'bg-zinc-950 border-2 border-pink-500 text-cyan-400 shadow-[0_0_20px_rgba(255,0,119,0.4)]' },
  { id: 'silk', name: 'Morning Silk', preview: 'bg-orange-50 text-orange-950 border-orange-100 shadow-sm' },
];

export function SettingsDialog({
  open,
  onOpenChange,
  accessToken,
  currentUser,
  onWallpaperChange,
  darkMode = false,
  onToggleDarkMode,
  theme = 'light',
  onThemeChange,
  onLogoutClick,
  onProfileClick
}: SettingsDialogProps) {
  const [settings, setSettings] = useState<any>(() => {
     try {
       const cached = localStorage.getItem(`convo-settings-${currentUser?.id || 'default'}`);
       return cached ? JSON.parse(cached) : {
         notifications: { messageNotifications: true, callNotifications: true, groupNotifications: true, soundEnabled: true },
         privacy: { lastSeen: 'everyone', profilePhoto: 'everyone', about: 'everyone', readReceipts: true },
         chatSettings: { wallpaper: 'default', fontSize: 'medium', enterToSend: true },
       };
     } catch (e) {
       return {
         notifications: { messageNotifications: true, callNotifications: true, groupNotifications: true, soundEnabled: true },
         privacy: { lastSeen: 'everyone', profilePhoto: 'everyone', about: 'everyone', readReceipts: true },
         chatSettings: { wallpaper: 'default', fontSize: 'medium', enterToSend: true },
       };
     }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    let success = false;
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/settings`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const finalSettings = data.settings || settings;
        setSettings(finalSettings);
        localStorage.setItem(`convo-settings-${currentUser?.id || 'default'}`, JSON.stringify(finalSettings));
        success = true;
      }
    } catch (error) {
      console.warn('[FetchSettings] Edge Function failure, trying SQL:', error);
    }

    if (!success && currentUser?.id) {
       try {
         const { publicAnonKey } = await import('../utils/supabase/info');
         const res = await fetch(`https://${projectId}.supabase.co/rest/v1/kv_store_5b740c2f?key=eq.settings:${currentUser.id}&select=value`, {
            headers: { 'apikey': publicAnonKey, 'Authorization': `Bearer ${accessToken || publicAnonKey}` }
         });
         if (res.ok) {
           const data = await res.json();
           if (data && data[0]) {
             setSettings(data[0].value);
             localStorage.setItem(`convo-settings-${currentUser.id}`, JSON.stringify(data[0].value));
           }
         }
       } catch (e) {
         console.error('[FetchSettings] SQL Fallback failed:', e);
       }
    }
  };

  const updateSettings = async (newSettings: any) => {
    setIsLoading(true);
    // Optimistic local update
    setSettings(newSettings);
    localStorage.setItem(`convo-settings-${currentUser?.id || 'default'}`, JSON.stringify(newSettings));

    let success = false;
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-5b740c2f/settings`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(newSettings),
        }
      );

      if (response.ok) {
        toast.success('Settings synced to cloud!');
        success = true;
      }
    } catch (error) {
      console.warn('[UpdateSettings] Edge Function failure, trying SQL:', error);
    }

    if (!success && currentUser?.id) {
       try {
          const { publicAnonKey } = await import('../utils/supabase/info');
          const res = await fetch(`https://${projectId}.supabase.co/rest/v1/kv_store_5b740c2f`, {
            method: 'POST',
            headers: { 
              'apikey': publicAnonKey, 
              'Authorization': `Bearer ${accessToken || publicAnonKey}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
            },
            body: JSON.stringify({
              key: `settings:${currentUser.id}`,
              value: newSettings,
              updated_at: new Date().toISOString()
            })
          });

          if (res.ok) {
             toast.success('Settings saved (Vault mode)');
          } else {
             throw new Error('SQL Save failed');
          }
       } catch (e) {
          console.error('[UpdateSettings] SQL Fallback failed:', e);
          toast.error('Offline: Settings saved locally only');
       }
    }
    
    setIsLoading(false);
  };

  const handleNotificationChange = (key: string, value: boolean) => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    };
    updateSettings(newSettings);
  };

  const handlePrivacyChange = (key: string, value: string | boolean) => {
    const newSettings = {
      ...settings,
      privacy: {
        ...settings.privacy,
        [key]: value,
      },
    };
    updateSettings(newSettings);
  };

  const handleChatSettingsChange = (key: string, value: string | boolean) => {
    const newSettings = {
      ...settings,
      chatSettings: {
        ...settings.chatSettings,
        [key]: value,
      },
    };
    updateSettings(newSettings);
    
    if (key === 'wallpaper' && onWallpaperChange) {
      onWallpaperChange(value as string);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] h-[620px] p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            Manage your notifications, privacy, and chat preferences.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="notifications" className="flex-1">
          <TabsList className="w-full justify-start px-6 rounded-none border-b bg-transparent">
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="w-4 h-4" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2">
              <Lock className="w-4 h-4" />
              Privacy
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="w-4 h-4" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="account" className="gap-2">
              <UserIcon className="w-4 h-4" />
              Account
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[450px]">
            {/* Notifications Tab */}
            <TabsContent value="notifications" className="p-6 space-y-6 m-0">
              <div>
                <h3 className="mb-4">Notification Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Message Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified when you receive new messages
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.messageNotifications}
                      onCheckedChange={(checked: boolean) =>
                        handleNotificationChange('messageNotifications', checked)
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Call Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about incoming calls
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.callNotifications}
                      onCheckedChange={(checked: boolean) =>
                        handleNotificationChange('callNotifications', checked)
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Group Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Get notified about group messages
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.groupNotifications}
                      onCheckedChange={(checked: boolean) =>
                        handleNotificationChange('groupNotifications', checked)
                      }
                      disabled={isLoading}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sound</Label>
                      <p className="text-sm text-muted-foreground">
                        Play notification sounds
                      </p>
                    </div>
                    <Switch
                      checked={settings.notifications.soundEnabled}
                      onCheckedChange={(checked: boolean) =>
                        handleNotificationChange('soundEnabled', checked)
                      }
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Privacy Tab */}
            <TabsContent value="privacy" className="p-6 space-y-6 m-0">
              <div>
                <h3 className="mb-4">Who can see my...</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Last Seen</Label>
                    <Select
                      value={settings.privacy.lastSeen}
                      onValueChange={(value) => handlePrivacyChange('lastSeen', value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everyone">Everyone</SelectItem>
                        <SelectItem value="contacts">My Contacts</SelectItem>
                        <SelectItem value="nobody">Nobody</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Profile Photo</Label>
                    <Select
                      value={settings.privacy.profilePhoto}
                      onValueChange={(value) => handlePrivacyChange('profilePhoto', value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everyone">Everyone</SelectItem>
                        <SelectItem value="contacts">My Contacts</SelectItem>
                        <SelectItem value="nobody">Nobody</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>About</Label>
                    <Select
                      value={settings.privacy.about}
                      onValueChange={(value) => handlePrivacyChange('about', value)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="everyone">Everyone</SelectItem>
                        <SelectItem value="contacts">My Contacts</SelectItem>
                        <SelectItem value="nobody">Nobody</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div className="space-y-0.5">
                      <Label>Read Receipts</Label>
                      <p className="text-sm text-muted-foreground">
                        Let others know when you've read their messages
                      </p>
                    </div>
                    <Switch
                      checked={settings.privacy.readReceipts}
                      onCheckedChange={(checked: boolean) =>
                        handlePrivacyChange('readReceipts', checked)
                      }
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Chat Settings Tab */}
            <TabsContent value="chat" className="p-6 space-y-6 m-0">
              <div>
                <h3 className="mb-4 flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Chat Wallpaper
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {WALLPAPERS.map((wallpaper) => (
                    <button
                      key={wallpaper.id}
                      onClick={() => handleChatSettingsChange('wallpaper', wallpaper.id)}
                      className={`relative h-24 rounded-lg border-2 transition-all ${
                        settings.chatSettings.wallpaper === wallpaper.id
                          ? 'border-blue-500 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      disabled={isLoading}
                    >
                      <div className={`w-full h-full rounded-md ${wallpaper.preview}`}></div>
                      <p className="absolute bottom-2 left-2 right-2 text-xs bg-white/90 rounded px-2 py-1 text-center">
                        {wallpaper.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Font Size</Label>
                  <Select
                    value={settings.chatSettings.fontSize}
                    onValueChange={(value) => handleChatSettingsChange('fontSize', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Small</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="large">Large</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enter to Send</Label>
                    <p className="text-sm text-muted-foreground">
                      Press Enter to send messages
                    </p>
                  </div>
                  <Switch
                    checked={settings.chatSettings.enterToSend}
                    onCheckedChange={(checked) =>
                      handleChatSettingsChange('enterToSend', checked)
                    }
                    disabled={isLoading}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="p-6 space-y-6 m-0">
              <div>
                <h3 className="mb-4 flex items-center gap-2">
                  {darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                  Theme
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Dark Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Switch between light and dark theme
                      </p>
                    </div>
                    <Switch
                      checked={darkMode}
                      onCheckedChange={onToggleDarkMode}
                    />
                  </div>

                  {/* Theme Preview */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <button
                      onClick={() => !darkMode && onToggleDarkMode?.()}
                      className={`relative h-24 rounded-xl border-2 transition-all overflow-hidden ${
                        !darkMode ? 'border-blue-500 ring-2 ring-blue-200' : 'border-border hover:border-muted-foreground/40'
                      }`}
                    >
                      <div className="w-full h-full bg-white dark:bg-zinc-100 flex flex-col p-2 gap-1 text-gray-700 dark:text-gray-900">
                        <div className="w-full h-3 bg-gray-100 dark:bg-zinc-200 rounded" />
                        <div className="flex gap-1 flex-1">
                          <div className="w-1/3 bg-gray-50 dark:bg-zinc-50 rounded" />
                          <div className="flex-1 bg-blue-50 dark:bg-blue-100 rounded" />
                        </div>
                      </div>
                      <p className="absolute bottom-1.5 left-0 right-0 text-center text-xs font-medium">
                        Light
                      </p>
                    </button>
                    <button
                      onClick={() => darkMode && onToggleDarkMode?.()}
                      className={`relative h-24 rounded-xl border-2 transition-all overflow-hidden ${
                        darkMode ? 'border-blue-500 ring-2 ring-blue-800' : 'border-border hover:border-muted-foreground/40'
                      }`}
                    >
                      <div className="w-full h-full bg-gray-900 flex flex-col p-2 gap-1">
                        <div className="w-full h-3 bg-gray-800 rounded" />
                        <div className="flex gap-1 flex-1">
                          <div className="w-1/3 bg-gray-800 rounded" />
                          <div className="flex-1 bg-gray-700 rounded" />
                        </div>
                      </div>
                      <p className="absolute bottom-1.5 left-0 right-0 text-center text-xs font-medium text-gray-300">
                        Dark
                      </p>
                    </button>
                  </div>

                  {/* App Global Color Theme */}
                  <div className="mt-6">
                    <Label className="mb-3 block">Color Theme</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {THEMES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => onThemeChange?.(t.id)}
                          className={`relative h-20 rounded-xl border-2 transition-all overflow-hidden ${
                            theme === t.id ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800' : 'border-border hover:border-muted-foreground/40'
                          }`}
                        >
                          <div className={`w-full h-full flex items-end justify-center p-2 ${t.preview}`}>
                            <span className="text-xs font-medium bg-background/50 backdrop-blur-md px-2 py-1 rounded w-full text-center text-foreground">{t.name}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Account Tab */}
            <TabsContent value="account" className="p-6 space-y-6 m-0">
              <div>
                <h3 className="mb-4 flex items-center gap-2">
                  <UserIcon className="w-5 h-5" />
                  Account Management
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-xl bg-card">
                    <div className="space-y-0.5">
                      <Label className="text-base">Edit Profile</Label>
                      <p className="text-sm text-muted-foreground">
                        Change your name, avatar, and bio
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onOpenChange(false);
                        onProfileClick?.();
                      }}
                      className="text-sm bg-secondary text-secondary-foreground hover:bg-secondary/80 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                      Edit Profile
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-destructive/20 rounded-xl bg-destructive/5">
                    <div className="space-y-0.5">
                      <Label className="text-base text-destructive">Sign Out</Label>
                      <p className="text-sm text-muted-foreground">
                        Log out of your account on this device
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        onOpenChange(false);
                        onLogoutClick?.();
                      }}
                      className="text-sm bg-destructive text-destructive-foreground hover:bg-destructive/90 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}