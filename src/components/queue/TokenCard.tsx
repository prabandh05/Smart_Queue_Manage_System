import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Token } from "@/types/queue";
import { Clock, User, CreditCard } from "lucide-react";

interface TokenCardProps {
  token: Token;
  isCurrentUser?: boolean;
}

export const TokenCard = ({ token, isCurrentUser = false }: TokenCardProps) => {
  const getStatusVariant = (status: Token['status']) => {
    switch (status) {
      case 'serving':
        return 'serving';
      case 'completed':
        return 'completed';
      case 'waiting':
        return token.priority ? 'priority' : 'waiting';
      default:
        return 'waiting';
    }
  };

  return (
    <Card className={`p-4 transition-all duration-200 ${
      isCurrentUser 
        ? 'ring-2 ring-primary shadow-lg bg-primary/5' 
        : token.status === 'serving' 
          ? 'ring-2 ring-warning shadow-md bg-warning/5 pulse-slow' 
          : 'hover:shadow-md'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold text-primary">#{token.number}</div>
          {token.priority && (
            <div className="px-2 py-1 bg-accent text-accent-foreground text-xs rounded-full font-medium">
              Priority
            </div>
          )}
        </div>
        <StatusBadge variant={getStatusVariant(token.status)}>
          {token.status.charAt(0).toUpperCase() + token.status.slice(1)}
        </StatusBadge>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="h-4 w-4" />
          <span className="font-medium">{token.citizenName}</span>
        </div>
        
        <div className="flex items-center gap-2 text-muted-foreground">
          <CreditCard className="h-4 w-4" />
          <span>{token.citizenId}</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Slot: {token.timeSlot}</span>
          </div>
          
          {token.status === 'serving' && token.counter && (
            <div className="px-2 py-1 bg-warning text-warning-foreground text-xs rounded-full font-medium">
              Counter {token.counter}
            </div>
          )}
        </div>
        
        {/* Hide '0 mins' style estimates; show slot time only */}
        <div className="text-right">
          <span className="font-medium text-muted-foreground">{token.timeSlot}</span>
        </div>
      </div>
    </Card>
  );
};