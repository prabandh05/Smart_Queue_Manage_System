import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, AlertTriangle } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-destructive/20">
          <CardContent className="pt-8 pb-6 text-center space-y-6">
            <div className="space-y-2">
              <AlertTriangle className="h-16 w-16 text-destructive mx-auto" />
              <h1 className="text-6xl font-bold text-destructive">404</h1>
              <h2 className="text-2xl font-semibold text-foreground">Page Not Found</h2>
              <p className="text-muted-foreground">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>
            
            <div className="space-y-3">
              <Link to="/" className="w-full">
                <Button className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Go to Homepage
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={() => window.history.back()} 
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              Requested path: {location.pathname}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
