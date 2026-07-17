'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import AuthEntrySheet from '@/components/auth/AuthEntrySheet';
import EmailAuthFlow from '@/components/auth/EmailAuthFlow';
import ProfileSetupFlow from '@/components/auth/ProfileSetupFlow';
import ConnectedAccountsScreen from '@/components/card-reader/ConnectedAccountsScreen';
import PendingPlaidMatchCard from '@/components/card-reader/PendingPlaidMatchCard';
import { dedupeTransactionRecommendations, deriveLocalTransactionRecommendations, readableRewardCategory } from '@/components/card-reader/transactionRecommendations';
import UseNowScreen from '@/components/card-reader/UseNowScreen';
import type { PlaidConnectedAccount, Transaction } from '@/components/card-reader/types';
import { usePlaidAccountMatching } from '@/components/card-reader/usePlaidAccountMatching';
import {
  usePersistedPlaidData,
} from '@/components/card-reader/usePersistedPlaidData';
import { usePlaidWalletActions } from '@/components/card-reader/usePlaidWalletActions';
import { useAddCardPresentation } from '@/components/card-reader/useAddCardPresentation';
import { useMerchantRecommendation, type MerchantResult } from '@/components/card-reader/useMerchantRecommendation';
import { useWalletNavigation, walletPages, type Screen } from '@/components/card-reader/useWalletNavigation';
import ProfileHome from '@/components/profile/ProfileHome';
import ProfileMenu from '@/components/profile/ProfileMenu';
import type { WalletAnalysis } from '@/lib/benefits/types';
import {
  alertFromAnalysis,
  benefitFromTracker,
  recommendationFromAnalysis,
  welcomeBonusFromTracker,
  type BenefitView,
  type TransactionRecommendationView,
  type WelcomeBonusView,
} from '@/lib/benefits/wallet-analysis-view';
import { useNowDemoMerchantNames } from '@/lib/recommendation/use-now-demo-merchants';
import { getBrowserSupabaseClient } from '@/lib/supabase/client';
import { MotionConfig, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type StoredPlaidConnection = {
  accounts: PlaidConnectedAccount[];
};

const pageMeta = {
  benefits: { title: 'Benefits', icon: '✦' },
  multipliers: { title: 'Earn Rates', icon: '↗' },
  rewards: { title: 'Rewards', icon: '◎' },
  progress: { title: 'Important Dates', icon: '◌' },
  recommendations: { title: 'Recommendations', icon: '→' },
} as const;

const PLAID_STORAGE_KEY = 'card-reader.plaid-connections.v1';

type Benefit = BenefitView;

type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  action: string;
  severity: 'info' | 'warning' | 'urgent';
};

export type RecommendationItem = {
  id: string;
  category: string;
  merchant: string;
  card: string;
  why: string;
  runnerUp?: string;
};


type CategoryKey = 'restaurants' | 'groceries' | 'flights' | 'gas' | 'cars';

type MultiplierItem = {
  id: string;
  category: CategoryKey | 'hotels';
  label: string;
  multiplier: string;
  detail: string;
  icon: string;
};

type ConciergeAccess = {
  id: string;
  brand: string;
  label: string;
  contact: string;
  detail: string;
  channel: string;
};

type TransactionRecommendation = TransactionRecommendationView;

type WelcomeBonus = WelcomeBonusView;

type WalletAnalysisResponse = {
  analysis?: WalletAnalysis;
  error?: string;
};

type Card = {
  id: string;
  issuer: string;
  name: string;
  last4: string;
  gradient: string;
  accent: string;
  pointsLabel: string;
  pointsValue: string;
  recommendation: string;
  spendSummary: string;
  benefits: Benefit[];
  alerts: string[];
  categories: string[];
  multipliers: MultiplierItem[];
  concierges: ConciergeAccess[];
  rewardReset: string;
  annualFeeMonth: string;
  monthlyCreditsUsed: number;
  monthlyCreditsTotal: number;
  annualFee: number;
  perkValueUsed: number;
  nextResetLabel: string;
  transactions: Transaction[];
  isBusiness?: boolean;
};


export type PurchaseCategory = 'Dining' | 'Travel' | 'General spend';

type CategoryChip = {
  key: CategoryKey;
  label: string;
  icon: string;
};

type CategoryGuide = {
  key: CategoryKey;
  label: string;
  icon: string;
  headline: string;
  bestCardId: string;
  bestCardLabel: string;
  earnRate: string;
  reason: string;
  runnerUp?: string;
};

const appleInfoFontStyle = {
  fontFamily: '"SF Pro Text", "SF Pro Display", "SF Pro Icons", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
} as const;

const categoryChips: CategoryChip[] = [
  { key: 'gas', label: 'Gas', icon: '⛽' },
  { key: 'restaurants', label: 'Dining', icon: '🍽️' },
  { key: 'flights', label: 'Flights', icon: '✈️' },
  { key: 'groceries', label: 'Groceries', icon: '🛒' },
  { key: 'cars', label: 'Cars', icon: '🚗' },
];

const seedCards: Card[] = [
  {
    id: 'amex-gold',
    issuer: 'American Express',
    name: 'Gold Card',
    last4: '3007',
    gradient: 'from-[#f3d59f] via-[#cb9d62] to-[#704624]',
    accent: '#2b1908',
    pointsLabel: '48,230 pts ~= $482',
    pointsValue: '$1,284.20',
    recommendation: 'Use for dining tonight to pair 4x points with your unused monthly dining credit.',
    spendSummary: '$642 left to unlock your next dining milestone this month.',
    categories: ['Dining', 'Groceries', 'Flights', 'Amex Travel'],
    multipliers: [
      { id: 'gold-restaurants', category: 'restaurants', label: 'Restaurants', multiplier: '4x', detail: 'Restaurants worldwide', icon: '🍽️' },
      { id: 'gold-groceries', category: 'groceries', label: 'Groceries', multiplier: '4x', detail: 'U.S. supermarkets', icon: '🛒' },
      { id: 'gold-hotels', category: 'hotels', label: 'Hotels', multiplier: '5x', detail: 'Booked through Amex Travel', icon: '🏨' },
      { id: 'gold-flights', category: 'flights', label: 'Flights', multiplier: '3x', detail: 'Flights booked directly with airlines or Amex Travel', icon: '✈️' },
      { id: 'gold-cars', category: 'cars', label: 'Car rentals', multiplier: '2x', detail: 'Prepaid rentals booked through Amex Travel', icon: '🚗' },
    ],
    concierges: [
      { id: 'gold-dining', brand: 'Amex', label: 'Amex dining support', contact: 'Chat in Amex app', detail: 'Helpful for benefit questions and dining bookings tied to Gold offers.', channel: 'Chat' },
    ],
    alerts: ['Unused $10 dining credit expires in 26 days', 'Welcome bonus is 89% complete'],
    rewardReset: 'Monthly dining credit resets June 1',
    annualFeeMonth: 'January',
    monthlyCreditsUsed: 0,
    monthlyCreditsTotal: 1,
    annualFee: 325,
    perkValueUsed: 214,
    nextResetLabel: 'Resets in 26 days',
    transactions: [
      { id: 'g1', merchant: 'Great White', amount: '$84.20', date: 'Today', category: 'Dining' },
      { id: 'g2', merchant: 'Erewhon', amount: '$46.18', date: 'Yesterday', category: 'Groceries' },
      { id: 'g3', merchant: 'Resy @ Horses', amount: '$132.50', date: 'May 2', category: 'Dining' },
    ],
    benefits: [
      { id: 'gold-dining', title: 'Dining credit', status: 'available', detail: '$10 monthly - Grubhub, Cheesecake Factory, Resy', progress: 0 },
      { id: 'gold-uber', title: 'Uber Cash', status: 'in-progress', detail: '$4 of $10 used - auto-loads to your Uber account', progress: 40 },
      { id: 'gold-resy', title: 'Resy credit', status: 'used', detail: '$100 annual, paid in semi-annual halves', progress: 100 },
    ],
  },
  {
    id: 'amex-black',
    issuer: 'American Express',
    name: 'Black Card',
    last4: '0001',
    gradient: 'from-[#2e2f34] via-[#101115] to-[#020304]',
    accent: '#f1f1f1',
    pointsLabel: 'Centurion Rewards',
    pointsValue: '412,900 pts',
    recommendation: 'Hold for premium travel, concierge, and ultra-premium purchase protection moments.',
    spendSummary: '$18,000 of elite spend tracked this quarter.',
    categories: ['Luxury travel', 'Concierge', 'High-value purchases'],
    multipliers: [
      { id: 'black-flights', category: 'flights', label: 'Flights', multiplier: '2x', detail: 'Strong option when service matters more than raw earn rate', icon: '✈️' },
      { id: 'black-hotels', category: 'hotels', label: 'Hotels', multiplier: '2x', detail: 'Better paired with premium travel benefits', icon: '🏨' },
    ],
    concierges: [
      { id: 'centurion-concierge', brand: 'Amex', label: 'Centurion concierge', contact: '1-800-525-3355', detail: '24/7 premium travel, dining, and event support.', channel: 'Phone' },
    ],
    alerts: ['Private aviation credit still unused', 'Concierge dining access available tonight'],
    rewardReset: 'Select annual credits refresh with membership year',
    annualFeeMonth: 'March',
    monthlyCreditsUsed: 1,
    monthlyCreditsTotal: 2,
    annualFee: 5000,
    perkValueUsed: 1840,
    nextResetLabel: 'One monthly benefit still open',
    transactions: [
      { id: 'b1', merchant: 'Blade', amount: '$1,245.00', date: 'Today', category: 'Travel' },
      { id: 'b2', merchant: 'The Grill', amount: '$288.40', date: 'Yesterday', category: 'Dining' },
      { id: 'b3', merchant: 'Aman NY', amount: '$2,940.00', date: 'Apr 29', category: 'Hotel' },
    ],
    benefits: [
      { id: 'black-concierge', title: 'Concierge priority access', status: 'available', detail: 'Available for premium reservations this week', progress: 100 },
      { id: 'black-air', title: 'Private aviation credit', status: 'available', detail: 'Annual credit completely unused', progress: 0 },
      { id: 'black-finehotels', title: 'Fine Hotels + Resorts status', status: 'used', detail: 'Already used once this month', progress: 100 },
    ],
  },
  {
    id: 'amex-platinum',
    issuer: 'American Express',
    name: 'Platinum Card',
    last4: '7438',
    gradient: 'from-[#eef2f7] via-[#c0c9d4] to-[#7a8493]',
    accent: '#1f2937',
    pointsLabel: 'Membership Rewards',
    pointsValue: '201,340 pts',
    recommendation: 'Use for flights and benefits stacking when lounge/travel credits matter most.',
    spendSummary: '$73 remains in your airline incidental credit bucket.',
    categories: ['Flights', 'Lounges', 'Fine Hotels'],
    multipliers: [
      { id: 'plat-flights', category: 'flights', label: 'Flights', multiplier: '5x', detail: 'Flights booked directly with airlines or Amex Travel', icon: '✈️' },
      { id: 'plat-hotels', category: 'hotels', label: 'Hotels', multiplier: '5x', detail: 'Prepaid hotels booked through Amex Travel', icon: '🏨' },
      { id: 'plat-cars', category: 'cars', label: 'Car rentals', multiplier: '1x', detail: 'Use mainly for benefits, not category acceleration', icon: '🚗' },
    ],
    concierges: [
      { id: 'platinum-concierge', brand: 'Amex', label: 'Platinum concierge', contact: '1-800-525-3355', detail: 'Travel planning, dining, and premium bookings.', channel: 'Phone' },
      { id: 'platinum-chat', brand: 'Amex', label: 'Platinum support chat', contact: 'Chat in Amex app', detail: 'Fastest path for quick concierge-adjacent requests.', channel: 'Chat' },
    ],
    alerts: ['Saks credit is half-used', 'Airline incidental credit almost exhausted'],
    rewardReset: 'Saks and airline credits have different reset calendars',
    annualFeeMonth: 'September',
    monthlyCreditsUsed: 1,
    monthlyCreditsTotal: 2,
    annualFee: 695,
    perkValueUsed: 512,
    nextResetLabel: '$50 Saks credit renews next cycle',
    transactions: [
      { id: 'p1', merchant: 'Delta', amount: '$73.00', date: 'Today', category: 'Airline fee' },
      { id: 'p2', merchant: 'Saks Fifth Avenue', amount: '$22.00', date: 'May 1', category: 'Retail' },
      { id: 'p3', merchant: 'Uber', amount: '$18.90', date: 'Apr 30', category: 'Transport' },
    ],
    benefits: [
      { id: 'plat-airline', title: 'Airline incidental credit', status: 'expiring', detail: '$127 of $200 used', progress: 64 },
      { id: 'plat-saks', title: 'Saks credit', status: 'in-progress', detail: '$28 of $50 used this cycle', progress: 56 },
      { id: 'plat-lounge', title: 'Centurion lounge access', status: 'available', detail: 'Available for your next trip', progress: 100 },
    ],
  },
  {
    id: 'chase-sapphire-reserve',
    issuer: 'Chase',
    name: 'Sapphire Reserve',
    last4: '1184',
    gradient: 'from-[#4d5563] via-[#1f2631] to-[#05070c]',
    accent: '#e5eefc',
    pointsLabel: 'Ultimate Rewards',
    pointsValue: '96,280 pts',
    recommendation: 'Use for travel and dining when you want flexible points plus clean travel protections.',
    spendSummary: '$142 remains in your annual travel credit.',
    categories: ['Travel', 'Dining', 'Priority Pass'],
    multipliers: [
      { id: 'reserve-restaurants', category: 'restaurants', label: 'Dining', multiplier: '3x', detail: 'Broad restaurant coverage', icon: '🍽️' },
      { id: 'reserve-flights', category: 'flights', label: 'Flights', multiplier: '3x', detail: 'Strong default travel card', icon: '✈️' },
      { id: 'reserve-cars', category: 'cars', label: 'Car rentals', multiplier: '3x', detail: 'Good with primary rental coverage', icon: '🚗' },
    ],
    concierges: [
      { id: 'visa-infinite', brand: 'Visa', label: 'Visa Infinite concierge', contact: '1-800-953-7392', detail: 'Dining reservations, travel support, and event help.', channel: 'Phone' },
    ],
    alerts: ['Travel credit still partially available', 'DoorDash benefit renews next month'],
    rewardReset: 'Travel credit refreshes each cardmember year.',
    annualFeeMonth: 'July',
    monthlyCreditsUsed: 1,
    monthlyCreditsTotal: 3,
    annualFee: 550,
    perkValueUsed: 386,
    nextResetLabel: 'Travel credit remains open',
    transactions: [
      { id: 's1', merchant: 'United Airlines', amount: '$58.00', date: 'Today', category: 'Travel' },
      { id: 's2', merchant: 'Jon & Vinny\'s', amount: '$64.25', date: 'Yesterday', category: 'Dining' },
      { id: 's3', merchant: 'Lyft', amount: '$22.14', date: 'Apr 29', category: 'Transport' },
    ],
    benefits: [
      { id: 'reserve-travel', title: 'Annual travel credit', status: 'in-progress', detail: '$158 of $300 used this year', progress: 53 },
      { id: 'reserve-dash', title: 'DoorDash monthly credit', status: 'available', detail: 'Ready to use this month', progress: 0 },
      { id: 'reserve-lounge', title: 'Priority Pass access', status: 'available', detail: 'Available for your next airport visit', progress: 100 },
    ],
  },
  {
    id: 'capital-one-venture-x',
    issuer: 'Capital One',
    name: 'Venture X',
    last4: '5521',
    gradient: 'from-[#4b5563] via-[#1d2733] to-[#090b11]',
    accent: '#f4f7fb',
    pointsLabel: 'Capital One Miles',
    pointsValue: '184,900 mi',
    recommendation: 'Use for flights, hotels, and big travel purchases when you want a clean 2x floor plus travel portal value.',
    spendSummary: '$95 of your $300 travel credit remains.',
    categories: ['Travel', 'Lounges', 'Everyday spend'],
    multipliers: [
      { id: 'vx-flights', category: 'flights', label: 'Flights', multiplier: '5x', detail: 'Booked through Capital One Travel', icon: '✈️' },
      { id: 'vx-hotels', category: 'hotels', label: 'Hotels', multiplier: '10x', detail: 'Hotels and rental cars via Capital One Travel', icon: '🏨' },
      { id: 'vx-cars', category: 'cars', label: 'Car rentals', multiplier: '10x', detail: 'Booked through Capital One Travel', icon: '🚗' },
      { id: 'vx-everyday', category: 'gas', label: 'Everyday spend', multiplier: '2x', detail: 'Solid fallback when no bonus category wins', icon: '⚡' },
    ],
    concierges: [
      { id: 'vx-concierge', brand: 'Capital One', label: 'Venture X concierge', contact: '1-800-227-4825', detail: 'Travel and lifestyle help for Venture X cardholders.', channel: 'Phone' },
    ],
    alerts: ['Travel credit nearly finished', 'Anniversary miles post next month'],
    rewardReset: 'Travel credit renews each account anniversary year.',
    annualFeeMonth: 'August',
    monthlyCreditsUsed: 2,
    monthlyCreditsTotal: 3,
    annualFee: 395,
    perkValueUsed: 405,
    nextResetLabel: '$95 travel credit still available',
    transactions: [
      { id: 'vx1', merchant: 'Capital One Travel', amount: '$205.00', date: 'Today', category: 'Travel portal' },
      { id: 'vx2', merchant: 'Airbnb', amount: '$314.80', date: 'May 2', category: 'Travel' },
      { id: 'vx3', merchant: 'Coffee Dose', amount: '$18.45', date: 'May 1', category: 'Dining' },
    ],
    benefits: [
      { id: 'venture-credit', title: 'Annual travel credit', status: 'in-progress', detail: '$205 of $300 used this year', progress: 68 },
      { id: 'venture-lounge', title: 'Priority Pass + Plaza Premium', status: 'available', detail: 'Ready for your next airport visit', progress: 100 },
      { id: 'venture-anniversary', title: 'Anniversary miles', status: 'expiring', detail: 'Posts in 24 days at renewal', progress: 76 },
    ],
  },
  {
    id: 'citi-strata-premier',
    issuer: 'Citi',
    name: 'Strata Premier',
    last4: '8842',
    gradient: 'from-[#535862] via-[#20252d] to-[#090b10]',
    accent: '#eef2f8',
    pointsLabel: 'ThankYou Points',
    pointsValue: '72,640 pts',
    recommendation: 'Use for restaurants, groceries, gas, and airfare when you want broad category coverage.',
    spendSummary: '$318 remains to trigger your next statement credit milestone.',
    categories: ['Dining', 'Groceries', 'Gas'],
    multipliers: [
      { id: 'citi-restaurants', category: 'restaurants', label: 'Restaurants', multiplier: '3x', detail: 'Everyday dining winner', icon: '🍽️' },
      { id: 'citi-groceries', category: 'groceries', label: 'Groceries', multiplier: '3x', detail: 'Broad grocery coverage', icon: '🛒' },
      { id: 'citi-gas', category: 'gas', label: 'Gas', multiplier: '3x', detail: 'Easy gas default', icon: '⛽' },
      { id: 'citi-flights', category: 'flights', label: 'Air travel', multiplier: '3x', detail: 'Good broad airfare card', icon: '✈️' },
    ],
    concierges: [
      { id: 'world-elite', brand: 'Mastercard', label: 'World Elite concierge', contact: '1-800-627-8372', detail: 'Available if this product is issued on the World Elite network.', channel: 'Phone' },
    ],
    alerts: ['Hotel benefit still untouched this year', 'Bonus category spend is trending up'],
    rewardReset: 'Hotel savings benefit refreshes annually.',
    annualFeeMonth: 'November',
    monthlyCreditsUsed: 0,
    monthlyCreditsTotal: 2,
    annualFee: 95,
    perkValueUsed: 42,
    nextResetLabel: 'No monthly credits used yet',
    transactions: [
      { id: 'ct1', merchant: 'Whole Foods', amount: '$96.40', date: 'Today', category: 'Groceries' },
      { id: 'ct2', merchant: 'Chevron', amount: '$61.22', date: 'Yesterday', category: 'Gas' },
      { id: 'ct3', merchant: 'Sugarfish', amount: '$88.30', date: 'Apr 30', category: 'Dining' },
    ],
    benefits: [
      { id: 'citi-hotel', title: '$100 hotel benefit', status: 'available', detail: 'Still unused for this cardmember year', progress: 0 },
      { id: 'citi-bonus', title: 'Category bonus momentum', status: 'in-progress', detail: 'Dining and grocery spend pacing ahead of last month', progress: 61 },
      { id: 'citi-thankyou', title: 'ThankYou transfer value', status: 'available', detail: 'Ready for your next flight redemption', progress: 100 },
    ],
  },
];

