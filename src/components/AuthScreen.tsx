import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { getSupabaseClient } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { MessageSquare, Mail, Lock, User as UserIcon, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface AuthScreenProps {
  onAuthSuccess: (user: any, accessToken: string) => void;
}

const BackgroundOrbs = () => (
  <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10 bg-[#0a0a0c]">
    <motion.div 
      animate={{
        scale: [1, 1.2, 1],
        x: [0, 50, 0],
        y: [0, 30, 0],
      }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px]" 
    />
    <motion.div 
      animate={{
        scale: [1.2, 1, 1.2],
        x: [0, -40, 0],
        y: [0, -20, 0],
      }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px]" 
    />
    <motion.div 
      animate={{
        scale: [1, 1.1, 1],
        opacity: [0.1, 0.2, 0.1],
      }}
      transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
      className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-rose-500/10 rounded-full blur-[100px]" 
    />
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
  </div>
);

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [signupData, setSignupData] = useState({ name: '', username: '', email: '', password: '' });
  const [loginData, setLoginData] = useState({ identifier: '', password: '' });
  const [isEmailVerificationPending, setIsEmailVerificationPending] = useState(false);

  const supabase = getSupabaseClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { name, username, email, password } = signupData;
    
    // 1. Validation
    if (!name.trim()) return toast.error('Full Name is required');
    if (!username.trim() || username.length < 3) return toast.error('Username must be at least 3 characters');
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) return toast.error('Valid email is required');
    if (password.length < 6) return toast.error('Password must be at least 6 characters');

    console.log('[Auth] Attempting signup with:', email, name, username);
    setIsLoading(true);
    
    try {
      // 2. Postgres Pre-flight: Check username uniqueness
      const { data: existingUser, error: checkError } = await (supabase as any)
        .from('users')
        .select('id')
        .eq('username', username)
        .maybeSingle();
        
      if (checkError) {
         console.warn('[Auth] Database check error:', checkError);
      }
      
      if (existingUser) {
        toast.error('Username is already taken');
        setIsLoading(false);
        return;
      }

      // 3. Supabase Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password
      });

      console.log('[Auth] Auth Signup response:', { authData, authError });

      if (authError) {
        console.error(authError.message);
        if (authError.message.includes('already registered')) {
          toast.error('Email already exists');
        } else {
          toast.error(authError.message || 'Signup failed');
        }
        setIsLoading(false);
        return;
      }

      const user = authData.user;
      if (!user) {
         toast.error('Signup failed, no user returned');
         setIsLoading(false);
         return;
      }

      // 4. Postgres Database Insert
      const { error: dbError } = await (supabase as any).from('users').insert({
        id: user.id,
        name,
        username,
        email,
        avatar_url: ''
      });

      if (dbError) {
         console.error('[Auth] Postgres Insert error:', dbError);
         toast.error(dbError.message || 'Account created but failed to save profile');
      } else {
         console.log('[Auth] Database insert successful.');
      }

      // 5. Session Handling
      if (authData.session) {
         toast.success('Account created successfully!');
         onAuthSuccess(authData.user, authData.session.access_token);
      } else {
         // Email confirmation is required by Supabase project settings
         setIsEmailVerificationPending(true);
      }

    } catch (error: any) {
      console.error('[Auth] General Signup error:', error);
      toast.error(error.message || 'Signup failed due to an unexpected error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[Auth] Attempting login with:', loginData.identifier);
    setIsLoading(true);
    try {
      const email = loginData.identifier;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: loginData.password,
      });

      console.log('[Auth] Login response:', { data, error });

      if (error) {
        console.error(error.message);
        if (error.message.toLowerCase().includes('email not confirmed')) {
          toast.error('Please verify your email before logging in.');
        } else {
          toast.error(error.message || 'Login failed');
        }
        return;
      }

      if (data.session) {
        toast.success('Welcome back!');
        onAuthSuccess(data.user, data.session.access_token);
      } else {
        toast.error('Please verify your email to log in');
      }
    } catch (error: any) {
      if (error) console.error(error.message || 'Login error');
      toast.error('Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 selection:bg-indigo-500/30">
      <BackgroundOrbs />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-[440px]"
      >
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 pointer-events-none" />
          
          <div className="relative bg-[#121214]/80 backdrop-blur-3xl border border-white/10 rounded-[2.2rem] p-8 md:p-10 shadow-2xl overflow-hidden">
            
            <div className="text-center mb-10">
              <motion.div 
                whileHover={{ scale: 1.05, rotate: 5 }}
                className="inline-flex w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl items-center justify-center shadow-lg shadow-indigo-500/20 mb-6"
              >
                <MessageSquare className="w-8 h-8 text-white" />
              </motion.div>
              <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
                Convo <span className="text-indigo-400">Hub</span>
              </h1>
              <p className="text-white/40 text-sm font-medium">
                The future of seamless communication.
              </p>
            </div>

            <div className="bg-white/5 p-1.5 rounded-2xl flex gap-1 mb-10">
              <button 
                onClick={() => { setMode('login'); setIsEmailVerificationPending(false); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${mode === 'login' ? 'bg-white/10 text-white shadow-xl' : 'text-white/40 hover:text-white/60'}`}
              >
                Connect
              </button>
              <button 
                onClick={() => { setMode('signup'); setIsEmailVerificationPending(false); }}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${mode === 'signup' ? 'bg-white/10 text-white shadow-xl' : 'text-white/40 hover:text-white/60'}`}
              >
                Join Now
              </button>
            </div>

            <AnimatePresence mode="wait">
              {isEmailVerificationPending ? (
                <motion.div
                  key="verify"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="text-center py-6"
                >
                  <div className="inline-flex w-20 h-20 bg-emerald-500/20 rounded-full items-center justify-center mb-6 border border-emerald-500/30">
                    <Mail className="w-10 h-10 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">Check your inbox</h2>
                  <p className="text-white/60 text-sm leading-relaxed max-w-xs mx-auto mb-8">
                    We've sent a verification link to <strong className="text-white">{signupData.email}</strong>. Please verify your email to access the app.
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => { setMode('login'); setIsEmailVerificationPending(false); }}
                    className="h-12 border-white/10 hover:bg-white/5 text-white/80 w-full rounded-xl"
                  >
                    Return to Login
                  </Button>
                </motion.div>
              ) : mode === 'login' ? (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-white/60 text-xs ml-1 font-bold uppercase tracking-widest">Email or Username</Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                        <Input 
                          type="text"
                          placeholder="Email or @username" 
                          className="bg-white/[0.03] border-white/10 h-13 pl-12 rounded-2xl text-white placeholder:text-white/20 focus:bg-white/[0.05] focus:border-indigo-500/50 transition-all text-base"
                          value={loginData.identifier}
                          onChange={(e) => setLoginData({ ...loginData, identifier: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/60 text-xs ml-1 font-bold uppercase tracking-widest">Access Key</Label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                        <Input 
                          type="password"
                          placeholder="••••••••" 
                          className="bg-white/[0.03] border-white/10 h-13 pl-12 rounded-2xl text-white placeholder:text-white/20 focus:bg-white/[0.05] focus:border-indigo-500/50 transition-all text-base"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full h-14 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group border-none"
                      >
                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Authenticate <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" /></>}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="signup"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <form onSubmit={handleSignup} className="space-y-5">
                    <div className="space-y-2">
                      <Label className="text-white/60 text-xs ml-1 font-bold uppercase tracking-widest">Full Name</Label>
                      <div className="relative group">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                        <Input 
                          placeholder="Your identity" 
                          className="bg-white/[0.03] border-white/10 h-13 pl-12 rounded-2xl text-white placeholder:text-white/20 focus:bg-white/[0.05] focus:border-indigo-500/50 transition-all text-base"
                          value={signupData.name}
                          onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/60 text-xs ml-1 font-bold uppercase tracking-widest">Unique Handle</Label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 font-bold">@</div>
                        <Input 
                          placeholder="username" 
                          className="bg-white/[0.03] border-white/10 h-13 pl-12 rounded-2xl text-white placeholder:text-white/20 focus:bg-white/[0.05] focus:border-indigo-500/50 transition-all text-base"
                          value={signupData.username}
                          onChange={(e) => setSignupData({ ...signupData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/60 text-xs ml-1 font-bold uppercase tracking-widest">Email Address</Label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                        <Input 
                          type="email"
                          placeholder="you@domain.com" 
                          className="bg-white/[0.03] border-white/10 h-13 pl-12 rounded-2xl text-white placeholder:text-white/20 focus:bg-white/[0.05] focus:border-indigo-500/50 transition-all text-base"
                          value={signupData.email}
                          onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white/60 text-xs ml-1 font-bold uppercase tracking-widest">Access Key</Label>
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-indigo-400 transition-colors" />
                        <Input 
                          type="password"
                          placeholder="••••••••" 
                          className="bg-white/[0.03] border-white/10 h-13 pl-12 rounded-2xl text-white placeholder:text-white/20 focus:bg-white/[0.05] focus:border-indigo-500/50 transition-all text-base"
                          value={signupData.password}
                          onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full h-14 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group border-none"
                      >
                        {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <>Quick Start <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" /></>}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-10 text-center">
              <p className="text-white/20 text-xs font-medium uppercase tracking-[0.2em] mb-4">Secured by Convo Cloud</p>
              <div className="flex items-center justify-center gap-6">
                <div className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Next-Gen Privacy</span>
                <div className="h-px flex-1 bg-white/5" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center mt-8 gap-6 text-white/30 text-[10px] font-bold uppercase tracking-widest">
          <a href="#" className="hover:text-white transition-colors">Privacy Arch</a>
          <span className="opacity-20">•</span>
          <a href="#" className="hover:text-white transition-colors">Core Nodes</a>
          <span className="opacity-20">•</span>
          <a href="#" className="hover:text-white transition-colors">v2.4.0</a>
        </div>
      </motion.div>
    </div>
  );
}