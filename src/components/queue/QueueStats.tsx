import { Card } from "@/components/ui/card";
import { QueueStats as QueueStatsType } from "@/types/queue";
import { Users, Clock, CheckCircle, Activity } from "lucide-react";

interface QueueStatsProps {
  stats: QueueStatsType;
}

export const QueueStats = ({ stats }: QueueStatsProps) => {
  const statItems = [
    {
      label: "Total Tokens",
      value: stats.totalTokens,
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      label: "Currently Serving",
      value: stats.currentlyServing,
      icon: Activity,
      color: "text-warning",
      bgColor: "bg-warning/10"
    },
    {
      label: "Avg Wait Time",
      value: `${stats.averageWaitTime}m`,
      icon: Clock,
      color: "text-secondary",
      bgColor: "bg-secondary/10"
    },
    {
      label: "Completed Today",
      value: stats.completedToday,
      icon: CheckCircle,
      color: "text-success",
      bgColor: "bg-success/10"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">{item.label}</p>
                <p className={`text-2xl font-bold ${item.color}`}>{item.value}</p>
              </div>
              <div className={`p-3 rounded-full ${item.bgColor}`}>
                <Icon className={`h-6 w-6 ${item.color}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};