const emptyWalletCard: Card = {
  id: 'empty-wallet',
  issuer: 'Card Reader',
  name: 'Connect your first card',
  last4: 'New',
  gradient: 'from-[#3a424d] via-[#171d26] to-[#05070c]',
  accent: '#f4f7fb',
  pointsLabel: 'Production wallet',
  pointsValue: '$0',
  recommendation: 'Create a profile and connect Plaid before cards, benefits, and recommendations populate.',
  spendSummary: 'No linked cards yet.',
  benefits: [{ id: 'empty-connect', title: 'Connect a card', status: 'available', detail: 'Use Plaid sandbox to add the first account for this user.', progress: 0 }],
  alerts: ['No cards linked for this profile yet'],
  categories: ['Setup', 'Plaid'],
  multipliers: [{ id: 'empty-flat', category: 'gas', label: 'No earn rates yet', multiplier: '--', detail: 'Connect and match a card product first', icon: '•' }],
  concierges: [],
  rewardReset: 'Card benefits appear after a linked account is matched to a card product.',
  annualFeeMonth: 'Not set',
  monthlyCreditsUsed: 0,
  monthlyCreditsTotal: 1,
  annualFee: 0,
  perkValueUsed: 0,
  nextResetLabel: 'Awaiting connection',
  transactions: [{ id: 'empty-transaction', merchant: 'No linked transactions', amount: '--', date: 'Now', category: 'Setup' }],
};

const seedNotifications: NotificationItem[] = [
  {
    id: 'dining-credit',
    title: 'Gold dining credit is still unused',
    detail: 'You have not triggered your $10 dining credit this month. A single eligible order closes the gap.',
    action: 'Use Gold at dinner this week.',
    severity: 'warning',
  },
  {
    id: 'black-credit',
    title: 'Black Card aviation credit is untouched',
    detail: 'One of your highest-value premium benefits is still fully available.',
    action: 'Use Black Card for your next premium travel booking.',
    severity: 'urgent',
  },
  {
    id: 'platinum-airline',
    title: 'Platinum airline incidental credit is almost exhausted',
    detail: 'Only $73 remains before this annual bucket is fully used.',
    action: 'Use Platinum for your next eligible airline incidental charge.',
    severity: 'info',
  },
];

const seedRecommendations: RecommendationItem[] = [
  {
    id: 'dinner',
    category: 'Dining',
    merchant: 'Dinner in LA',
    card: 'Gold Card',
    why: '4x points plus your unused monthly dining credit.',
    runnerUp: 'Black Card only if you need concierge access to land the reservation.',
  },
  {
    id: 'flight',
    category: 'Travel',
    merchant: 'Flight to New York',
    card: 'Platinum Card',
    why: 'Best mix of airline benefits, lounge access, and remaining incidental credit value.',
    runnerUp: 'Black Card for more premium concierge/travel servicing.',
  },
  {
    id: 'shopping',
    category: 'General spend',
    merchant: 'Online shopping',
    card: 'Black Card',
    why: 'Best premium protections in this example stack when category bonuses are irrelevant.',
    runnerUp: 'Gold Card if the merchant codes as dining or grocery-adjacent.',
  },
];


const categoryGuides: CategoryGuide[] = [
  {
    key: 'restaurants',
    label: 'Dining',
    icon: '🍽️',
    headline: 'Best card for restaurants',
    bestCardId: 'amex-gold',
    bestCardLabel: 'Amex Gold',
    earnRate: '4x points',
    reason: 'Best dining multiplier in this wallet and it can stack with the monthly dining credit.',
    runnerUp: 'Chase Sapphire Reserve at 3x if you want flexible travel protections instead.',
  },
  {
    key: 'groceries',
    label: 'Groceries',
    icon: '🛒',
    headline: 'Best card for groceries',
    bestCardId: 'amex-gold',
    bestCardLabel: 'Amex Gold',
    earnRate: '4x points',
    reason: 'Highest grocery earn rate in the current wallet lineup.',
    runnerUp: 'Citi Strata Premier at 3x when you want a simpler points bucket.',
  },
  {
    key: 'flights',
    label: 'Flights',
    icon: '✈️',
    headline: 'Best card for flights',
    bestCardId: 'amex-platinum',
    bestCardLabel: 'Amex Platinum',
    earnRate: '5x points',
    reason: 'Best raw flight earn plus lounge and premium travel benefits.',
    runnerUp: 'Venture X at 5x only when booking through Capital One Travel.',
  },
  {
    key: 'gas',
    label: 'Gas',
    icon: '⛽',
    headline: 'Best card for gas',
    bestCardId: 'citi-strata-premier',
    bestCardLabel: 'Citi Strata Premier',
    earnRate: '3x points',
    reason: 'Best dedicated gas category multiplier in the current set of cards.',
    runnerUp: 'Venture X at 2x as the clean fallback.',
  },
  {
    key: 'cars',
    label: 'Cars',
    icon: '🚗',
    headline: 'Best card for rental cars',
    bestCardId: 'capital-one-venture-x',
    bestCardLabel: 'Venture X',
    earnRate: '10x miles',
    reason: 'Top earn rate when the rental is booked through Capital One Travel.',
    runnerUp: 'Chase Sapphire Reserve at 3x if you care more about rental-car coverage than portal earning.',
  },
];

