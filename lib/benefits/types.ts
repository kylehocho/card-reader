import type { Json } from '@/lib/supabase/types';

export type BenefitCadence = 'monthly' | 'quarterly' | 'semiannual' | 'annual' | 'cardmember_year' | 'statement_cycle' | 'first_year' | 'ongoing' | string;

export type RewardCategory =
  | 'dining'
  | 'groceries'
  | 'travel'
  | 'flights'
  | 'hotel'
  | 'gas'
  | 'drugstore'
  | 'rent'
  | 'streaming'
  | 'capital_one_travel'
  | 'rotating_quarterly'
  | 'general';

export type BenefitRule = {
  id: string;
  type: 'statement_credit' | 'welcome_bonus' | 'activation' | 'access' | 'category_tracker' | 'usage_requirement' | 'anniversary_bonus' | 'points_boost' | string;
  title: string;
  value?: number;
  target?: number;
  days?: number;
  bonus?: string;
  cadence?: BenefitCadence;
  eligible_categories?: string[];
  eligible_merchants?: string[];
  requires_portal?: boolean;
  enrollment_required?: boolean;
  activation_required?: boolean;
  minimum_purchase?: number;
  transaction_minimum?: number;
  reset?: string;
};

export type AnalysisCardProduct = {
  id: string;
  issuer: string;
  name: string;
  annual_fee: number;
  reward_currency: string | null;
  rewards: Record<string, number>;
  benefits: BenefitRule[];
};

export type AnalysisAccount = {
  id: string;
  account_id: string;
  name: string;
  card_product_id?: string | null;
};

export type AnalysisTransaction = {
  id: string;
  plaid_account_id?: string | null;
  account_id: string;
  merchant_name?: string | null;
  name: string;
  amount: number;
  date: string;
  category?: string[];
  personal_finance_category?: Json | null;
  pending?: boolean;
};

export type BenefitTracker = {
  id: string;
  cardProductId: string;
  cardName: string;
  issuer: string;
  title: string;
  type: string;
  cadence: BenefitCadence;
  status: 'available' | 'in-progress' | 'used' | 'needs-action';
  used: number;
  target: number;
  progress: number;
  detail: string;
  nextAction: string;
};

export type CardRecommendation = {
  id: string;
  transactionId: string;
  merchant: string;
  category: RewardCategory;
  currentCard: string;
  bestCard: string;
  currentMultiplier: number;
  bestMultiplier: number;
  estimatedLift: number;
  reason: string;
};

export type WalletAnalysis = {
  trackers: BenefitTracker[];
  welcomeBonuses: BenefitTracker[];
  recommendations: CardRecommendation[];
  alerts: string[];
};
