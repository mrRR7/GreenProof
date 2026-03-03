export interface ESGClaim {
  id: string;
  text: string;
  category: 'quantitative' | 'future_target' | 'comparative' | 'general';
  status: 'consistent' | 'inconsistent' | 'unsupported' | 'incomplete';
  explanation: string;
  supportingData?: string;
  mathematicalCheck?: {
    formula: string;
    result: string;
    expected: string;
    isCorrect: boolean;
  };
}

export interface VerificationLog {
  id: string;
  timestamp: string;
  reportName: string;
  claimCount: number;
  hash: string;
  previousHash: string;
}