const seedMerchantResults: MerchantResult[] = [
  {
    id: 'sephora-sapphire',
    merchant: 'Sephora',
    category: 'Beauty retail',
    card: 'Chase Sapphire Reserve',
    rank: 1,
    reward: '1x baseline + purchase protection',
    value: '$4.80 est. value',
    reason: 'No beauty-specific credit is active, so the Reserve wins on protection and flexible Ultimate Rewards value.',
    matchedBenefits: ['Purchase protection', 'Return protection', 'Flexible points'],
    tags: ['sephora', 'beauty', 'retail', 'shopping'],
  },
  {
    id: 'sephora-platinum',
    merchant: 'Sephora',
    category: 'Beauty retail',
    card: 'Platinum Card',
    rank: 2,
    reward: '1x + premium purchase coverage',
    value: '$3.90 est. value',
    reason: 'Good backup for higher-ticket purchases where premium protections matter more than category earn.',
    matchedBenefits: ['Extended warranty', 'Purchase protection'],
    tags: ['sephora', 'beauty', 'retail', 'shopping'],
  },
  {
    id: 'chipotle-gold',
    merchant: 'Chipotle',
    category: 'Dining',
    card: 'Gold Card',
    rank: 1,
    reward: '4x Membership Rewards',
    value: '$6.72 est. value',
    reason: 'Chipotle should code as dining, and the Gold Card also has an unused monthly dining credit in this mock wallet.',
    matchedBenefits: ['4x dining', '$10 dining credit', 'Welcome bonus spend'],
    tags: ['chipotle', 'dining', 'restaurant', 'fast casual', 'food'],
  },
  {
    id: 'chipotle-reserve',
    merchant: 'Chipotle',
    category: 'Dining',
    card: 'Chase Sapphire Reserve',
    rank: 2,
    reward: '3x Ultimate Rewards',
    value: '$5.10 est. value',
    reason: 'Strong runner-up if the Gold Card dining credit is already used.',
    matchedBenefits: ['3x dining', 'Flexible points'],
    tags: ['chipotle', 'dining', 'restaurant', 'fast casual', 'food'],
  },
  {
    id: 'wholefoods-gold',
    merchant: 'Whole Foods',
    category: 'Groceries',
    card: 'Gold Card',
    rank: 1,
    reward: '4x U.S. supermarkets',
    value: '$7.20 est. value',
    reason: 'Best grocery multiplier in this wallet and it helps keep the welcome bonus tracker moving.',
    matchedBenefits: ['4x groceries', 'Welcome bonus spend'],
    tags: ['whole foods', 'grocery', 'groceries', 'market'],
  },
  {
    id: 'delta-platinum',
    merchant: 'Delta',
    category: 'Flights',
    card: 'Platinum Card',
    rank: 1,
    reward: '5x flights',
    value: '$42.50 est. value',
    reason: 'Flights are where the Platinum Card wins cleanly, especially when lounge access and remaining airline-credit context matter.',
    matchedBenefits: ['5x airfare', 'Lounge access', 'Airline incidental credit'],
    tags: ['delta', 'flight', 'flights', 'airline', 'travel'],
  },
  {
    id: 'patagonia-reserve',
    merchant: 'Patagonia',
    category: 'Outdoor retail',
    card: 'Chase Sapphire Reserve',
    rank: 1,
    reward: '1x baseline + premium purchase protections',
    value: '$8.40 est. value',
    reason: 'No active merchant credit is known, so the Reserve wins the demo on purchase protection, return protection, and flexible point value.',
    matchedBenefits: ['Purchase protection', 'Return protection', 'Flexible points'],
    tags: ['patagonia', 'outdoor', 'retail', 'shopping', 'apparel'],
  },
  {
    id: 'amazon-freedom',
    merchant: 'Amazon',
    category: 'Online marketplace',
    card: 'Chase Freedom Flex',
    rank: 1,
    reward: '5x if quarterly category is active',
    value: '$11.25 est. value',
    reason: 'This is the clean rotating-category demo: use Freedom Flex when Amazon is active, then fall back to a broad 2x card after the cap is used.',
    matchedBenefits: ['Rotating quarterly category', 'Category cap tracking', 'Fallback reminder'],
    tags: ['amazon', 'marketplace', 'online shopping', 'shopping', 'retail'],
  },
  {
    id: 'amazon-venture',
    merchant: 'Amazon',
    category: 'Online marketplace',
    card: 'Capital One Venture X',
    rank: 2,
    reward: '2x miles fallback',
    value: '$5.70 est. value',
    reason: 'Use this as the simple fallback when rotating categories are inactive or the quarterly cap is exhausted.',
    matchedBenefits: ['2x floor', 'Purchase protections'],
    tags: ['amazon', 'marketplace', 'online shopping', 'shopping', 'retail'],
  },
];

const seedWelcomeBonuses: WelcomeBonus[] = [
  {
    id: 'venture-welcome',
    cardProductId: 'capital-one-venture-x',
    card: 'Venture X',
    issuer: 'Capital One',
    deadline: '18 days left',
    spent: 2500,
    target: 4000,
    bonus: '75,000 miles after $4,000',
    nextMove: 'Move general spend here until this offer closes.',
  },
  {
    id: 'reserve-welcome',
    cardProductId: 'chase-sapphire-reserve',
    card: 'Sapphire Reserve',
    issuer: 'Chase',
    deadline: '42 days left',
    spent: 3180,
    target: 6000,
    bonus: '60,000 points after $6,000',
    nextMove: 'Use for travel, dining, and large protected purchases.',
  },
  {
    id: 'gold-welcome',
    cardProductId: 'amex-gold',
    card: 'Gold Card',
    issuer: 'American Express',
    deadline: '19 days left',
    spent: 5358,
    target: 6000,
    bonus: '90k Membership Rewards',
    nextMove: 'Route dining and groceries here until complete.',
  },
];

function statusProgressTone(status: Benefit['status']) {
  switch (status) {
    case 'available':
      return 'bg-white';
    case 'in-progress':
      return 'bg-white/80';
    case 'expiring':
      return 'bg-white/65';
    case 'used':
      return 'bg-white/35';
  }
}

function severityTone(severity: NotificationItem['severity']) {
  switch (severity) {
    case 'info':
      return 'border-sky-400/20 bg-sky-400/10';
    case 'warning':
      return 'border-amber-300/20 bg-amber-400/10';
    case 'urgent':
      return 'border-rose-300/20 bg-rose-400/10';
  }
}

function loadPlaidLinkScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Plaid Link can only run in the browser.'));
  if (window.Plaid) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://cdn.plaid.com/link/v2/stable/link-initialize.js"]');

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Unable to load Plaid Link.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Unable to load Plaid Link.'));
    document.head.appendChild(script);
  });
}

function formatCurrency(value: number | null) {
  if (value === null) return 'Balance unavailable';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function dedupeNotifications(items: NotificationItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = item.title.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readStoredPlaidConnection(): StoredPlaidConnection | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawConnection = window.localStorage.getItem(PLAID_STORAGE_KEY);
    if (!rawConnection) return null;

    const parsedConnection = JSON.parse(rawConnection) as Partial<StoredPlaidConnection>;
    if (!Array.isArray(parsedConnection.accounts)) return null;

    return {
      accounts: parsedConnection.accounts.filter((account) => typeof account.accountId === 'string' && typeof account.name === 'string'),
    };
  } catch {
    return null;
  }
}

function buildPlaidCard(account: PlaidConnectedAccount): Card {
  const isCredit = account.type === 'credit' || account.subtype === 'credit card';
  const mappedName = account.cardProductName ?? account.name;
  const mappedIssuer = account.cardProductIssuer ?? account.institutionName;
  const hasMappedProduct = Boolean(account.cardProductId);

  return {
    id: `plaid-${account.accountId}`,
    issuer: mappedIssuer,
    name: mappedName,
    last4: account.mask,
    gradient: isCredit ? 'from-[#394150] via-[#18202b] to-[#06080d]' : 'from-[#41505a] via-[#1a2730] to-[#070b0f]',
    accent: '#f4f7fb',
    pointsLabel: hasMappedProduct ? account.institutionName : isCredit ? 'Plaid sandbox liability' : 'Plaid sandbox account',
    pointsValue: formatCurrency(account.currentBalance),
    recommendation: hasMappedProduct
      ? `${account.name} is matched to ${mappedName}. Next step is using transactions and benefits to recommend when to use it.`
      : 'Connected through Plaid Sandbox. Match this account to a card product to unlock benefits and reward rules.',
    spendSummary: account.limit ? `${formatCurrency(account.limit)} credit limit synced from Plaid.` : 'Sandbox account is connected and ready for benefit mapping.',
    categories: [account.subtype || account.type, hasMappedProduct ? 'Matched card' : 'Needs match'],
    multipliers: [{ id: `plaid-${account.accountId}-flat`, category: 'gas', label: hasMappedProduct ? 'Matched product' : 'No earn rates yet', multiplier: hasMappedProduct ? 'Rules' : '--', detail: hasMappedProduct ? 'Card product rules are attached to this account' : 'Match this Plaid account to a card product first', icon: '•' }],
    concierges: [],
    alerts: hasMappedProduct ? ['Sandbox connection active', `Matched to ${mappedName}`] : ['Sandbox connection active', 'Choose a card product match'],
    rewardReset: hasMappedProduct ? 'Card product rules are attached. Transaction-aware recommendations come next.' : 'Plaid connection established. Rewards and perk calendars still need issuer rules.',
    annualFeeMonth: 'Not synced',
    monthlyCreditsUsed: 0,
    monthlyCreditsTotal: 1,
    annualFee: 0,
    perkValueUsed: 0,
    nextResetLabel: 'Awaiting benefit mapping',
    transactions:
      account.recentTransactions && account.recentTransactions.length > 0
        ? account.recentTransactions.slice(0, 5)
        : [{ id: `plaid-${account.accountId}-1`, merchant: account.institutionName, amount: formatCurrency(account.currentBalance), date: 'Synced now', category: account.subtype || account.type }],
    benefits: [{ id: `plaid-${account.accountId}-benefit`, title: 'Plaid connection', status: 'available', detail: 'Sandbox account data is available to the app.', progress: 100 }],
    isBusiness: false,
  };
}

