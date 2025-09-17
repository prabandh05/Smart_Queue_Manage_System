// Deprecated mock hook - replaced by use-queue-data with Supabase
// This file is intentionally left as a stub to avoid accidental usage.
export {};

// Mock data for demonstration
const generateMockTokens = (): Token[] => {
  const names = ['Rajesh Kumar', 'Priya Sharma', 'Amit Singh', 'Sunita Devi', 'Vikash Yadav', 'Anita Gupta', 'Ravi Verma', 'Meera Patel'];
  const tokens: Token[] = [];
  
  for (let i = 1; i <= 45; i++) {
    const randomName = names[Math.floor(Math.random() * names.length)];
    const status = i <= 5 ? 'completed' : i <= 8 ? 'serving' : 'waiting';
    const timeSlot = new Date(Date.now() + (i - 8) * 10 * 60 * 1000).toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    tokens.push({
      id: `T${i.toString().padStart(3, '0')}`,
      number: i,
      citizenName: randomName,
      citizenId: `XXXX-XXXX-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
      timeSlot,
      estimatedTime: status === 'waiting' ? `${(i - 8) * 10} mins` : status === 'serving' ? 'Now' : 'Completed',
      status: status as Token['status'],
      counter: status === 'serving' ? Math.floor(Math.random() * 3) + 1 : undefined,
      priority: Math.random() > 0.8,
      createdAt: new Date(Date.now() - (45 - i) * 15 * 60 * 1000)
    });
  }
  
  return tokens;
};

export const useQueue = () => {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [stats, setStats] = useState<QueueStats>({
    totalTokens: 0,
    currentlyServing: 0,
    averageWaitTime: 0,
    completedToday: 0
  });
  
  const [counters] = useState<Counter[]>([
    { id: 1, name: 'Counter 1', isActive: true, officerName: 'Rajesh Sharma' },
    { id: 2, name: 'Counter 2', isActive: true, officerName: 'Priya Singh' },
    { id: 3, name: 'Counter 3', isActive: true, officerName: 'Amit Kumar' }
  ]);

  useEffect(() => {
    const mockTokens = generateMockTokens();
    setTokens(mockTokens);
    
    setStats({
      totalTokens: mockTokens.length,
      currentlyServing: mockTokens.filter(t => t.status === 'serving').length,
      averageWaitTime: 25,
      completedToday: mockTokens.filter(t => t.status === 'completed').length
    });
  }, []);

  const generateToken = (citizenName: string, citizenId: string): Token => {
    const newTokenNumber = tokens.length + 1;
    const newToken: Token = {
      id: `T${newTokenNumber.toString().padStart(3, '0')}`,
      number: newTokenNumber,
      citizenName,
      citizenId,
      timeSlot: new Date(Date.now() + (newTokenNumber - 8) * 10 * 60 * 1000).toLocaleTimeString('en-IN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      }),
      estimatedTime: `${(newTokenNumber - 8) * 10} mins`,
      status: 'waiting',
      priority: false,
      createdAt: new Date()
    };
    
    setTokens(prev => [...prev, newToken]);
    setStats(prev => ({ ...prev, totalTokens: prev.totalTokens + 1 }));
    
    return newToken;
  };

  const updateTokenStatus = (tokenId: string, status: Token['status'], counter?: number) => {
    setTokens(prev => prev.map(token => 
      token.id === tokenId 
        ? { ...token, status, counter, estimatedTime: status === 'serving' ? 'Now' : token.estimatedTime }
        : token
    ));
    
    if (status === 'completed') {
      setStats(prev => ({ ...prev, completedToday: prev.completedToday + 1 }));
    }
  };

  return {
    tokens,
    stats,
    counters,
    generateToken,
    updateTokenStatus
  };
};