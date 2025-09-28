import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import QRCode from 'qrcode';

interface Token {
  id: string;
  token_number: number;
  citizen_id: string;
  citizen_name: string;
  citizen_phone: string;
  service_type: string;
  time_slot: string;
  estimated_time: string;
  status: 'waiting' | 'serving' | 'completed' | 'no-show' | 'cancelled';
  priority: boolean;
  disability_type?: 'vision' | 'hearing' | 'mobility';
  counter_id?: number;
  qr_code?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface QueueStats {
  totalTokens: number;
  currentlyServing: number;
  averageWaitTime: number;
  completedToday: number;
}

interface Counter {
  id: number;
  name: string;
  officer_id?: string;
  officer_name?: string;
  is_active: boolean;
  services: string[];
}

export const useQueueData = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    totalTokens: 0,
    currentlyServing: 0,
    averageWaitTime: 0,
    completedToday: 0
  });
  const [counters, setCounters] = useState<Counter[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    fetchTokens();
    fetchCounters();
    fetchStats();

    // Subscribe to real-time updates
    const tokensSubscription = supabase
      .channel('tokens-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tokens' }, () => {
        fetchTokens();
        fetchStats();
      })
      .subscribe();

    const countersSubscription = supabase
      .channel('counters-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'counters' }, () => {
        fetchCounters();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tokensSubscription);
      supabase.removeChannel(countersSubscription);
    };
  }, []);

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select(`
          *,
          profiles!tokens_citizen_id_fkey(full_name, phone)
        `)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedTokens = data.map((token: any) => ({
        ...token,
        citizen_name: token.profiles?.full_name || 'Unknown',
        citizen_phone: token.profiles?.phone || '',
        time_slot: new Date(token.time_slot).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }));

      setTokens(formattedTokens);
    } catch (error: any) {
      console.error('Error fetching tokens:', error);
      toast({
        title: "Error",
        description: "Failed to load tokens",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCounters = async () => {
    try {
      const { data, error } = await supabase
        .from('counters')
        .select('*')
        .eq('is_active', true)
        .order('id', { ascending: true });

      if (error) throw error;
      setCounters(data || []);
    } catch (error: any) {
      console.error('Error fetching counters:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const { data: todayTokens, error } = await supabase
        .from('tokens')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      if (error) throw error;

      const totalTokens = todayTokens?.length || 0;
      const currentlyServing = todayTokens?.filter(t => t.status === 'serving').length || 0;
      const completedToday = todayTokens?.filter(t => t.status === 'completed').length || 0;

      setStats({
        totalTokens,
        currentlyServing,
        averageWaitTime: 25, // Calculate based on actual wait times
        completedToday
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    }
  };

  const generateToken = async (
    citizenId: string,
    serviceType: string = 'general',
    opts?: { desiredSlot?: Date; disability?: 'vision' | 'hearing' | 'mobility' }
  ): Promise<Token | null> => {
    try {
      // Get token number
      const { data: tokenNumber, error: numberError } = await supabase
        .rpc('generate_token_number');

      if (numberError) throw numberError;

      // Calculate/choose time slot (10 minutes granularity). Allow explicit desired slot.
      const now = new Date();
      const day = opts?.desiredSlot ? new Date(opts.desiredSlot) : now;
      // Slot plan: 30-min slots from 09:00 to 13:00, skip lunch 13:00-14:30, then 14:30 to 17:00
      const minutes = [0, 30];
      const proposed = opts?.desiredSlot ? new Date(opts.desiredSlot) : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0);
      let hour = proposed.getHours();
      let minute = minutes.reduce((prev, cur) => Math.abs(cur - proposed.getMinutes()) < Math.abs(prev - proposed.getMinutes()) ? cur : prev, 0);
      // Clamp into working windows
      const isLunch = (h: number, m: number) => (h > 13 || (h === 13 && m >= 0)) && (h < 14 || (h === 14 && m < 30));
      const beforeStart = (h: number, m: number) => h < 9 || (h === 9 && m < 0);
      const afterEnd = (h: number, m: number) => h > 18 || (h === 18 && m > 0);
      if (beforeStart(hour, minute)) { hour = 9; minute = 0; }
      if (isLunch(hour, minute)) { hour = 14; minute = 30; }
      if (afterEnd(hour, minute)) { hour = 18; minute = 0; }
      const slotIso = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0).toISOString();

      // Enforce capacity: max 3 tokens per identical slot timestamp
      // Capacity per service per slot: 3
      const { count: slotCount, error: slotErr } = await supabase
        .from('tokens')
        .select('id', { count: 'exact', head: true })
        .eq('time_slot', slotIso)
        .eq('service_type', serviceType)
        .neq('status', 'cancelled');
      if (slotErr) throw slotErr;
      if ((slotCount || 0) >= 3) {
        throw new Error('Selected time slot is full. Please choose another time.');
      }

      // Generate QR code
      const qrData = JSON.stringify({
        tokenNumber,
        citizenId,
        timeSlot: slotIso
      });
      const qrCode = await QRCode.toDataURL(qrData);

      const { data, error } = await supabase
        .from('tokens')
        .insert({
          token_number: tokenNumber,
          citizen_id: citizenId,
          citizen_name: profile?.full_name || 'Unknown',
          citizen_phone: profile?.phone || '',
          service_type: serviceType,
          time_slot: slotIso,
          estimated_time: new Date(slotIso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          priority: Boolean(opts?.disability),
          disability_type: opts?.disability,
          qr_code: qrCode
        })
        .select(`
          *,
          profiles!tokens_citizen_id_fkey(full_name, phone)
        `)
        .single();

      if (error) throw error;

      const newToken = {
        ...data,
        citizen_name: data.profiles?.full_name || 'Unknown',
        citizen_phone: data.profiles?.phone || '',
        time_slot: new Date(data.time_slot).toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit'
        })
      } as Token;

      // Send SMS notification
      try {
        await supabase.functions.invoke('send-sms-notification', {
          body: {
            tokenId: newToken.id,
            phone: newToken.citizen_phone,
            type: 'token_created'
          }
        });
      } catch (smsError) {
        console.error('SMS notification failed:', smsError);
      }

      toast({
        title: "Token Generated",
        description: `Token #${tokenNumber} has been generated successfully!`,
      });

      return newToken;
    } catch (error: any) {
      console.error('Error generating token:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate token",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateTokenStatus = async (tokenId: string, status: Token['status'], counterId?: number) => {
    try {
      const updateData: any = {
        status,
        counter_id: counterId,
        updated_at: new Date().toISOString()
      };

      if (status === 'serving') {
        updateData.called_at = new Date().toISOString();
        updateData.served_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tokens')
        .update(updateData)
        .eq('id', tokenId);

      if (error) throw error;

      // Send SMS notification for status updates
      if (status === 'serving' || status === 'completed') {
        try {
          await supabase.functions.invoke('send-sms-notification', {
            body: {
              tokenId,
              type: status === 'serving' ? 'token_called' : 'token_completed'
            }
          });
        } catch (smsError) {
          console.error('SMS notification failed:', smsError);
        }
      }

      // When a token moves to serving, notify the next two waiting tokens (up_next)
      if (status === 'serving') {
        try {
          // Get current token details
          const { data: currentToken } = await supabase
            .from('tokens')
            .select('token_number, service_type')
            .eq('id', tokenId)
            .single();

          if (currentToken) {
            const { data: nextTokens } = await supabase
              .from('tokens')
              .select('id, token_number')
              .eq('status', 'waiting')
              .eq('service_type', currentToken.service_type)
              .order('token_number', { ascending: true })
              .limit(10);

            if (nextTokens && nextTokens.length > 0) {
              // pick the next two by token_number greater than current
              const upcoming = nextTokens
                .filter(t => t.token_number > currentToken.token_number)
                .slice(0, 2);
              await Promise.all(
                upcoming.map(t =>
                  supabase.functions.invoke('send-sms-notification', {
                    body: { tokenId: t.id, type: 'up_next', contextServing: currentToken.token_number }
                  })
                )
              );
            }
          }
        } catch (notifyErr) {
          console.error('Failed to send up-next notifications:', notifyErr);
        }
      }

      toast({
        title: "Status Updated",
        description: `Token status updated to ${status}`,
      });
    } catch (error: any) {
      console.error('Error updating token status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update token status",
        variant: "destructive"
      });
    }
  };

  return {
    tokens,
    stats,
    counters,
    loading,
    generateToken,
    updateTokenStatus,
    refreshData: () => {
      fetchTokens();
      fetchCounters();
      fetchStats();
    }
  };
};