export default function WalletPrototype() {
  const { authStatus, profileStatus, authFlow, user, setAuthFlow, signInWithGoogle, signInWithApple, signInWithEmail, confirmEmail, completeProfileSetup, signOut } =
    useAuth();
  const [usesSupabase] = useState(() => Boolean(getBrowserSupabaseClient()));
  const [initialPlaidConnection] = useState<StoredPlaidConnection | null>(() => (getBrowserSupabaseClient() ? null : readStoredPlaidConnection()));
  const [cards, setCards] = useState<Card[]>(() => {
    const accounts = initialPlaidConnection?.accounts ?? [];
    if (accounts.length === 0) return seedCards;

    const creditAccounts = accounts.filter((account) => account.type === 'credit' || account.subtype === 'credit card');
    const accountsToAdd = creditAccounts.length > 0 ? creditAccounts : accounts.slice(0, 1);

    return [...seedCards, ...accountsToAdd.map(buildPlaidCard)];
  });
  const [notifications] = useState(seedNotifications);
  const [recommendations] = useState(seedRecommendations);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string | null>(recommendations[0].id);
  const [emailDraft, setEmailDraft] = useState('');
  const [purchaseCategory, setPurchaseCategory] = useState<PurchaseCategory>('Dining');
  const [showMerchantSearch, setShowMerchantSearch] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const [selectedCategoryKey, setSelectedCategoryKey] = useState<CategoryKey>('groceries');

  const [plaidAccounts, setPlaidAccounts] = useState<PlaidConnectedAccount[]>(() => initialPlaidConnection?.accounts ?? []);
  const [walletAnalysis, setWalletAnalysis] = useState<WalletAnalysis | null>(null);
  const [walletAnalysisStatus, setWalletAnalysisStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [walletAnalysisError, setWalletAnalysisError] = useState<string | null>(null);
  const customCardIdRef = useRef(0);

  const [notificationSettings, setNotificationSettings] = useState({
    allowNotifications: true,
    paymentDue: true,
    benefitExpiring: true,
    spendMilestones: false,
  });

  const {
    closeAddCardSheet,
    draftCard,
    manualCardProductId,
    openAddCardSheet,
    scanStep,
    setDraftBusiness,
    setDraftIssuer,
    setDraftLast4,
    setDraftName,
    setManualCardProductId,
    setScanStep,
    showScanner,
    showSuccessThenClose,
  } = useAddCardPresentation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (usesSupabase) {
      window.localStorage.removeItem(PLAID_STORAGE_KEY);
      return;
    }

    if (plaidAccounts.length > 0) {
      window.localStorage.setItem(PLAID_STORAGE_KEY, JSON.stringify({ accounts: plaidAccounts }));
      return;
    }

    window.localStorage.removeItem(PLAID_STORAGE_KEY);
  }, [plaidAccounts, usesSupabase]);

  const syncPlaidAccountsToWallet = useCallback((accounts: PlaidConnectedAccount[]) => {
    const creditAccounts = accounts.filter((account) => account.type === 'credit' || account.subtype === 'credit card');
    const accountsToAdd = creditAccounts.length > 0 ? creditAccounts : accounts.slice(0, 1);
    const isUserBackedWallet = usesSupabase && authStatus === 'authenticated' && profileStatus === 'ready';

    setPlaidAccounts(accounts);
    setCards((currentCards) => {
      const nonPlaidCards = currentCards.filter((card) => !card.id.startsWith('plaid-'));
      return isUserBackedWallet ? accountsToAdd.map(buildPlaidCard) : [...nonPlaidCards, ...accountsToAdd.map(buildPlaidCard)];
    });
  }, [authStatus, profileStatus, usesSupabase]);

  const loadWalletAnalysis = useCallback(async () => {
    if (!usesSupabase || authStatus !== 'authenticated' || profileStatus !== 'ready') {
      setWalletAnalysis(null);
      setWalletAnalysisStatus('idle');
      setWalletAnalysisError(null);
      return;
    }

    const supabase = getBrowserSupabaseClient();
    if (!supabase) return;

    setWalletAnalysisStatus('loading');
    setWalletAnalysisError(null);

    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error('Sign in again to refresh wallet analysis.');

      const response = await fetch('/api/wallet/analysis', {
        headers: { Authorization: 'Bearer ' + accessToken },
      });
      const payload = (await response.json()) as WalletAnalysisResponse;

      if (!response.ok || !payload.analysis) {
        throw new Error(payload.error ?? 'Unable to load wallet analysis.');
      }

      setWalletAnalysis(payload.analysis);
      setWalletAnalysisStatus('ready');
    } catch (error) {
      setWalletAnalysis(null);
      setWalletAnalysisStatus('error');
      setWalletAnalysisError(error instanceof Error ? error.message : 'Unable to load wallet analysis.');
    }
  }, [authStatus, profileStatus, usesSupabase]);

  const {
    cardProducts,
    plaidStatus,
    setPlaidStatus,
    plaidError,
    setPlaidError,
    plaidTransactions,
    setPlaidTransactions,
    loadPersistedPlaidState,
  } = usePersistedPlaidData({
    enabled: authStatus === 'authenticated' && profileStatus === 'ready',
    initialStatus: initialPlaidConnection?.accounts.length ? 'connected' : 'idle',
    syncPlaidAccountsToWallet,
    loadWalletAnalysis,
  });

  const isUserBackedWallet = usesSupabase && authStatus === 'authenticated' && profileStatus === 'ready';
  const visibleCards = useMemo(() => (isUserBackedWallet ? cards.filter((card) => card.id.startsWith('plaid-')) : cards), [cards, isUserBackedWallet]);
  const visibleCardIds = useMemo(() => new Set(visibleCards.map((card) => card.id)), [visibleCards]);
  const isEmptyUserWallet = isUserBackedWallet && visibleCards.length === 0;
  const {
    screen,
    selectedCard,
    selectedId,
    selectCard: selectWalletCard,
    setScreen,
    setSelectedId,
    setWalletPageIndex,
    setWalletSelectionExpanded,
    shiftWalletPage,
    resetToWallet,
    walletPageIndex,
    walletSelectionExpanded,
    walletStackItems,
  } = useWalletNavigation({
    emptyCard: emptyWalletCard,
    fallbackCard: seedCards[0],
    initialSelectedId: 'amex-gold',
    isEmptyWallet: isEmptyUserWallet,
    visibleCards,
  });

  const {
    accountPendingRemoval,
    connectPlaidSandbox,
    editingMatchAccountIds,
    finishManualCardAdd: saveManualCard,
    manualCardStatus,
    matchStatusByAccount,
    pendingLinkedAccounts,
    removingAccountIds,
    requestRemoveConnectedAccount,
    removeConnectedAccount,
    setAccountPendingRemoval,
    setEditingMatchAccountIds,
    setManualCardStatus,
    setPendingLinkedAccounts,
    syncPlaidTransactions,
    transactionSyncStatus,
    updateCardMatch,
  } = usePlaidWalletActions({
    user,
    plaidAccounts,
    cardProducts,
    syncPlaidAccountsToWallet,
    loadPersistedPlaidState,
    loadWalletAnalysis,
    setAuthFlow,
    setPlaidError,
    setPlaidStatus,
    onManualCardAdded: (account) => {
      selectWalletCard(`plaid-${account.accountId}`);
      showSuccessThenClose(() => {
        setScreen('wallet');
        setManualCardStatus('idle');
      });
    },
    onPlaidAccountsLinked: (accounts) => {
      const firstAddedAccount = accounts[0];
      if (firstAddedAccount) {
        setSelectedId(`plaid-${firstAddedAccount.accountId}`);
      }
      setWalletPageIndex(0);
      setScanStep('match');
    },
    onCardMatchSaved: (account) => {
      setSelectedId(`plaid-${account.accountId}`);
    },
    onConnectedAccountRemoved: (account, nextAccounts) => {
      if (selectedId === `plaid-${account.accountId}`) {
        setSelectedId(nextAccounts[0] ? `plaid-${nextAccounts[0].accountId}` : seedCards[0].id);
      }
    },
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadWalletAnalysis();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadWalletAnalysis]);

  const {
    featuredMerchant,
    merchantQuery,
    merchantRecommendationError,
    merchantRecommendationStatus,
    merchantResults,
    openUseNowDemo,
    setMerchantQuery,
  } = useMerchantRecommendation<Screen>({
    isUserBackedWallet,
    seedMerchantResults,
    setScreen,
    setShowMerchantSearch,
    setWalletSelectionExpanded,
  });
  const selectedPlaidAccount = useMemo(
    () => plaidAccounts.find((account) => `plaid-${account.accountId}` === selectedId) ?? null,
    [plaidAccounts, selectedId],
  );
  const selectedAnalysisTrackers = useMemo(
    () => (selectedPlaidAccount?.cardProductId ? (walletAnalysis?.trackers ?? []).filter((tracker) => tracker.cardProductId === selectedPlaidAccount.cardProductId) : []),
    [selectedPlaidAccount, walletAnalysis],
  );
  const welcomeBonuses = useMemo(() => {
    if (!isUserBackedWallet) return seedWelcomeBonuses;
    if (walletAnalysis) return walletAnalysis.welcomeBonuses.map(welcomeBonusFromTracker);

    const linkedCardProductIds = new Set(plaidAccounts.map((account) => account.cardProductId).filter(Boolean));
    return seedWelcomeBonuses.filter((bonus) => linkedCardProductIds.has(bonus.cardProductId));
  }, [isUserBackedWallet, plaidAccounts, walletAnalysis]);
  const displayedBenefits = useMemo(
    () => (isUserBackedWallet && selectedAnalysisTrackers.length > 0 ? selectedAnalysisTrackers.map(benefitFromTracker) : selectedCard.benefits),
    [isUserBackedWallet, selectedAnalysisTrackers, selectedCard.benefits],
  );
  const visibleNotifications = useMemo<NotificationItem[]>(() => {
    if (!isUserBackedWallet) return notifications;

    return (walletAnalysis?.alerts ?? []).map(alertFromAnalysis);
  }, [isUserBackedWallet, notifications, walletAnalysis]);
  const filteredRecommendations = useMemo<RecommendationItem[]>(() => [], []);
  const selectedRecommendation = useMemo(
    () => filteredRecommendations.find((r) => r.id === selectedRecommendationId) ?? filteredRecommendations[0],
    [filteredRecommendations, selectedRecommendationId],
  );
  const { matchSuggestionByAccountId } = usePlaidAccountMatching(plaidAccounts, cardProducts);
  const effectiveManualCardProductId = manualCardProductId || cardProducts[0]?.id || '';
  const selectedManualCardProduct = useMemo(
    () => cardProducts.find((product) => product.id === effectiveManualCardProductId) ?? null,
    [cardProducts, effectiveManualCardProductId],
  );

  const analysisTransactionRecommendations = useMemo(
    () => (walletAnalysis?.recommendations ?? []).map(recommendationFromAnalysis),
    [walletAnalysis],
  );
  const localTransactionRecommendations = useMemo<TransactionRecommendation[]>(() => {
    return deriveLocalTransactionRecommendations({ plaidTransactions, cardProducts, plaidAccounts });
  }, [cardProducts, plaidAccounts, plaidTransactions]);
  const transactionRecommendations = walletAnalysis ? analysisTransactionRecommendations : localTransactionRecommendations;
  const expiringValueRecommendations = useMemo(() => dedupeTransactionRecommendations(transactionRecommendations).slice(0, 4), [transactionRecommendations]);
  const expiringValueAlerts = useMemo(() => dedupeNotifications(visibleNotifications).slice(0, 4), [visibleNotifications]);
  const featuredTransactionRecommendation = transactionRecommendations[0] ?? null;
  const selectedCategoryGuide = useMemo(
    () => categoryGuides.find((guide) => guide.key === selectedCategoryKey) ?? categoryGuides[0],
    [selectedCategoryKey],
  );
  const recommendedCategoryCard = useMemo(
    () => cards.find((card) => card.id === selectedCategoryGuide.bestCardId) ?? cards[0],
    [cards, selectedCategoryGuide.bestCardId],
  );
  const conciergeCards = useMemo(() => cards.filter((card) => card.concierges.length > 0), [cards]);
  const conciergeEntries = useMemo(
    () => conciergeCards.flatMap((card) => card.concierges.map((concierge) => ({ ...concierge, cardName: card.name, cardId: card.id, gradient: card.gradient }))),
    [conciergeCards],
  );

  function openScanner() {
    setWalletSelectionExpanded(false);
    setShowProfileMenu(false);
    if (authStatus === 'anonymous') {
      setAuthFlow('entry');
      return;
    }

    if (profileStatus === 'missing') {
      setAuthFlow('setup');
      return;
    }

    openAddCardSheet('plaid');
  }

  function selectCard(cardId: string) {
    selectWalletCard(cardId);
    setShowProfileMenu(false);
  }

  function openProfileEntry() {
    setShowProfileMenu(false);
    setAuthFlow('entry');
  }

  function openProfileScreen() {
    setShowProfileMenu(false);
    if (authStatus === 'anonymous') {
      setAuthFlow('entry');
      return;
    }

    if (profileStatus === 'missing') {
      setAuthFlow('setup');
      return;
    }

    setScreen('profile');
  }

  function openConnectedAccountsScreen() {
    setShowProfileMenu(false);
    if (authStatus === 'anonymous') {
      setAuthFlow('entry');
      return;
    }

    if (profileStatus === 'missing') {
      setAuthFlow('setup');
      return;
    }

    setScreen('connected-accounts');
  }

  async function handleSignOut() {
    await signOut();
    setCards(seedCards);
    setPlaidAccounts([]);
    setPendingLinkedAccounts([]);
    setPlaidTransactions([]);
    setWalletAnalysis(null);
    setWalletAnalysisStatus('idle');
    setWalletAnalysisError(null);
    setPlaidStatus('idle');
    setPlaidError(null);
    setShowProfileMenu(false);
    resetToWallet();
  }

  function finishDemoAdd() {
    if (isUserBackedWallet) {
      void finishManualCardAdd();
      return;
    }

    const newCard: Card = {
      id: `custom-${++customCardIdRef.current}`,
      issuer: draftCard.issuer,
      name: draftCard.name,
      last4: draftCard.last4,
      gradient: 'from-[#364054] via-[#18202d] to-[#070a0f]',
      accent: '#f4f5f7',
      pointsLabel: 'Rewards',
      pointsValue: '18,240 pts',
      recommendation: 'Newly added card — set your perks and value rules next.',
      spendSummary: 'No spend tracking configured yet.',

      categories: draftCard.isBusiness ? ['Business', 'Custom'] : ['Personal', 'Custom'],
      multipliers: [{ id: 'custom-flat', category: 'gas', label: 'Custom category', multiplier: 'Set rate', detail: 'Map bonus categories after onboarding', icon: '⚙️' }],
      concierges: [],
      alerts: [draftCard.isBusiness ? 'Business card added to the wallet prototype' : 'New card added to the wallet prototype'],

      rewardReset: 'Set custom reset timing',
      annualFeeMonth: 'Not set',
      monthlyCreditsUsed: 0,
      monthlyCreditsTotal: 1,
      annualFee: 0,
      perkValueUsed: 0,
      nextResetLabel: 'Configure after setup',
      transactions: [{ id: 'c1', merchant: 'Awaiting connection', amount: '--', date: 'Now', category: 'Setup' }],
      benefits: [{ id: 'custom-benefit', title: 'Starter perk slot', status: 'available', detail: 'Add real benefits in a later build', progress: 0 }],
      isBusiness: draftCard.isBusiness,
    };
    setCards((prev) => [...prev, newCard]);
    selectWalletCard(newCard.id);
    showSuccessThenClose(() => {
      setScreen('wallet');
    });
  }

  async function finishManualCardAdd() {
    if (!isUserBackedWallet) {
      finishDemoAdd();
      return;
    }

    const cardProductId = selectedManualCardProduct?.id ?? effectiveManualCardProductId;
    await saveManualCard({
      cardProductId,
      selectedProduct: selectedManualCardProduct,
      draftCard,
    });
  }

  function finishLinkedCardSetup() {
    setPendingLinkedAccounts([]);
    closeAddCardSheet();
    setScreen('wallet');
    setWalletPageIndex(0);
  }

  return (
    <MotionConfig transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.9 }}>
      <div className="min-h-screen bg-[#080b13] text-white">
        <div className="flex min-h-screen w-full max-w-none flex-col px-0 pb-8 pt-0 sm:mx-auto sm:max-w-[390px] sm:px-3 sm:pt-5">
          {screen === 'wallet' && (
            <section
              className="relative flex min-h-screen flex-col gap-0 overflow-hidden rounded-none border border-white/8 bg-black px-4 pb-5 pt-5 shadow-[0_34px_90px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.05)] sm:min-h-[calc(100vh-40px)] sm:rounded-[34px]"
              style={appleInfoFontStyle}
            >
              <div className="pointer-events-none absolute inset-x-10 top-0 h-28 rounded-full bg-white/[0.035] blur-3xl" />
              <div className="relative mb-4 flex items-start justify-between">
                {walletPageIndex > 0 ? (
                  <button
                    type="button"
                    aria-label="Back to wallet overview"
                    onClick={() => setWalletPageIndex(0)}
                    className="flex h-9 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-medium text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="m12.4 4.8-5.2 5.2 5.2 5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Back
                  </button>
                ) : (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-white/44">Card Reader</p>
                    <h1 className="mt-1 text-[30px] font-semibold tracking-[-0.045em] text-white">Wallet</h1>
                  </div>
                )}
                <div className="relative flex items-center gap-2.5">
                  <button
                    type="button"
                    aria-label="Search merchants"
                    onClick={() => {
                      setShowMerchantSearch((value) => {
                        if (value) setMerchantQuery('');
                        return !value;
                      });
                      setWalletSelectionExpanded(false);
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <circle cx="8.7" cy="8.7" r="4.6" stroke="currentColor" strokeWidth="1.55" />
                      <path d="m12.2 12.2 3.2 3.2" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label="Add pass"
                    onClick={openScanner}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M10 4.7v10.6M4.7 10h10.6" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label="Profile or passes"
                    onClick={() => setShowProfileMenu((value) => !value)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <circle cx="10" cy="7.1" r="2.6" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M5.9 15.2c.9-2 2.4-3 4.1-3s3.2 1 4.1 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>

                  <ProfileMenu
                    isOpen={showProfileMenu}
                    isAuthenticated={authStatus === 'authenticated'}
                    onCreateProfile={openProfileEntry}
                    onSignIn={openProfileEntry}
                    onOpenProfile={openProfileScreen}
                    onOpenConnectedAccounts={openConnectedAccountsScreen}
                    onSignOut={handleSignOut}
                  />
                </div>
              </div>

              {showMerchantSearch ? (
                <motion.div
                  key="merchant-search-panel"
                  initial={{ x: '100%', opacity: 0.75 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: '100%', opacity: 0 }}
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.12}
                  onDragEnd={(_, info) => {
                    if (info.offset.x > 70) {
                      setMerchantQuery('');
                      setShowMerchantSearch(false);
                    }
                  }}
                  className="flex min-h-[calc(100vh-116px)] flex-col"
                  style={appleInfoFontStyle}
                >
                  <div className="mb-4 flex items-center justify-between px-1">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/44">Use Now</p>
                      <h2 className="mt-1 text-[28px] font-semibold tracking-[-0.04em] text-white">Pick the right card</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMerchantQuery('');
                        setShowMerchantSearch(false);
                      }}
                      className="rounded-full bg-[#2c2c2e] px-3 py-1.5 text-sm font-medium text-white/88"
                    >
                      Done
                    </button>
                  </div>

                  <div className="rounded-[28px] border border-white/12 bg-white p-3 text-[#080a0f] shadow-[0_24px_54px_rgba(0,0,0,0.3)]">
                    <div className="flex items-center gap-3">
                      <svg className="shrink-0 text-black/45" width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                        <circle cx="8.7" cy="8.7" r="4.6" stroke="currentColor" strokeWidth="1.55" />
                        <path d="m12.2 12.2 3.2 3.2" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
                      </svg>
                      <input
                        autoFocus
                        value={merchantQuery}
                        onChange={(event) => setMerchantQuery(event.target.value)}
                        placeholder="Search Whole Foods, Patagonia, Delta..."
                        className="min-w-0 flex-1 bg-transparent text-[17px] font-semibold outline-none placeholder:text-black/35"
                      />
                      {merchantQuery.trim() && (
                        <button type="button" onClick={() => setMerchantQuery('')} className="rounded-full bg-black/8 px-2 py-1 text-[12px] font-medium text-black/52">
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {!merchantQuery.trim() && (
                    <div className="mt-4">
                      <p className="px-1 text-[12px] font-medium text-white/54">Demo merchants</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {useNowDemoMerchantNames.map((merchant) => (
                          <button
                            key={merchant}
                            type="button"
                            onClick={() => openUseNowDemo(merchant)}
                            className="rounded-full border border-white/12 bg-white/[0.07] px-3 py-2 text-xs font-medium text-white/76 transition hover:bg-white/12"
                          >
                            {merchant}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

	                  {merchantQuery.trim() && (
	                    <div className="mt-4 flex-1 space-y-3 overflow-y-auto pb-4 [scrollbar-width:none]">
	                      {merchantRecommendationStatus === 'loading' && (
	                        <div className="rounded-[24px] border border-white/10 bg-white/[0.07] p-4 text-[13px] leading-5 text-white/70">
	                          Checking live recommendation...
	                        </div>
	                      )}
	                      {merchantRecommendationStatus === 'error' && merchantRecommendationError && (
	                        <div className="rounded-[24px] border border-amber-300/18 bg-amber-300/10 p-4 text-[13px] leading-5 text-amber-50/86">
	                          {merchantRecommendationError}
	                        </div>
	                      )}
	                      {merchantResults.length > 0 ? (
                        merchantResults.map((item, index) => (
                          <div key={item.id} className={index === 0 ? 'rounded-[26px] bg-white p-4 text-[#080a0f]' : 'rounded-[24px] border border-white/10 bg-white/[0.07] p-4'}>
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className={index === 0 ? 'text-[10px] font-semibold uppercase tracking-[0.2em] text-black/40' : 'text-[10px] font-semibold uppercase tracking-[0.2em] text-white/42'}>
                                  {index === 0 ? 'Top result' : item.category}
                                </p>
                                <h3 className={index === 0 ? 'mt-1 text-[19px] font-semibold tracking-[-0.03em]' : 'mt-1 text-[17px] font-semibold tracking-[-0.03em] text-white'}>Use {item.card}</h3>
                                <p className={index === 0 ? 'mt-1 text-[13px] text-black/55' : 'mt-1 text-[13px] text-white/58'}>{item.merchant} · {item.reward}</p>
                              </div>
                              <span className={index === 0 ? 'rounded-full bg-black px-2.5 py-1 text-xs font-semibold text-white' : 'rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white'}>#{item.rank}</span>
                            </div>
                            <div className={index === 0 ? 'mt-3 grid grid-cols-2 gap-2 text-[#080a0f]' : 'mt-3 grid grid-cols-2 gap-2 text-white'}>
                              <div className={index === 0 ? 'rounded-2xl bg-black/[0.04] px-3 py-2' : 'rounded-2xl bg-white/[0.06] px-3 py-2'}>
                                <p className={index === 0 ? 'text-[11px] text-black/40' : 'text-[11px] text-white/40'}>Value</p>
                                <p className="mt-1 text-[13px] font-semibold">{item.value}</p>
                              </div>
                              <div className={index === 0 ? 'rounded-2xl bg-black/[0.04] px-3 py-2' : 'rounded-2xl bg-white/[0.06] px-3 py-2'}>
                                <p className={index === 0 ? 'text-[11px] text-black/40' : 'text-[11px] text-white/40'}>Category</p>
                                <p className="mt-1 text-[13px] font-semibold">{item.category}</p>
                              </div>
                            </div>
                            <p className={index === 0 ? 'mt-3 text-[13px] leading-5 text-black/62' : 'mt-3 text-[13px] leading-5 text-white/66'}>{item.reason}</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {item.matchedBenefits.map((benefit) => (
                                <span key={benefit} className={index === 0 ? 'rounded-full bg-black/[0.06] px-2.5 py-1 text-[11px] font-medium text-black/62' : 'rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-medium text-white/66'}>
                                  {benefit}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[24px] border border-white/10 bg-white/[0.07] p-4 text-[13px] leading-5 text-white/70">
                          No mock merchant match yet. Backend search will fall back to merchant category and issuer offer matching.
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              ) : (
                <>
              <div className="relative z-20">
                <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none]">

                  <motion.div
                    layout
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.12}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -70) {
                        setShowMerchantSearch(true);
                        setWalletSelectionExpanded(false);
                      }
                    }}
                    className={`relative aspect-[1.586/1] min-w-full snap-center overflow-hidden rounded-[24px] bg-gradient-to-br ${selectedCard.gradient} px-5 pb-5 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_30px_64px_rgba(0,0,0,0.42)]`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%)]" />
                    <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_35%,rgba(0,0,0,0.28))]" />
                    <div className="absolute inset-x-4 top-3 h-px bg-white/15" />

                    <div className="relative flex h-full flex-col justify-between text-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.28em] text-white/72">{selectedCard.issuer}</p>
                          <h2 className="mt-2 text-[15px] font-medium tracking-[-0.01em] text-white/80">{selectedCard.name}</h2>
                        </div>
                        <div className="rounded-full border border-white/14 bg-black/22 px-3 py-1 text-xs text-white/82 backdrop-blur">•••• {selectedCard.last4}</div>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">Current balance</p>
                        <p className="mt-1 text-[30px] font-semibold tracking-[-0.04em]">{selectedCard.pointsValue}</p>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <p className="text-[12px] text-white/74">{selectedCard.pointsLabel}</p>
                          <div className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/84">
                            {selectedCard.isBusiness ? 'Business' : 'Active'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="relative z-10 pt-3">
                <button
                  type="button"
                  onClick={() => openUseNowDemo(featuredMerchant.merchant)}
                  className="mb-3 flex w-full items-center justify-center rounded-full bg-white px-5 py-3.5 text-center text-[15px] font-semibold tracking-[-0.02em] text-[#05070c] shadow-[0_16px_32px_rgba(0,0,0,0.24)]"
                  style={appleInfoFontStyle}
                >
                  Use now - find the best card
                </button>

                <div
                  className="rounded-[24px] border border-white/10 bg-white/[0.07] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                  style={appleInfoFontStyle}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-white/92">
                      <p className="text-[18px] font-semibold tracking-[-0.03em] capitalize">{pageMeta[walletPages[walletPageIndex]].title}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => shiftWalletPage(-1)} className="mr-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/7 text-white/70" aria-label="Previous wallet panel">
                        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="m12.2 5-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {walletPages.map((page, index) => (
                        <button
                          key={page}
                          type="button"
                          onClick={() => setWalletPageIndex(index)}
                          className={`rounded-full transition ${walletPageIndex === index ? 'h-2.5 w-7 bg-white' : 'h-2.5 w-2.5 bg-white/35'}`}
                          aria-label={page}
                        />
                      ))}
                      <button type="button" onClick={() => shiftWalletPage(1)} className="ml-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/7 text-white/70" aria-label="Next wallet panel">
                        <svg width="13" height="13" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                          <path d="m7.8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>

                <motion.div
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.12}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -60) shiftWalletPage(1);
                    if (info.offset.x > 60) shiftWalletPage(-1);
                  }}
                  className="mt-2 cursor-grab active:cursor-grabbing"
                >
                  <div
                    className="min-h-[216px] px-1 py-1"
                    style={appleInfoFontStyle}
                  >
                    {walletPages[walletPageIndex] === 'benefits' && (
                      <div>
                        <div className="mb-1 flex items-center justify-between px-1 pb-2">
                          <p className="text-[11px] font-medium tracking-[0.01em] text-white/58">Available now</p>
                          <p className="text-xs text-white/70">{displayedBenefits.length} benefits</p>
                        </div>
                        <div className="divide-y divide-white/10">
                          {displayedBenefits.map((benefit) => (
                            <motion.div layout key={benefit.id} className="px-1 py-4 first:pt-0 last:pb-1">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-[15px] font-semibold tracking-[-0.02em] text-white">{benefit.title}</p>
                                  <p className="mt-1 text-[12px] leading-5 text-white/58">{benefit.detail}</p>
                                </div>
                                <span className="shrink-0 text-[12px] text-white/58">{benefit.progress ?? 0}%</span>
                              </div>
                              {typeof benefit.progress === 'number' && (
                                <div className="mt-3 h-2 rounded-full bg-white/8">
                                  <motion.div
                                    className={`h-2 rounded-full ${statusProgressTone(benefit.status)}`}
                                    animate={{ width: `${Math.max(benefit.progress, 6)}%` }}
                                  />
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}

                    {walletPages[walletPageIndex] === 'multipliers' && (
                      <div>
                        <div className="mb-1 flex items-center justify-between px-1 pb-3">
                          <p className="text-[11px] font-medium tracking-[0.01em] text-white/58">Category earn rates</p>
                          <p className="text-xs text-white/70">{selectedCard.multipliers.length} categories</p>
                        </div>
                        <div className="space-y-2">
                          {selectedCard.multipliers.map((item) => (
                            <div key={item.id} className="rounded-[22px] border border-white/8 bg-white/[0.04] px-3 py-3.5">
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/8 text-lg">{item.icon}</div>
                                  <div>
                                    <p className="text-[15px] font-semibold tracking-[-0.02em] text-white">{item.label}</p>
                                    <p className="mt-0.5 text-[12px] leading-5 text-white/66">{item.detail}</p>
                                  </div>
                                </div>
                                <div className="shrink-0 rounded-full border border-white/10 bg-white/8 px-3 py-1.5 text-sm font-semibold text-white">
                                  {item.multiplier}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {walletPages[walletPageIndex] === 'rewards' && (
                      <div className="divide-y divide-white/10">
                        <div className="px-1 pb-4">
                          <p className="text-[11px] font-medium tracking-[0.01em] text-white/58">Current total</p>
                          <p className="mt-2 text-[32px] font-semibold tracking-[-0.04em] text-white">{selectedCard.pointsValue}</p>
                          <p className="mt-1 text-[13px] text-white/70">{selectedCard.pointsLabel}</p>
                        </div>
                        <div className="px-1 pt-4">
                          <p className="text-[11px] font-medium tracking-[0.01em] text-white/58">Membership year</p>
                          <p className="mt-2 text-base font-medium text-white">Annual fee posts in {selectedCard.annualFeeMonth}</p>
                          <p className="mt-3 text-sm leading-6 text-white/72">{selectedCard.rewardReset}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            {selectedCard.categories.map((category) => (
                              <span key={category} className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] px-3 py-1 text-xs text-white/90">
                                {category}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {walletPages[walletPageIndex] === 'progress' && (
                      <div className="divide-y divide-white/10">
                        <div className="px-1 pb-4">
                          <p className="text-[11px] font-medium tracking-[0.01em] text-white/58">Next unlock</p>
                          <p className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-white">{selectedCard.spendSummary}</p>
                        </div>
                        <div className="grid grid-cols-2 divide-x divide-white/10">
                          <div className="px-1 py-4 pr-4">
                            <p className="text-[11px] font-medium tracking-[0.01em] text-white/58">Monthly credits</p>
                            <p className="mt-2 text-2xl font-semibold text-white">{selectedCard.monthlyCreditsUsed}/{selectedCard.monthlyCreditsTotal}</p>
                            <p className="mt-1 text-sm text-white/74">Used this cycle</p>
                          </div>
                          <div className="py-4 pl-4 pr-1">
                            <p className="text-[11px] font-medium tracking-[0.01em] text-white/58">Next reset</p>
                            <p className="mt-2 text-base font-medium text-white">{selectedCard.nextResetLabel}</p>
                          </div>
                        </div>
                      </div>
                    )}

                      {walletPages[walletPageIndex] === 'recommendations' && (
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3 px-1">
                            <div className="min-w-0">
                              <p className="text-[11px] font-medium tracking-[0.01em] text-white/58">Best next move</p>
                              <p className="mt-1 text-[20px] font-semibold tracking-[-0.03em] text-white">
                                {featuredTransactionRecommendation ? 'Use ' + featuredTransactionRecommendation.bestCard : 'Use ' + selectedCard.name}
                              </p>
                            </div>
                            {featuredTransactionRecommendation && (
                              <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#10131a]">
                                Missed value {featuredTransactionRecommendation.estimatedLift}
                              </span>
                            )}
                          </div>

                          {featuredTransactionRecommendation ? (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded-2xl bg-white/[0.06] px-3 py-2">
                                <p className="text-[11px] text-white/42">Transaction</p>
                                <p className="mt-1 truncate text-[13px] font-semibold text-white">{featuredTransactionRecommendation.merchant}</p>
                                <p className="mt-0.5 text-[12px] text-white/56">{featuredTransactionRecommendation.amount}</p>
                              </div>
                              <div className="rounded-2xl bg-white/[0.06] px-3 py-2">
                                <p className="text-[11px] text-white/42">Better card</p>
                                <p className="mt-1 truncate text-[13px] font-semibold text-white">{featuredTransactionRecommendation.bestCard}</p>
                                <p className="mt-0.5 text-[12px] text-white/56">
                                  {featuredTransactionRecommendation.bestMultiplier}x vs {featuredTransactionRecommendation.currentMultiplier}x
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="px-1 text-[14px] leading-6 text-white/72">{selectedCard.recommendation}</p>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {selectedCard.categories.slice(0, 3).map((category) => (
                              <span key={category} className="rounded-full border border-white/10 bg-[rgba(255,255,255,0.06)] px-3 py-1 text-xs text-white/90">
                                {category}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>

              </div>

              {welcomeBonuses.length > 0 && (
              <div className="relative z-10 mt-3" style={appleInfoFontStyle}>
                <div className="mb-2 flex items-center justify-between px-1">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-white/44">Welcome bonuses</p>
                    <p className="mt-0.5 text-[13px] text-white/70">{welcomeBonuses.length} in progress</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/72">Swipe</span>
                </div>
                <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
                  {welcomeBonuses.map((bonus) => {
                    const progress = Math.min(100, Math.round((bonus.spent / bonus.target) * 100));
                    return (
                      <div key={bonus.id} className="min-w-[78%] snap-start rounded-[24px] border border-white/10 bg-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-white/44">{bonus.issuer}</p>
                            <p className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-white">{bonus.card}</p>
                          </div>
                          <span className="shrink-0 rounded-full bg-amber-300/14 px-2.5 py-1 text-[11px] font-medium text-amber-100">{bonus.deadline}</span>
                        </div>
                        <p className="mt-3 text-[13px] leading-5 text-white/68">{bonus.bonus}</p>
                        <div className="mt-3 h-2 rounded-full bg-white/8">
                          <div className="h-2 rounded-full bg-white" style={{ width: `${Math.max(progress, 7)}%` }} />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[12px] text-white/62">
                          <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(bonus.spent)}</span>
                          <span>{progress}%</span>
                          <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(bonus.target)}</span>
                        </div>
                        <p className="mt-3 text-[13px] leading-5 text-white/78">{bonus.nextMove}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              )}

              <div className="relative z-10 mt-3 pb-2 pt-0">
                <div className={`relative overflow-hidden rounded-[30px] transition-all duration-300 ${walletSelectionExpanded ? 'h-[430px]' : 'h-[250px]'}`}>
                  {walletStackItems.map((card, index) => {
                    const isAddCard = card.id === 'add-card';
                    const top = walletSelectionExpanded ? 12 + index * 62 : 18 + index * 18;
                    const scale = walletSelectionExpanded ? 1 : 1 - index * 0.024;
                    const opacity = walletSelectionExpanded ? 1 : 1 - index * 0.05;
                    const zIndex = walletSelectionExpanded ? walletStackItems.length - index : 20 - index;
                    const cardClassName = isAddCard
                      ? 'absolute inset-x-0 rounded-[30px] border border-dashed border-white/18 bg-[#8d949f]/24 px-5 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_30px_rgba(0,0,0,0.16)]'
                      : `absolute inset-x-0 rounded-[30px] bg-gradient-to-br ${(card as Card).gradient} px-5 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_30px_rgba(0,0,0,0.22)]`;
                    return (
                      <motion.button
                        key={card.id}
                        layout
                        type="button"
                        onClick={() => {
                          if (!walletSelectionExpanded) {
                            setWalletSelectionExpanded(true);
                            return;
                          }
                          if (isAddCard) {
                            openScanner();
                            return;
                          }
                          selectCard(card.id);
                        }}
                        whileTap={{ scale: walletSelectionExpanded ? 0.988 : scale - 0.012 }}
                        className={cardClassName}
                        style={{ top, zIndex }}
                        animate={{
                          scale,
                          opacity,
                          y: walletSelectionExpanded ? 0 : index * 1.5,
                        }}
                        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                      >
                        {!isAddCard && <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_28%)]" />}
                        <div className={`relative flex items-start justify-between ${isAddCard ? 'text-white/92' : 'text-white'}`}>
                          <div>
                            <p className="text-[10px] uppercase tracking-[0.24em] text-white/70">{card.issuer}</p>
                            <p className="mt-6 text-[20px] font-semibold tracking-[-0.02em] text-white">{card.name}</p>
                          </div>
                          <p className="mt-1 text-xs text-white/74">{isAddCard ? 'Scan or enter' : `•••• ${card.last4}`}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {plaidAccounts.length > 0 && (
                <div className="relative z-10 mt-3">
                  <div className="rounded-[22px] border border-emerald-300/16 bg-emerald-300/10 px-4 py-3" style={appleInfoFontStyle}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-medium tracking-[0.01em] text-emerald-100/70">Plaid Sandbox</p>
                        <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-white">{plaidAccounts.length} connected account{plaidAccounts.length === 1 ? '' : 's'}</p>
                      </div>
                      <button type="button" onClick={openScanner} className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-[#060816]">
                        Sync
                      </button>
                    </div>
                    <p className="mt-2 text-[13px] leading-5 text-white/70">
                      {walletAnalysisStatus === 'loading'
                        ? 'Refreshing benefit trackers and missed-value recommendations...'
                        : walletAnalysisStatus === 'error'
                          ? walletAnalysisError ?? 'Wallet analysis could not refresh.'
                          : plaidAccounts[0].institutionName + ' · ' + plaidAccounts[0].name + ' •••• ' + plaidAccounts[0].mask}
                    </p>
                  </div>
                </div>
              )}

                </>
              )}
            </section>
          )}


          {screen === 'category-guide' && (
            <section className="space-y-4" style={appleInfoFontStyle}>
              <div className="mb-1 flex items-center justify-between px-1">
                <button type="button" onClick={() => setScreen('wallet')} className="rounded-full bg-[#2c2c2e] px-3 py-1.5 text-sm font-medium text-white/88">Back</button>
                <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-white">Category Guide</h2>
                <div className="w-[56px]" />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {categoryChips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    onClick={() => setSelectedCategoryKey(chip.key)}
                    className={`shrink-0 rounded-full px-3 py-2 text-[12px] font-medium transition ${selectedCategoryKey === chip.key ? 'bg-white text-[#111317]' : 'border border-white/10 bg-white/5 text-white/74'}`}
                  >
                    <span className="mr-1.5">{chip.icon}</span>
                    {chip.label}
                  </button>
                ))}
              </div>

              <div className={`overflow-hidden rounded-[28px] bg-gradient-to-br ${recommendedCategoryCard.gradient} px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_20px_50px_rgba(0,0,0,0.28)]`}>
                <p className="text-[11px] uppercase tracking-[0.24em] text-white/62">{selectedCategoryGuide.headline}</p>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[27px] font-semibold tracking-[-0.03em] text-white">{selectedCategoryGuide.bestCardLabel}</p>
                    <p className="mt-1 text-sm text-white/76">{recommendedCategoryCard.issuer} · •••• {recommendedCategoryCard.last4}</p>
                  </div>
                  <div className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-sm font-semibold text-white">{selectedCategoryGuide.earnRate}</div>
                </div>
              </div>

              <div className="rounded-[26px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4 shadow-[0_10px_24px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
                <p className="text-[11px] font-medium tracking-[0.01em] text-white/58">Why it wins</p>
                <p className="mt-2 text-[19px] font-semibold tracking-[-0.03em] text-white">{selectedCategoryGuide.reason}</p>
                {selectedCategoryGuide.runnerUp && <p className="mt-3 text-sm leading-6 text-white/72">Runner-up: {selectedCategoryGuide.runnerUp}</p>}
              </div>

              <div className="rounded-[26px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4 shadow-[0_10px_24px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
                <p className="text-[11px] font-medium tracking-[0.01em] text-white/58">Top earn rates for this category</p>
                <div className="mt-3 space-y-2">
                  {cards
                    .filter((card) => card.multipliers.some((item) => item.category === selectedCategoryGuide.key))
                    .map((card) => {
                      const match = card.multipliers.find((item) => item.category === selectedCategoryGuide.key)!;
                      return (
                        <div key={`${card.id}-${match.id}`} className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-3">
                          <div>
                            <p className="text-sm font-medium text-white">{card.name}</p>
                            <p className="mt-0.5 text-[12px] text-white/64">{match.detail}</p>
                          </div>
                          <div className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-sm font-semibold text-white">{match.multiplier}</div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </section>
          )}

          {screen === 'concierge' && (
            <section className="space-y-4" style={appleInfoFontStyle}>
              <div className="mb-1 flex items-center justify-between px-1">
                <button type="button" onClick={() => setScreen('wallet')} className="rounded-full bg-[#2c2c2e] px-3 py-1.5 text-sm font-medium text-white/88">Back</button>
                <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-white">Concierge</h2>
                <div className="w-[56px]" />
              </div>

              <div className="rounded-[26px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4 shadow-[0_10px_24px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
                <p className="text-[11px] font-medium tracking-[0.01em] text-white/58">Available concierge access</p>
                <p className="mt-2 text-[20px] font-semibold tracking-[-0.03em] text-white">{conciergeEntries.length} access points across {conciergeCards.length} cards</p>
                <p className="mt-2 text-sm leading-6 text-white/72">Quick hub for phone numbers and chat paths tied to cards already in the wallet.</p>
              </div>

              <div className="space-y-3">
                {conciergeEntries.map((entry) => (
                  <div key={entry.id} className="overflow-hidden rounded-[28px] border border-white/12 bg-[rgba(118,118,128,0.24)] shadow-[0_10px_24px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
                    <div className={`h-2 w-full bg-gradient-to-r ${entry.gradient}`} />
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.22em] text-white/52">{entry.brand}</p>
                          <p className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-white">{entry.label}</p>
                          <p className="mt-1 text-sm text-white/66">via {entry.cardName}</p>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs text-white/84">{entry.channel}</div>
                      </div>
                      <div className="mt-4 rounded-2xl bg-white/5 px-3 py-3">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-white/50">Contact</p>
                        <p className="mt-1 text-base font-medium text-white">{entry.contact}</p>
                        <p className="mt-2 text-sm leading-6 text-white/72">{entry.detail}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {screen === 'profile' && user && (
            <ProfileHome
              user={user}
              connectedAccountsCount={plaidAccounts.length}
              onBack={() => setScreen('wallet')}
              onOpenNotifications={() => setScreen('notifications')}
              onOpenConnectedAccounts={() => setScreen('connected-accounts')}
              onSignOut={handleSignOut}
            />
          )}

          {screen === 'connected-accounts' && user && (
            <ConnectedAccountsScreen
              accounts={plaidAccounts}
              cardProducts={cardProducts}
              editingMatchAccountIds={editingMatchAccountIds}
              matchStatusByAccount={matchStatusByAccount}
              matchSuggestionByAccountId={matchSuggestionByAccountId}
              plaidError={plaidError}
              removingAccountIds={removingAccountIds}
              transactionSyncStatus={transactionSyncStatus}
              visibleCardIds={visibleCardIds}
              onAcceptSuggestedMatch={updateCardMatch}
              onAddAccount={openScanner}
              onBack={() => setScreen('profile')}
              onCancelEditMatch={(accountId) => setEditingMatchAccountIds((current) => current.filter((currentAccountId) => currentAccountId !== accountId))}
              onEditMatch={(accountId) => setEditingMatchAccountIds((current) => [...new Set([...current, accountId])])}
              onRemoveAccount={requestRemoveConnectedAccount}
              onSelectCard={(cardId) => {
                selectCard(cardId);
                setScreen('wallet');
              }}
              onSyncTransactions={syncPlaidTransactions}
              onUpdateCardMatch={updateCardMatch}
            />
          )}


          {screen === 'card-details' && (
            <section className="space-y-4" style={appleInfoFontStyle}>
              <div className="mb-3 flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setScreen('wallet')}
                  className="rounded-full bg-[#2c2c2e] px-3 py-1.5 text-sm font-medium text-white/88"
                >
                  Back
                </button>
                <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-white">Card Details</h2>
                <div className="w-[56px]" />
              </div>

              <div className="relative z-20 px-1 pt-1">
                <div className="relative mx-auto w-full max-w-[360px]">
                  <div
                    className={`relative aspect-[1.586/1] overflow-hidden rounded-[28px] bg-gradient-to-br ${selectedCard.gradient} px-5 pb-5 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_32px_70px_rgba(0,0,0,0.34)]`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%)]" />
                    <div className="absolute inset-x-4 top-3 h-px bg-white/15" />

                    <div className="relative flex h-full flex-col justify-between text-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.28em] text-white/72">{selectedCard.issuer}</p>
                          <h3 className="mt-2 text-[27px] font-semibold tracking-[-0.03em]">{selectedCard.name}</h3>
                        </div>
                        <div className="rounded-full border border-white/18 bg-black/15 px-3 py-1 text-xs text-white/80 backdrop-blur">•••• {selectedCard.last4}</div>
                      </div>

                      <div>
                        <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">Current balance</p>
                        <p className="mt-2 text-[28px] font-semibold tracking-[-0.03em]">{selectedCard.pointsValue}</p>
                        <div className="mt-1 flex items-center justify-between gap-3">
                          <p className="text-[12px] text-white/74">{selectedCard.pointsLabel}</p>
                          <div className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/84">
                            Active
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(118,118,128,0.24)] backdrop-blur-2xl">
                {[
                  ['Card nickname', selectedCard.name],
                  ['Issuer', selectedCard.issuer],
                  ['Rewards balance', selectedCard.pointsValue],
                ].map(([label, value], index, arr) => (
                  <div key={label}>
                    <button type="button" className="flex w-full items-center justify-between px-4 py-3.5 text-left">
                      <div>
                        <p className="text-[16px] tracking-[-0.01em] text-white">{label}</p>
                        <p className="mt-0.5 text-[13px] text-white/56">{value}</p>
                      </div>
                      <span className="text-[18px] text-white/38">›</span>
                    </button>
                    {index < arr.length - 1 && <div className="mx-4 h-px bg-white/10" />}
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(118,118,128,0.24)] backdrop-blur-2xl">
                {[
                  ['Payment details', 'Autopay, due date, and statement settings'],
                  ['Billing address', 'Update where statements and charges are tied'],
                  ['Spending limits', 'Manage alerts and controls for this card'],
                  ['Card benefits', 'Review credits, perks, and partner access'],
                ].map(([label, value], index, arr) => (
                  <div key={label}>
                    <button type="button" className="flex w-full items-center justify-between px-4 py-3.5 text-left">
                      <div>
                        <p className="text-[16px] tracking-[-0.01em] text-white">{label}</p>
                        <p className="mt-0.5 text-[13px] text-white/56">{value}</p>
                      </div>
                      <span className="text-[18px] text-white/38">›</span>
                    </button>
                    {index < arr.length - 1 && <div className="mx-4 h-px bg-white/10" />}
                  </div>
                ))}
              </div>

              <div className="overflow-hidden rounded-[24px] border border-white/10 bg-[rgba(118,118,128,0.24)] backdrop-blur-2xl">
                {[
                  ['Notifications', 'Due dates and benefit reminders'],
                  ['Security', 'Virtual card numbers and lock controls'],
                ].map(([label, value], index, arr) => (
                  <div key={label}>
                    <button
                      type="button"
                      onClick={() => {
                        if (label === 'Notifications') setScreen('notifications');
                      }}
                      className="flex w-full items-center justify-between px-4 py-3.5 text-left"
                    >
                      <div>
                        <p className="text-[16px] tracking-[-0.01em] text-white">{label}</p>
                        <p className="mt-0.5 text-[13px] text-white/56">{value}</p>
                      </div>
                      <span className="text-[18px] text-white/38">›</span>
                    </button>
                    {index < arr.length - 1 && <div className="mx-4 h-px bg-white/10" />}
                  </div>
                ))}
              </div>
            </section>
          )}

          {screen === 'notifications' && (
            <section className="space-y-3" style={appleInfoFontStyle}>
              <div className="mb-1 flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setScreen('wallet')}
                  className="rounded-full bg-[#2c2c2e] px-3 py-1.5 text-sm font-medium text-white/88"
                >
                  Back
                </button>
                <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-white">Notifications</h2>
                <div className="w-[56px]" />
              </div>

              <div className="overflow-hidden rounded-[26px] border border-white/12 bg-[rgba(118,118,128,0.24)] shadow-[0_10px_24px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-2xl">
                {[
                  ['Allow Notifications', 'allowNotifications'],
                  ['Notify Me When Payment Is Due', 'paymentDue'],
                  ['Benefit Expiring', 'benefitExpiring'],
                  ['Spend Milestones', 'spendMilestones'],
                ].map(([label, key], index, arr) => (
                  <div key={key}>
                    <div className="flex items-center justify-between px-4 py-3.5">
                      <p className="text-[16px] tracking-[-0.01em] text-white">{label}</p>
                      <button
                        type="button"
                        aria-pressed={notificationSettings[key as keyof typeof notificationSettings]}
                        onClick={() =>
                          setNotificationSettings((prev) => ({
                            ...prev,
                            [key]: !prev[key as keyof typeof prev],
                          }))
                        }
                        className={`relative h-8 w-13 rounded-full p-1 transition ${notificationSettings[key as keyof typeof notificationSettings] ? 'bg-[#34c759]' : 'bg-white/15'}`}
                      >
                        <span
                          className={`block h-6 w-6 rounded-full bg-white shadow transition ${notificationSettings[key as keyof typeof notificationSettings] ? 'translate-x-5' : 'translate-x-0'}`}
                        />
                      </button>
                    </div>
                    {index < arr.length - 1 && <div className="mx-4 h-px bg-white/12" />}
                  </div>
                ))}
              </div>
            </section>
          )}

          {screen === 'opportunities' && (
            <section className="space-y-3" style={appleInfoFontStyle}>
              <div className="mb-1 flex items-center justify-between px-1">
                <button
                  type="button"
                  onClick={() => setScreen('wallet')}
                  className="rounded-full bg-[#2c2c2e] px-3 py-1.5 text-sm font-medium text-white/88"
                >
                  Back
                </button>
                <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-white">Expiring Value</h2>
                <div className="w-[56px]" />
              </div>

              {expiringValueRecommendations.length > 0 && (
                <div className="grid gap-2">
                  {expiringValueRecommendations.map((item) => (
                    <div key={item.id} className="rounded-[24px] border border-white/12 bg-[#0d1224]/90 p-3.5 backdrop-blur-xl">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-white/45">
                            {readableRewardCategory(item.category)} · {item.date}
                          </p>
                          <h3 className="mt-1 truncate text-[18px] font-semibold tracking-[-0.03em] text-white">{item.merchant}</h3>
                        </div>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#080a0f]">
                          {item.estimatedLift}
                        </span>
                      </div>
                      <p className="mt-2 text-[13px] leading-5 text-white/72">
                        Use <span className="font-semibold text-white">{item.bestCard}</span> instead of {item.currentCard}.
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {expiringValueRecommendations.length === 0 && plaidTransactions.length > 0 && (
                <div className="rounded-[28px] border border-white/12 bg-[#0d1224]/90 p-4 text-sm leading-6 text-white/70 backdrop-blur-xl">
                  No missed-value transactions right now.
                </div>
              )}

              {expiringValueAlerts.length === 0 && expiringValueRecommendations.length === 0 && (
                <div className="rounded-[28px] border border-white/12 bg-[#0d1224]/90 p-4 text-sm leading-6 text-white/70 backdrop-blur-xl">
                  No expiring-value alerts yet.
                </div>
              )}

              {expiringValueAlerts.length > 0 && (
                <div className="grid gap-2">
                  {expiringValueAlerts.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-[24px] border p-3.5 ${severityTone(item.severity)}`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="min-w-0 truncate text-[15px] font-semibold text-white">{item.title}</p>
                        <span className="shrink-0 text-[11px] uppercase tracking-[0.16em] text-white/45">{item.severity}</span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-white/62">{item.detail}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {screen === 'use-now' && (
            <UseNowScreen
              merchantQuery={merchantQuery}
              merchantRecommendationError={merchantRecommendationError}
              merchantRecommendationStatus={merchantRecommendationStatus}
              featuredMerchant={featuredMerchant}
              merchantResults={merchantResults}
              purchaseCategory={purchaseCategory}
              recommendations={recommendations}
              filteredRecommendations={filteredRecommendations}
              selectedRecommendation={selectedRecommendation}
              selectedRecommendationId={selectedRecommendationId}
              onBack={() => setScreen('wallet')}
              onMerchantQueryChange={setMerchantQuery}
              onOpenDemoMerchant={openUseNowDemo}
              onPurchaseCategoryChange={setPurchaseCategory}
              onSelectedRecommendationChange={setSelectedRecommendationId}
            />
          )}
        </div>

        {showScanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/78 p-4 backdrop-blur-md">
            <motion.div layout className="max-h-[78vh] w-full max-w-sm overflow-y-auto rounded-[30px] bg-black p-4 shadow-[0_40px_90px_rgba(0,0,0,0.55)]">
              <div className="mt-1 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">Add a card</p>
                  <h2 className="mt-2 text-[27px] font-semibold tracking-[-0.03em] text-white">
                    {scanStep === 'camera' && 'Scan your card'}
                    {scanStep === 'manual' && 'Enter card details'}
                    {scanStep === 'plaid' && 'Connect with Plaid'}
                    {scanStep === 'match' && 'Match your card'}
                    {scanStep === 'success' && 'Card added'}
                  </h2>
                </div>
                {scanStep !== 'success' && (
                  <button type="button" onClick={closeAddCardSheet} className="shrink-0 rounded-full border border-white/15 bg-black/15 px-3 py-1 text-xs text-white/80 backdrop-blur">
                    Close
                  </button>
                )}
              </div>

              {scanStep !== 'success' && scanStep !== 'match' && (
                <div className={`mt-5 grid gap-3 ${isUserBackedWallet ? 'grid-cols-2' : 'grid-cols-3'}`}>
                  <button
                    type="button"
                    onClick={() => setScanStep('plaid')}
                    className={`relative overflow-hidden rounded-[24px] px-3 pb-3 pt-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_30px_rgba(0,0,0,0.22)] ${scanStep === 'plaid' ? 'ring-2 ring-white/25' : ''}`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%),linear-gradient(135deg,#305a52_0%,#14272f_58%,#05080c_100%)]" />
                    <div className="relative text-white">
                      <p className="text-[9px] uppercase tracking-[0.18em] text-white/70">Plaid</p>
                      <p className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">Connect</p>
                      <p className="mt-1 text-[11px] text-white/74">Sandbox</p>
                    </div>
                  </button>
                  {!isUserBackedWallet && (
                      <button
                        type="button"
                        onClick={() => setScanStep('camera')}
                        className={`relative overflow-hidden rounded-[24px] px-3 pb-3 pt-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_30px_rgba(0,0,0,0.22)] ${scanStep === 'camera' ? 'ring-2 ring-white/25' : ''}`}
                      >
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%),linear-gradient(135deg,#4d5563_0%,#1f2631_58%,#05070c_100%)]" />
                        <div className="relative text-white">
                          <p className="text-[9px] uppercase tracking-[0.18em] text-white/70">Camera</p>
                          <p className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">Scan</p>
                          <p className="mt-1 text-[11px] text-white/74">Mock</p>
                        </div>
                      </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setScanStep('manual')}
                    className={`relative overflow-hidden rounded-[24px] px-3 pb-3 pt-3 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_30px_rgba(0,0,0,0.22)] ${scanStep === 'manual' ? 'ring-2 ring-white/25' : ''}`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%),linear-gradient(135deg,#535862_0%,#20252d_58%,#090b10_100%)]" />
                    <div className="relative text-white">
                      <p className="text-[9px] uppercase tracking-[0.18em] text-white/70">Manual</p>
                      <p className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">Enter</p>
                      <p className="mt-1 text-[11px] text-white/74">{isUserBackedWallet ? 'Saved' : 'Mock'}</p>
                    </div>
                  </button>
                </div>
              )}

              {scanStep !== 'success' && scanStep !== 'match' && !isUserBackedWallet && (
                <div className="mt-4 rounded-[26px] border border-white/12 bg-[rgba(118,118,128,0.20)] p-2" style={appleInfoFontStyle}>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Personal', value: false },
                      { label: 'Business', value: true },
                    ].map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => setDraftBusiness(option.value)}
                        className={`rounded-[20px] px-3 py-3 text-sm font-medium transition ${draftCard.isBusiness === option.value ? 'bg-white text-[#060816]' : 'bg-white/[0.06] text-white/70'}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="px-2 pb-1 pt-2 text-[12px] leading-5 text-white/54">
                    Business cards stay separate in the wallet model without adding Schedule C screens yet.
                  </p>
                </div>
              )}

              {scanStep === 'plaid' && (
                <div className="mt-5 rounded-[30px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4" style={appleInfoFontStyle}>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Sandbox connection</p>
                  <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-white">Link a test issuer</h3>
                  <p className="mt-2 text-sm leading-6 text-white/72">
                    Plaid will only import credit card accounts. Checking, savings, loan, and investment accounts are skipped before they reach this profile.
                  </p>

                  {plaidAccounts.length > 0 && (
                    <div className="mt-4 divide-y divide-white/10 rounded-[24px] border border-white/10 bg-white/5">
                      {plaidAccounts.slice(0, 3).map((account) => (
                        <div key={account.accountId} className="px-4 py-3">
                          <p className="text-[15px] font-medium tracking-[-0.01em] text-white">{account.name}</p>
                          <p className="mt-1 text-[13px] text-white/62">{account.institutionName} · {account.subtype} •••• {account.mask}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {plaidError && (
                    <div className="mt-4 rounded-2xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm leading-5 text-rose-50/90">
                      {plaidError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void connectPlaidSandbox(loadPlaidLinkScript)}
                    disabled={plaidStatus === 'loading'}
                    className="mt-4 w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-[#060816] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {plaidStatus === 'loading' ? 'Opening Plaid...' : plaidStatus === 'connected' ? 'Reconnect sandbox account' : 'Connect sandbox account'}
                  </button>
                </div>
              )}

              {scanStep === 'match' && (
                <div className="mt-5 space-y-4" style={appleInfoFontStyle}>
                  <div className="rounded-[30px] border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-emerald-100/68">Plaid connected</p>
                    <h3 className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-white">Choose the card product</h3>
                    <p className="mt-2 text-sm leading-6 text-white/72">
                      This saves the mapping to Supabase so the wallet, benefits, and transaction recommendations use the right card rules for this user.
                    </p>
                  </div>

                  {pendingLinkedAccounts.length > 0 ? (
                    <div className="space-y-3">
                      {pendingLinkedAccounts.map((account) => {
                        const saveState = matchStatusByAccount[account.accountId] ?? 'idle';
                        const matchSuggestion = matchSuggestionByAccountId.get(account.accountId) ?? null;

                        return (
                          <PendingPlaidMatchCard
                            key={account.accountId}
                            account={account}
                            cardProducts={cardProducts}
                            matchSuggestion={matchSuggestion}
                            saveState={saveState}
                            onUpdateCardMatch={updateCardMatch}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-[28px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4">
                      <p className="text-[16px] font-semibold text-white">No credit cards imported</p>
                      <p className="mt-2 text-sm leading-6 text-white/64">This Plaid connection did not return a credit card account. Connect a credit card account to add it to this wallet.</p>
                    </div>
                  )}

                  {plaidError && (
                    <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm leading-5 text-rose-50/90">
                      {plaidError}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setPendingLinkedAccounts([]);
                        closeAddCardSheet();
                        setScreen('connected-accounts');
                      }}
                      className="rounded-full bg-white/10 px-4 py-3 text-sm font-medium text-white/82 transition hover:bg-white/14"
                    >
                      Review all
                    </button>
                    <button
                      type="button"
                      onClick={finishLinkedCardSetup}
                      className="rounded-full bg-white px-4 py-3 text-sm font-medium text-[#060816] transition hover:opacity-95"
                    >
                      Finish
                    </button>
                  </div>
                </div>
              )}

              {scanStep === 'camera' && (
                <div className="mt-5 rounded-[30px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4" style={appleInfoFontStyle}>
                  <div className="aspect-[0.68] rounded-[26px] border border-white/12 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_30%),linear-gradient(180deg,#1c2230_0%,#070a0f_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Camera view</p>
                    <div className="mt-6 rounded-[24px] border-2 border-white/24 p-5 text-center text-sm leading-6 text-white/72">
                      Frame the front of your card here. We’ll detect issuer, last four, and likely product name.
                    </div>
                    <div className="mt-6 rounded-2xl bg-white/10 px-3 py-2 text-sm text-white/78">Detected: premium Amex profile + card ending in 9999</div>
                  </div>
                  <button onClick={finishDemoAdd} className="mt-4 w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-[#060816] transition hover:opacity-95">Use detection</button>
                </div>
              )}

              {scanStep === 'manual' && (
                <div className="mt-5 space-y-3" style={appleInfoFontStyle}>
                  {isUserBackedWallet ? (
                    <div className="rounded-[28px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4">
                      <label className="text-[10px] uppercase tracking-[0.24em] text-white/60" htmlFor="manual-card-product">
                        Card product
                      </label>
                      <select
                        id="manual-card-product"
                        value={effectiveManualCardProductId}
                        disabled={cardProducts.length === 0 || manualCardStatus === 'saving'}
                        onChange={(event) => setManualCardProductId(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-white/12 bg-[#11151f] px-4 py-3 text-white outline-none transition focus:border-white/20 disabled:opacity-60"
                      >
                        <option value="" disabled>
                          {cardProducts.length === 0 ? 'Card catalog still loading' : 'Select a card product'}
                        </option>
                        {cardProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.issuer} · {product.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <>
                      <div className="rounded-[28px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4">
                        <label className="text-[10px] uppercase tracking-[0.24em] text-white/60">Issuer</label>
                        <input value={draftCard.issuer} onChange={(e) => setDraftIssuer(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/20" />
                      </div>
                      <div className="rounded-[28px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4">
                        <label className="text-[10px] uppercase tracking-[0.24em] text-white/60">Product name</label>
                        <input value={draftCard.name} onChange={(e) => setDraftName(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/20" />
                      </div>
                    </>
                  )}
                  <div className="rounded-[28px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4">
                    <label className="text-[10px] uppercase tracking-[0.24em] text-white/60">Last four</label>
                    <input value={draftCard.last4} inputMode="numeric" maxLength={4} onChange={(e) => setDraftLast4(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-white/20" />
                  </div>
                  <div className="rounded-[28px] border border-white/12 bg-[rgba(118,118,128,0.24)] p-4">
                    <p className="text-[10px] uppercase tracking-[0.24em] text-white/60">Preview</p>
                    <div className={`mt-3 overflow-hidden rounded-[24px] bg-gradient-to-br ${selectedCard.gradient} p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]`}>
                      <div className="flex items-start justify-between gap-3 text-white">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.24em] text-white/66">
                            {isUserBackedWallet && selectedManualCardProduct ? selectedManualCardProduct.issuer : draftCard.issuer}
                          </p>
                          <p className="mt-5 text-[20px] font-semibold tracking-[-0.02em]">
                            {isUserBackedWallet && selectedManualCardProduct ? selectedManualCardProduct.name : draftCard.name}
                          </p>
                        </div>
                        <p className="text-xs text-white/72">•••• {draftCard.last4 || '0000'}</p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl bg-white/[0.06] px-3 py-2">
                        <p className="text-[11px] text-white/42">Where it saves</p>
                        <p className="mt-1 text-[13px] font-semibold text-white">{isUserBackedWallet ? 'Profile wallet' : 'Demo wallet'}</p>
                      </div>
                      <div className="rounded-2xl bg-white/[0.06] px-3 py-2">
                        <p className="text-[11px] text-white/42">Used by</p>
                        <p className="mt-1 text-[13px] font-semibold text-white">Analysis + Use Now</p>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/70">
                      {isUserBackedWallet
                        ? 'This creates a manual account match so recommendations can use the card immediately, even before Plaid history exists.'
                        : 'This adds the card to the prototype stack for a fast demo.'}
                    </p>
                  </div>
                  {manualCardStatus === 'saved' && (
                    <div className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 px-3 py-2 text-sm leading-5 text-emerald-50/90">
                      Card saved. Wallet analysis is refreshing and the card is ready for Use Now recommendations.
                    </div>
                  )}
                  {manualCardStatus === 'error' && plaidError && (
                    <div className="rounded-2xl border border-rose-300/20 bg-rose-400/10 px-3 py-2 text-sm leading-5 text-rose-50/90">
                      {plaidError}
                    </div>
                  )}
                  <button
                    onClick={finishDemoAdd}
                    disabled={manualCardStatus === 'saving' || (isUserBackedWallet && (!effectiveManualCardProductId || cardProducts.length === 0 || draftCard.last4.length !== 4))}
                    className="w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-[#060816] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {manualCardStatus === 'saving' ? 'Saving card...' : 'Add card'}
                  </button>
                </div>
              )}

              {scanStep === 'success' && (
                <div className="mt-8 rounded-[28px] border border-emerald-400/20 bg-emerald-400/10 p-6 text-center transition-all duration-300">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-300/20 text-2xl text-white">✓</div>
                  <p className="mt-4 text-xl font-semibold text-white">{plaidStatus === 'connected' ? 'Plaid connected' : `${draftCard.name} added`}</p>
                  <p className="mt-2 text-sm text-white/70">Ready for wallet analysis and Use Now recommendations.</p>
                </div>
              )}
            </motion.div>
          </div>
	        )}

	        {accountPendingRemoval && (
	          <div className="absolute inset-0 z-40 flex items-end bg-black/48 px-4 pb-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="remove-connected-account-title">
	            <div className="w-full rounded-[30px] border border-white/12 bg-[#151922] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.42)]" style={appleInfoFontStyle}>
	              <p id="remove-connected-account-title" className="text-[17px] font-semibold tracking-[-0.02em] text-white">
	                Remove {accountPendingRemoval.cardProductName ?? accountPendingRemoval.name}?
	              </p>
	              <p className="mt-2 text-sm leading-6 text-white/68">
	                This removes the connected account and its card match from this wallet. You can add it again later from Connected Accounts.
	              </p>
	              <div className="mt-4 grid grid-cols-2 gap-2">
	                <button
	                  type="button"
	                  onClick={() => setAccountPendingRemoval(null)}
	                  className="rounded-full bg-white/10 px-4 py-3 text-sm font-medium text-white/82"
	                >
	                  Cancel
	                </button>
	                <button
	                  type="button"
	                  disabled={removingAccountIds.includes(accountPendingRemoval.accountId)}
	                  onClick={() => void removeConnectedAccount(accountPendingRemoval)}
	                  className="rounded-full bg-rose-300 px-4 py-3 text-sm font-semibold text-[#2d0508] disabled:cursor-not-allowed disabled:opacity-60"
	                >
	                  {removingAccountIds.includes(accountPendingRemoval.accountId) ? 'Removing' : 'Remove'}
	                </button>
	              </div>
	            </div>
	          </div>
	        )}

	        <AuthEntrySheet
	          isOpen={authFlow === 'entry'}
          isLoading={authStatus === 'loading'}
          onClose={() => setAuthFlow('closed')}
          onContinueWithApple={signInWithApple}
          onContinueWithGoogle={signInWithGoogle}
          onContinueWithEmail={() => setAuthFlow('email')}
        />

        <EmailAuthFlow
          isOpen={authFlow === 'email' || authFlow === 'verify'}
          mode={authFlow === 'verify' ? 'verify' : 'email'}
          email={emailDraft}
          isLoading={authStatus === 'loading'}
          onEmailChange={setEmailDraft}
          onBack={() => setAuthFlow(authFlow === 'verify' ? 'email' : 'entry')}
          onClose={() => setAuthFlow('closed')}
          onSubmitEmail={() => signInWithEmail(emailDraft)}
          onConfirmVerification={confirmEmail}
        />

        <ProfileSetupFlow
          key={user?.id ?? 'anonymous-setup'}
          isOpen={authFlow === 'setup'}
          user={user}
          isLoading={authStatus === 'loading'}
          onSubmit={completeProfileSetup}
        />
      </div>
    </MotionConfig>
  );
}
