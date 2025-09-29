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
  slot_date?: string;
  slot_index?: number;
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

    // realtime
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
        .order('time_slot', { ascending: true })
        .order('created_at', { ascending: true });

      if (error) throw error;

      // calendar
      const computeSlotIndex = (dt: Date) => {
        const h = dt.getHours();
        const m = dt.getMinutes();
        const slotTimes: Array<{h:number;m:number}> = [];
        // calendar
        for (let hh = 9; hh <= 12; hh++) {
          slotTimes.push({ h: hh, m: 0 });
          slotTimes.push({ h: hh, m: 30 });
        }
        // calendar
        const afternoon: Array<[number, number]> = [[14,30],[15,0],[15,30],[16,0],[16,30],[17,0]];
        afternoon.forEach(([hh, mm]) => slotTimes.push({ h: hh, m: mm }));
        for (let i = 0; i < slotTimes.length; i++) {
          if (slotTimes[i].h === h && slotTimes[i].m === m) return i + 1;
        }
        // calendar
        return Math.max(1, Math.floor(((h - 9) * 60 + m) / 30) + 1);
      };

      const formattedTokens = data.map((token: any) => {
        const ts = new Date(token.time_slot);
        return {
          ...token,
          citizen_name: token.profiles?.full_name || 'Unknown',
          citizen_phone: token.profiles?.phone || '',
          time_slot: ts.toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          slot_date: token.slot_date || ts.toISOString().split('T')[0],
          slot_index: computeSlotIndex(ts)
        };
      });

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
        .eq('slot_date', today);

      if (error) throw error;

      const totalTokens = todayTokens?.length || 0;
      const currentlyServing = todayTokens?.filter(t => t.status === 'serving').length || 0;
      const completedToday = todayTokens?.filter(t => t.status === 'completed').length || 0;

      setStats({
        totalTokens,
        currentlyServing,
        averageWaitTime: 25,
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
      // calendar
      const now = new Date();
      const day = opts?.desiredSlot ? new Date(opts.desiredSlot) : now;
      // calendar
      const minutes = [0, 30];
      const proposed = opts?.desiredSlot ? new Date(opts.desiredSlot) : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9, 0);
      let hour = proposed.getHours();
      let minute = minutes.reduce((prev, cur) => Math.abs(cur - proposed.getMinutes()) < Math.abs(prev - proposed.getMinutes()) ? cur : prev, 0);
      // calendar
      const isLunch = (h: number, m: number) => (h > 13 || (h === 13 && m >= 0)) && (h < 14 || (h === 14 && m < 30));
      const beforeStart = (h: number, m: number) => h < 9 || (h === 9 && m < 0);
      const afterEnd = (h: number, m: number) => h > 17 || (h === 17 && m > 0);
      if (beforeStart(hour, minute)) { hour = 9; minute = 0; }
      if (isLunch(hour, minute)) { hour = 14; minute = 30; }
      if (afterEnd(hour, minute)) { hour = 17; minute = 0; }
      const slotIso = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0).toISOString();

      // Compute slot index number for code (1..N per day)
      const computeSlotIndex = (dt: Date) => {
        const h = dt.getHours();
        const m = dt.getMinutes();
        const slots: Array<[number, number]> = [];
        for (let hh = 9; hh <= 12; hh++) { slots.push([hh,0]); slots.push([hh,30]); }
        [[14,30],[15,0],[15,30],[16,0],[16,30],[17,0]].forEach(s => slots.push(s as [number, number]));
        for (let i = 0; i < slots.length; i++) { if (slots[i][0] === h && slots[i][1] === m) return i + 1; }
        return Math.max(1, Math.floor(((h - 9) * 60 + m) / 30) + 1);
      };
      const tokenNumber = computeSlotIndex(new Date(slotIso));

      // capacity
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

      // qr
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

      // notification zone
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

      // notification zone
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

      // notification zone
      if (status === 'serving') {
        try {
          // notification zone
          const { data: currentToken } = await supabase
            .from('tokens')
            .select('token_number, service_type, slot_date, time_slot')
            .eq('id', tokenId)
            .single();

          if (currentToken) {
            // notification zone
            const { data: upcoming } = await supabase
              .from('tokens')
              .select('id, token_number, time_slot')
              .eq('status', 'waiting')
              .eq('service_type', currentToken.service_type)
              .eq('slot_date', currentToken.slot_date)
              .order('time_slot', { ascending: true })
              .order('created_at', { ascending: true })
              .limit(2);

            if (upcoming && upcoming.length > 0) {
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