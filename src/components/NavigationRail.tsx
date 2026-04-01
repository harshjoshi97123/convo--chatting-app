import { 
  MessageCircle, 
  Hash, 
  Clock, 
  Users, 
  Settings, 
  User,
  MessageSquare
} from 'lucide-react';

import { motion } from 'motion/react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface NavigationRailProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  currentUser: {
    name: string;
    avatar?: string | null;
  };
  onSettingsClick: () => void;
  onProfileClick: () => void;
}

const getInitials = (name: string) => {
  if (!name || name === 'Loading...') return 'U';
  return name.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};


export function NavigationRail({
  activeTab,
  onTabChange,
  currentUser,
  onSettingsClick,
  onProfileClick,
}: NavigationRailProps) {


  const navItems = [
    { id: 'chats', icon: MessageCircle, label: 'Chats', color: 'blue' },
    { id: 'rooms', icon: Hash, label: 'Rooms', color: 'orange' },
    { id: 'scheduled', icon: Clock, label: 'Scheduled', color: 'purple' },
    { id: 'contacts', icon: Users, label: 'Contacts', color: 'green' },
  ];

  return (
    <div className="hidden md:flex flex-col w-20 border-r bg-background h-full py-6 items-center justify-between z-10">
      <div className="flex flex-col items-center gap-8 w-full">
        {/* App Logo */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mb-4"
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </motion.div>


        {/* Nav Items */}
        <TooltipProvider delayDuration={0}>
          <div className="flex flex-col gap-4 w-full px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onTabChange(item.id)}
                      className={`relative w-full aspect-square flex items-center justify-center rounded-2xl transition-all duration-300 group ${
                        isActive 
                          ? 'bg-primary/10 text-primary shadow-sm' 
                          : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeNavIndicator"
                          className="absolute left-0 w-1 h-8 bg-primary rounded-r-full"
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                      
                      <Icon className={`w-6 h-6 transition-transform duration-300 ${
                        isActive ? 'scale-110' : 'group-hover:scale-110'
                      }`} />
                      
                      {isActive && (
                        <div className="absolute inset-0 rounded-2xl ring-2 ring-primary/20 ring-inset pointer-events-none" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium">
                    {item.label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>
      </div>

      <div className="flex flex-col items-center gap-4 w-full px-2">
        <TooltipProvider delayDuration={0}>
          {/* Settings */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onSettingsClick}
                className="w-12 h-12 rounded-2xl text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Settings className="w-6 h-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>

          {/* Profile */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onProfileClick}
                className="relative w-12 h-12 mt-2"
              >
                <Avatar className="w-12 h-12 border-2 border-background shadow-md hover:scale-105 transition-transform">
                  {currentUser.avatar && (
                    <AvatarImage src={currentUser.avatar} alt={currentUser.name} className="object-cover" />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                    {getInitials(currentUser.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{currentUser.name}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
