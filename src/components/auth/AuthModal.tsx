import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Lock, Phone, CreditCard } from "lucide-react";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'signin' | 'signup';
}

export const AuthModal = ({ open, onOpenChange, mode: initialMode }: AuthModalProps) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    phone: '',
    citizenId: ''
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile, resolvedRole, isAuthenticated } = useAuth();

  // Auto-redirect when user signs in successfully
  useEffect(() => {
    if (import.meta.env.DEV) console.log('AuthModal useEffect - Auth state:', { isAuthenticated, profile, open });
    
    if (isAuthenticated && open) {
      if (import.meta.env.DEV) console.log('User authenticated, closing modal and redirecting');
      onOpenChange(false);
      
      // Reset form
      setFormData({
        email: '',
        password: '',
        fullName: '',
        phone: '',
        citizenId: ''
      });
      
      // Redirect based on user role
      setTimeout(() => {
        const role = resolvedRole || (profile?.is_admin ? 'admin' : (profile?.is_officer ? 'officer' : 'citizen'));
        if (!role) return;
        if (role === 'officer' || role === 'admin') {
          if (import.meta.env.DEV) console.log('Redirecting to officer dashboard');
          navigate('/officer', { replace: true });
        } else if (role === 'citizen') {
          if (import.meta.env.DEV) console.log('Redirecting to citizen dashboard');
          navigate('/citizen', { replace: true });
        }
      }, 100);
    }
  }, [isAuthenticated, profile, resolvedRole, navigate, onOpenChange, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (mode === 'signup') {
        if (import.meta.env.DEV) console.log('Starting signup process');
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: {
              full_name: formData.fullName,
              phone: formData.phone,
              citizen_id: formData.citizenId,
              role: 'citizen'
            }
          }
        });

        if (authError) {
          console.error('Signup auth error:', authError);
          throw authError;
        }

        if (import.meta.env.DEV) console.log('Signup successful, auth data:', authData);

        if (authData.user && !authData.session) {
          // User needs to confirm email
          toast({
            title: "Check Your Email",
            description: "Please check your email and click the confirmation link to complete your registration.",
          });
        } else if (authData.user && authData.session) {
          // User is immediately signed in (email confirmation disabled)
          if (import.meta.env.DEV) console.log('User signed in immediately, creating profile');
          try {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                user_id: authData.user.id,
                full_name: formData.fullName,
                phone: formData.phone,
                citizen_id: formData.citizenId,
                role: 'citizen'
              });

            if (profileError && profileError.code !== '23505') { // Ignore duplicate key errors
              if (import.meta.env.DEV) console.error('Profile creation error:', profileError);
              throw profileError;
            }

            toast({
              title: "Account Created",
              description: "Your account has been created successfully!",
            });
          } catch (profileError) {
            if (import.meta.env.DEV) console.error('Profile creation failed:', profileError);
            toast({
              title: "Account Created",
              description: "Your account has been created but there was an issue with your profile. Please try signing in.",
              variant: "destructive",
            });
          }
        }
      } else {
        if (import.meta.env.DEV) console.log('Starting signin process');
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          if (import.meta.env.DEV) console.error('Signin error:', error);
          throw error;
        }

        if (import.meta.env.DEV) console.log('Signin successful:', data);
        toast({
          title: "Signed In",
          description: "Welcome back! You have been signed in successfully.",
        });
        
        // Don't close modal immediately - let useEffect handle redirect
        // The modal will close and redirect will happen in useEffect
      }
    } catch (error: any) {
      let title = "Error";
      let description = error.message || "An error occurred. Please try again.";
      
      // Handle specific error cases
      if (error.message?.includes("over_email_send_rate_limit")) {
        title = "Rate Limit Reached";
        description = "Please wait before trying again. If you already signed up, try signing in instead.";
      } else if (error.message?.includes("User already registered")) {
        title = "Account Exists";
        description = "This email is already registered. Please sign in instead.";
      } else if (error.message?.includes("Invalid login credentials")) {
        title = "Invalid Credentials";
        description = "Please check your email and password and try again.";
      }
      // Slightly delay to ensure users notice the toast on invalid credentials
      await new Promise((r) => setTimeout(r, 50));
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setFormData({
      email: '',
      password: '',
      fullName: '',
      phone: '',
      citizenId: ''
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {mode === 'signin' 
              ? 'Sign in to your account to access the queue system' 
              : 'Create a new account to join the digital queue'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="pl-10"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                className="pl-10"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />
            </div>
          </div>

          {mode === 'signup' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    className="pl-10"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="citizenId">Citizen ID (Optional)</Label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="citizenId"
                    type="text"
                    placeholder="Enter your Aadhaar/ID"
                    className="pl-10"
                    value={formData.citizenId}
                    onChange={(e) => setFormData({ ...formData, citizenId: e.target.value })}
                  />
                </div>
              </div>

            </>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">
            {mode === 'signin' ? "Don't have an account? " : "Already have an account? "}
          </span>
          <Button variant="link" className="p-0 h-auto" onClick={switchMode}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};