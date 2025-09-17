import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, UserPlus, Shield } from "lucide-react";

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  citizen_id?: string;
  role: 'citizen' | 'officer' | 'admin';
  created_at: string;
}

export const UserManagement = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoting, setPromoting] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProfiles((data || []) as Profile[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const promoteToAdmin = async (userId: string) => {
    setPromoting(userId);
    try {
      const { error } = await supabase.rpc('make_admin', {
        target_user_id: userId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "User promoted to admin successfully",
      });
      
      fetchProfiles(); // Refresh the list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to promote user",
        variant: "destructive",
      });
    } finally {
      setPromoting(null);
    }
  };

  const promoteToOfficer = async (userId: string) => {
    setPromoting(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: 'officer' })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "User promoted to officer successfully",
      });
      
      fetchProfiles(); // Refresh the list
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to promote user",
        variant: "destructive",
      });
    } finally {
      setPromoting(null);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'destructive';
      case 'officer':
        return 'default';
      default:
        return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">User Management</h2>
        <p className="text-muted-foreground">Manage user roles and permissions</p>
      </div>

      <div className="grid gap-4">
        {profiles.map((profile) => (
          <Card key={profile.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{profile.full_name}</CardTitle>
                  <CardDescription>Phone: {profile.phone}</CardDescription>
                  {profile.citizen_id && (
                    <CardDescription>ID: {profile.citizen_id}</CardDescription>
                  )}
                </div>
                <Badge variant={getRoleBadgeVariant(profile.role)}>
                  {profile.role.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {profile.role === 'citizen' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => promoteToOfficer(profile.user_id)}
                      disabled={promoting === profile.user_id}
                    >
                      {promoting === profile.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserPlus className="h-4 w-4" />
                      )}
                      Promote to Officer
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => promoteToAdmin(profile.user_id)}
                      disabled={promoting === profile.user_id}
                    >
                      {promoting === profile.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Shield className="h-4 w-4" />
                      )}
                      Promote to Admin
                    </Button>
                  </>
                )}
                {profile.role === 'officer' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => promoteToAdmin(profile.user_id)}
                    disabled={promoting === profile.user_id}
                  >
                    {promoting === profile.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Shield className="h-4 w-4" />
                    )}
                    Promote to Admin
                  </Button>
                )}
                {profile.role === 'admin' && (
                  <Badge variant="outline">Cannot be demoted</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {profiles.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">No users found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};