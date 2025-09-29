import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TokenCard } from "@/components/queue/TokenCard";
import { QueueStats } from "@/components/queue/QueueStats";
import { UserManagement } from "@/components/admin/UserManagement";
import { useQueueData } from "@/hooks/use-queue-data";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Search, Play, CheckCircle, XCircle, RotateCcw, Bell, Users, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const OfficerDashboard = () => {
  const { tokens, stats, counters, updateTokenStatus, loading } = useQueueData();
  const { profile, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCounter, setSelectedCounter] = useState<string>("1");
  const [serviceFilter, setServiceFilter] = useState<string | "all">("all");
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (counters.length > 0) {
  // header
      const firstId = counters[0].id.toString();
      setSelectedCounter((prev) => (counters.some(c => c.id.toString() === prev) ? prev : firstId));
    }
  }, [counters]);

  const handleStatusUpdate = async (token: any, newStatus: string) => {
    let counterNumber: number | undefined = undefined;
    if (newStatus === 'serving') {
      const valid = counters.find(c => c.id.toString() === selectedCounter);
      if (!valid) {
        toast({ title: 'Select a counter', description: 'Please select an active counter before serving.', variant: 'destructive' });
        return;
      }
      counterNumber = valid.id;
    }
    await updateTokenStatus(token.id, newStatus as any, counterNumber);
  };

  const sendReminder = async (token: any) => {
    try {
      await supabase.functions.invoke('send-sms-notification', {
        body: {
          tokenId: token.id,
          type: 'reminder'
        }
      });
      
      toast({
        title: "Reminder Sent",
        description: `Reminder sent to token #${token.token_number}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send reminder",
        variant: "destructive"
      });
    }
  };

  const filteredTokens = tokens
    .filter(token => 
    token.citizen_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.citizen_phone.includes(searchTerm) ||
    token.id.includes(searchTerm) ||
    token.token_number.toString().includes(searchTerm)
  )
    .filter(token => serviceFilter === 'all' ? true : token.service_type === serviceFilter);

  // calendar
  const dayTokens = filteredTokens.filter(t => t.slot_date === selectedDate);
  const waitingTokens = dayTokens.filter(t => t.status === 'waiting');
  const servingTokens = dayTokens.filter(t => t.status === 'serving');
  const completedTokens = dayTokens.filter(t => t.status === 'completed').slice(0, 10);

  // slots
  const slotGroups: Record<number, any[]> = dayTokens.reduce((acc: Record<number, any[]>, t: any) => {
    const key = t.slot_index || 0;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});
  // slots
  Object.keys(slotGroups).forEach(k => {
    slotGroups[Number(k)].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  });
  const getDisplayCode = (t: any) => {
    const idx = (slotGroups[t.slot_index || 0] || []).findIndex(x => x.id === t.id);
    const letter = String.fromCharCode(65 + (idx >= 0 ? idx : 0));
    return `${t.slot_index}${letter}`;
  };

  const QueueManagementContent = () => (
    <div className="space-y-8">
      {/* stats */}
      <QueueStats stats={stats} />

      {/* controls */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, ID, or token number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-40"
          />
          <Select value={serviceFilter} onValueChange={setServiceFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All services" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All services</SelectItem>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="license">License</SelectItem>
              <SelectItem value="registration">Registration</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setSearchTerm("")}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </Card>

      {/* notification zone */}
      {servingTokens.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Currently Being Served</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {servingTokens
              .sort((a, b) => (a.slot_index || 0) - (b.slot_index || 0))
              .map((token) => (
              <div key={token.id} className="space-y-2">
                <TokenCard token={{
                  ...token,
                  number: token.token_number,
                  citizenName: token.citizen_name,
                  citizenId: token.citizen_phone,
                  timeSlot: token.time_slot,
                  estimatedTime: token.estimated_time,
                  createdAt: new Date(token.created_at)
                }} displayCode={getDisplayCode(token)} />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleStatusUpdate(token, 'completed')}
                    className="flex-1 gap-1"
                    disabled={loading}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusUpdate(token, 'no-show')}
                    className="gap-1"
                    disabled={loading}
                  >
                    <XCircle className="h-4 w-4" />
                    No Show
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => sendReminder(token)}
                    className="gap-1"
                  >
                    <Bell className="h-4 w-4" />
                    Remind
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Waiting Queue ({waitingTokens.length})</h2>
          <div className="text-sm text-muted-foreground">
            Counter {selectedCounter} selected for new calls
          </div>
        </div>
        
        {waitingTokens.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No tokens waiting in queue</p>
          </Card>
        ) : (
          <div className="space-y-6">
      {/* slots */}
            {Object.keys(slotGroups)
              .map(n => Number(n))
              .sort((a, b) => a - b)
              .map(slotIdx => {
                const group = (slotGroups[slotIdx] || []).filter(t => t.status === 'waiting');
                if (group.length === 0) return null;
                return (
                  <div key={slotIdx}>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {group.map((token) => (
                        <div key={token.id} className="space-y-2">
                          <TokenCard token={{
                            ...token,
                            number: token.token_number,
                            citizenName: token.citizen_name,
                            citizenId: token.citizen_phone,
                            timeSlot: token.time_slot,
                            estimatedTime: token.estimated_time,
                            createdAt: new Date(token.created_at)
                          }} displayCode={getDisplayCode(token)} />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleStatusUpdate(token, 'serving')}
                              className="flex-1 gap-1"
                              disabled={loading}
                            >
                              <Play className="h-4 w-4" />
                              Call for Service
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => sendReminder(token)}
                              className="gap-1"
                            >
                              <Bell className="h-4 w-4" />
                              Remind
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* completed */}
      {completedTokens.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Recently Completed</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {completedTokens.map((token) => (
              <TokenCard key={token.id} token={{
                ...token,
                number: token.token_number,
                citizenName: token.citizen_name,
                citizenId: token.citizen_phone,
                timeSlot: token.time_slot,
                estimatedTime: token.estimated_time,
                createdAt: new Date(token.created_at)
              }} />
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Officer Dashboard</h1>
                <p className="text-muted-foreground">Regional Transport Office - Queue Management</p>
                {profile && (
                  <p className="text-sm text-muted-foreground">Welcome, {profile.full_name} ({profile.role})</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Select value={selectedCounter} onValueChange={setSelectedCounter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {counters.map((counter) => (
                    <SelectItem key={counter.id} value={counter.id.toString()}>
                      {counter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="destructive" onClick={signOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
      {/* front page */}
        {isAdmin ? (
          <Tabs defaultValue="queue" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="queue">Queue Management</TabsTrigger>
              <TabsTrigger value="users">
                <Users className="h-4 w-4 mr-2" />
                User Management
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="queue">
              <QueueManagementContent />
            </TabsContent>
            
            <TabsContent value="users">
              <UserManagement />
            </TabsContent>
          </Tabs>
        ) : (
          <QueueManagementContent />
        )}
      </div>
    </div>
  );
};

export default OfficerDashboard;