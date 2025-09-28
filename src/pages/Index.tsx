import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Users, ClipboardCheck, Activity, Shield, LogIn, Monitor } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/hooks/use-auth";
import { Bot } from "lucide-react";

export const Index = () => {
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'signin' | 'signup' }>({
    open: false,
    mode: 'signin'
  });
  const { isAuthenticated, profile, resolvedRole, signOut, loading } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect authenticated users to their dashboard
  useEffect(() => {
    if (import.meta.env.DEV) console.log('Index useEffect - Auth state:', { isAuthenticated, profile, loading });
    
    if (!loading && isAuthenticated) {
      const role = resolvedRole || (profile?.is_admin ? 'admin' : (profile?.is_officer ? 'officer' : 'citizen'));
      if (!role) return;
      if (import.meta.env.DEV) console.log('Redirecting user based on role:', role);
      
      // Add a small delay to prevent redirect loops and ensure smooth transition
      const timer = setTimeout(() => {
        if (role === 'officer' || role === 'admin') {
          if (import.meta.env.DEV) console.log('Redirecting to officer dashboard');
          navigate('/officer', { replace: true });
        } else if (role === 'citizen') {
          if (import.meta.env.DEV) console.log('Redirecting to citizen dashboard');
          navigate('/citizen', { replace: true });
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, profile, resolvedRole, loading, navigate]);

  const features = [
    {
      icon: Users,
      title: "Real-Time Queue Updates",
      description: "Track your position and get notified when it's your turn",
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      icon: ClipboardCheck,
      title: "Smart Token Management", 
      description: "Generate tokens online with QR codes and SMS notifications",
      color: "text-secondary",
      bgColor: "bg-secondary/10"
    },
    {
      icon: Activity,
      title: "Live Status Monitoring",
      description: "Officers can manage queues efficiently with real-time controls",
      color: "text-warning",
      bgColor: "bg-warning/10"
    },
    {
      icon: Shield,
      title: "Secure & Verified",
      description: "Aadhaar-based verification ensures authentic identity",
      color: "text-success",
      bgColor: "bg-success/10"
    }
  ];

  return (
    
    <div className="min-h-screen bg-background">
      
      <div className="container mx-auto px-4">
        {/* Header */}
        <header className="bg-card border-b border-border shadow-sm">
          <div className="container mx-auto px-4 py-6">
            <div className="flex justify-between items-center">
              <div className="text-center flex-1">
                <h1 className="text-3xl font-bold text-primary mb-2">
                  Digital Queue Management System
                </h1>
                <p className="text-muted-foreground text-lg">
                  Regional Transport Office - Efficient & Transparent Service
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                 <Button
    asChild
    variant="secondary"
    className="hidden sm:inline-flex gap-2 rounded-full shadow-sm hover:shadow-md"
  >
    <a
      href="http://localhost:5173"
      target="_blank"
      rel="noreferrer"
      aria-label="Open chatbot in a new tab"
    >
      <Bot className="h-4 w-4" />
      Chatbot
    </a>
  </Button>
                {isAuthenticated ? (
                  <>
                    <span className="text-sm text-muted-foreground">
                      Welcome, {profile?.full_name}
                    </span>
                    <Button variant="outline" onClick={signOut}>
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setAuthModal({ open: true, mode: 'signin' })}
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      Sign In
                    </Button>
                    <Button 
                      onClick={() => setAuthModal({ open: true, mode: 'signup' })}
                    >
                      Sign Up
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="py-12">
          {/* Role Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="mb-6 p-4 bg-primary/10 rounded-lg">
                    <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">For Citizens</h3>
                    <p className="text-muted-foreground mb-4">
                      Get your token, track queue status, and receive real-time notifications
                    </p>
                    {isAuthenticated && (profile?.role === 'citizen' || profile?.role === 'admin') ? (
                      <Link to="/citizen">
                        <Button size="lg" className="w-full">
                          Access Dashboard
                        </Button>
                      </Link>
                    ) : (
                      <Button 
                        size="lg" 
                        className="w-full"
                        onClick={() => setAuthModal({ open: true, mode: 'signup' })}
                      >
                        Sign Up as Citizen
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="mb-6 p-4 bg-secondary/10 rounded-lg">
                    <Shield className="h-12 w-12 text-secondary mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">For Officers</h3>
                    <p className="text-muted-foreground mb-4">
                      Manage queues, call tokens, and monitor service efficiency
                    </p>
                    {isAuthenticated && (profile?.role === 'officer' || profile?.role === 'admin') ? (
                      <Link to="/officer">
                        <Button size="lg" variant="secondary" className="w-full">
                          Access Dashboard
                        </Button>
                      </Link>
                    ) : (
                      <Button 
                        size="lg" 
                        variant="secondary" 
                        className="w-full"
                        onClick={() => setAuthModal({ open: true, mode: 'signin' })}
                      >
                        Officer Login
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="mb-6 p-4 bg-warning/10 rounded-lg">
                    <Monitor className="h-12 w-12 text-warning mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Live Display</h3>
                    <p className="text-muted-foreground mb-4">
                      Public display board for current queue status and announcements
                    </p>
                    <Link to="/display">
                      <Button size="lg" variant="outline" className="w-full">
                        View Display Board
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6 text-center space-y-4">
                    <div className={`inline-flex p-3 rounded-full ${feature.bgColor}`}>
                      <Icon className={`h-8 w-8 ${feature.color}`} />
                    </div>
                    <h3 className="font-semibold text-lg">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        open={authModal.open}
        onOpenChange={(open) => setAuthModal(prev => ({ ...prev, open }))}
        mode={authModal.mode}
      />
    </div>
  );
};