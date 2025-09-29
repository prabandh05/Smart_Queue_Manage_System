import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQueueData } from "@/hooks/use-queue-data";
import { Activity, Clock, Users, AlertCircle } from "lucide-react";

export const LiveQueueDisplay = () => {
  const { tokens, stats, counters } = useQueueData();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const dayTokens = tokens.filter(t => t.slot_date === today);
  const servingTokens = dayTokens.filter(t => t.status === 'serving');
  const waitingTokensRaw = dayTokens.filter(t => t.status === 'waiting');
  const slotGroups: Record<number, any[]> = dayTokens.reduce((acc: Record<number, any[]>, t: any) => {
    const key = t.slot_index || 0;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});
  Object.keys(slotGroups).forEach(k => {
    slotGroups[Number(k)].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  });
  const getDisplayCode = (t: any) => {
    const idx = (slotGroups[t.slot_index || 0] || []).findIndex(x => x.id === t.id);
    const letter = String.fromCharCode(65 + (idx >= 0 ? idx : 0));
    return `${t.slot_index}${letter}`;
  };
  const waitingTokens = waitingTokensRaw
    .sort((a, b) => (a.slot_index || 0) - (b.slot_index || 0))
    .slice(0, 15);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
      {/* header */}
        <Card className="p-6 bg-primary text-primary-foreground">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">RTO Queue Management</h1>
              <p className="text-primary-foreground/80">Live Queue Status</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-mono">
                {currentTime.toLocaleTimeString()}
              </div>
              <div className="text-sm text-primary-foreground/80">
                {currentTime.toLocaleDateString()}
              </div>
            </div>
          </div>
        </Card>

      {/* stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{stats.totalTokens}</div>
            <div className="text-sm text-muted-foreground">Total Tokens</div>
          </Card>
          <Card className="p-4 text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-warning" />
            <div className="text-2xl font-bold">{stats.currentlyServing}</div>
            <div className="text-sm text-muted-foreground">Currently Serving</div>
          </Card>
          <Card className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto mb-2 text-secondary" />
            <div className="text-2xl font-bold">{stats.averageWaitTime}m</div>
            <div className="text-sm text-muted-foreground">Avg Wait Time</div>
          </Card>
          <Card className="p-4 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-success" />
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <div className="text-sm text-muted-foreground">Completed Today</div>
          </Card>
        </div>

      {/* notification zone */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Activity className="h-6 w-6 text-warning" />
            Currently Being Served
          </h2>
          
          {servingTokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tokens currently being served
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {servingTokens.map((token) => (
                <Card key={token.id} className="p-4 bg-warning/10 border-warning">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-3xl font-bold text-warning">
                      #{getDisplayCode(token)}
                    </div>
                    <Badge className="bg-warning text-warning-foreground">
                      Counter {token.counter_id}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">{token.citizen_name}</div>
                    <div className="text-muted-foreground capitalize">
                      {token.service_type}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>

      {/* notification zone */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" />
            Next in Queue
          </h2>
          
          {waitingTokens.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tokens waiting in queue
            </div>
          ) : (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {waitingTokens.map((token, index) => (
                <Card key={token.id} className={`p-3 text-center ${index === 0 ? 'bg-primary/10 border-primary' : ''}`}>
                  <div className={`text-xl font-bold ${index === 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                    #{getDisplayCode(token)}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {token.citizen_name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {token.estimated_time}
                  </div>
                  {token.priority && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      Priority
                    </Badge>
                  )}
                </Card>
              ))}
            </div>
          )}
        </Card>

      {/* status */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Counter Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {counters.map((counter) => {
              const activeToken = servingTokens.find(t => t.counter_id === counter.id);
              return (
                <Card key={counter.id} className={`p-4 ${counter.is_active ? 'bg-success/10 border-success' : 'bg-muted'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">{counter.name}</h3>
                    <Badge variant={counter.is_active ? "default" : "secondary"}>
                      {counter.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div>Officer: {counter.officer_name || "Available"}</div>
                    {activeToken && (
                      <div className="font-medium text-primary">
                        Serving: #{getDisplayCode(activeToken)}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};