'use client';

import { MotionConfig, motion } from 'framer-motion';
import { useMemo, useState } from 'react';

const pageMeta = {
  benefits: { title: 'Benefits', icon: '✦' },
  progress: { title: 'Progress', icon: '◌' },
  rewards: { title: 'Rewards', icon: '◎' },
} as const;

type Benefit = {
  id: string;
  title: string;
  status: 'available' | 'in-progress' | 'used' | 'expiring';
  detail: string;
  progress?: number;
};

type Transaction = {
  id: string;
  merchant: string;
  amount: string;
  date: string;
  category: string;
};

type NotificationItem = {
  id: string;
  title: string;
  detail: string;
  action: string;
  severity: 'info' | 'warning' | 'urgent';
};

type RecommendationItem = {
  id: string;
  category: string;
  merchant: string;
  card: string;
  why: string;
  runnerUp?: string;
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
  rewardReset: string;
  annualFeeMonth: string;
  monthlyCreditsUsed: number;
  monthlyCreditsTotal: number;
  nextResetLabel: string;
  transactions: Transaction[];
};

type ScanStep = 'camera' | 'manual' | 'success';
type Screen = 'wallet' | 'opportunities' | 'use-now';
type PurchaseCategory = 'Dining' | 'Travel' | 'General spend';
type WalletPage = 'benefits' | 'progress' | 'rewards';

const walletPages: WalletPage[] = ['benefits', 'progress', 'rewards'];

const appleInfoFontStyle = {
  fontFamily: '"SF Pro Text", "SF Pro Display", "SF Pro Icons", -apple-system, BlinkMacSystemFont, "Helvetica Neue", Helvetica, Arial, sans-serif',
} as const;

const seedCards: Card[] = [
  {
    id: 'amex-gold',
    issuer: 'American Express',
    name: 'Gold Card',
    last4: '2219',
    gradient: 'from-[#f3d59f] via-[#cb9d62] to-[#704624]',
    accent: '#2b1908',
    pointsLabel: 'Membership Rewards',
    pointsValue: '128,440 pts',
    recommendation: 'Use for dining tonight to pair 4x points with your unused monthly dining credit.',
    spendSummary: '$642 left to unlock your next dining milestone this month.',
    categories: ['Dining', 'Groceries', 'Resy'],
    alerts: ['Unused $10 dining credit expires in 26 days', 'Welcome bonus is 89% complete'],
    rewardReset: 'Monthly dining credit resets June 1',
    annualFeeMonth: 'January',
    monthlyCreditsUsed: 0,
    monthlyCreditsTotal: 1,
    nextResetLabel: 'Resets in 26 days',
    transactions: [
      { id: 'g1', merchant: 'Great White', amount: '$84.20', date: 'Today', category: 'Dining' },
      { id: 'g2', merchant: 'Erewhon', amount: '$46.18', date: 'Yesterday', category: 'Groceries' },
      { id: 'g3', merchant: 'Resy @ Horses', amount: '$132.50', date: 'May 2', category: 'Dining' },
    ],
    benefits: [
      { id: 'gold-dining', title: '$10 Dining Credit', status: 'available', detail: 'Unused for May · expires in 26 days', progress: 0 },
      { id: 'gold-resy', title: 'Resy credit', status: 'in-progress', detail: '$28 of $50 used this half-year', progress: 56 },
      { id: 'gold-welcome', title: 'Welcome bonus tracker', status: 'in-progress', detail: '$5,358 of $6,000 spent · 19 days left', progress: 89 },
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
    alerts: ['Private aviation credit still unused', 'Concierge dining access available tonight'],
    rewardReset: 'Select annual credits refresh with membership year',
    annualFeeMonth: 'March',
    monthlyCreditsUsed: 1,
    monthlyCreditsTotal: 2,
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
    alerts: ['Saks credit is half-used', 'Airline incidental credit almost exhausted'],
    rewardReset: 'Saks and airline credits have different reset calendars',
    annualFeeMonth: 'September',
    monthlyCreditsUsed: 1,
    monthlyCreditsTotal: 2,
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
    alerts: ['Travel credit still partially available', 'DoorDash benefit renews next month'],
    rewardReset: 'Travel credit refreshes each cardmember year.',
    annualFeeMonth: 'July',
    monthlyCreditsUsed: 1,
    monthlyCreditsTotal: 3,
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
    alerts: ['Travel credit nearly finished', 'Anniversary miles post next month'],
    rewardReset: 'Travel credit renews each account anniversary year.',
    annualFeeMonth: 'August',
    monthlyCreditsUsed: 2,
    monthlyCreditsTotal: 3,
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
    alerts: ['Hotel benefit still untouched this year', 'Bonus category spend is trending up'],
    rewardReset: 'Hotel savings benefit refreshes annually.',
    annualFeeMonth: 'November',
    monthlyCreditsUsed: 0,
    monthlyCreditsTotal: 2,
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

export default function WalletPrototype() {
  const [cards, setCards] = useState(seedCards);
  const [notifications] = useState(seedNotifications);
  const [recommendations] = useState(seedRecommendations);
  const [selectedId, setSelectedId] = useState(seedCards[0].id);
  const [showScanner, setShowScanner] = useState(false);
  const [scanStep, setScanStep] = useState<ScanStep>('camera');
  const [screen, setScreen] = useState<Screen>('wallet');
  const [selectedNotificationId, setSelectedNotificationId] = useState<string | null>(notifications[0].id);
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string | null>(recommendations[0].id);
  const [draftCard, setDraftCard] = useState({ issuer: 'American Express', name: 'Black Card', last4: '9999' });
  const [purchaseCategory, setPurchaseCategory] = useState<PurchaseCategory>('Dining');
  const [walletPageIndex, setWalletPageIndex] = useState(0);
  const [walletSelectionExpanded, setWalletSelectionExpanded] = useState(false);

  const selectedCard = useMemo(() => cards.find((card) => card.id === selectedId) ?? cards[0], [cards, selectedId]);
  const selectedNotification = useMemo(
    () => notifications.find((n) => n.id === selectedNotificationId) ?? notifications[0],
    [notifications, selectedNotificationId],
  );
  const filteredRecommendations = useMemo(
    () => recommendations.filter((r) => r.category === purchaseCategory),
    [recommendations, purchaseCategory],
  );
  const selectedRecommendation = useMemo(
    () => filteredRecommendations.find((r) => r.id === selectedRecommendationId) ?? filteredRecommendations[0],
    [filteredRecommendations, selectedRecommendationId],
  );
  const walletStackItems = useMemo(
    () => [...cards.filter((card) => card.id !== selectedId), { id: 'add-card', issuer: 'Wallet', name: 'Add Card', last4: 'New' as const }],
    [cards, selectedId],
  );

  function openScanner() {
    setWalletSelectionExpanded(false);
    setShowScanner(true);
    setScanStep('camera');
  }

  function selectCard(cardId: string) {
    setSelectedId(cardId);
    setWalletPageIndex(0);
    setWalletSelectionExpanded(false);
  }

  function shiftWalletPage(direction: 1 | -1) {
    setWalletPageIndex((current) => {
      const next = current + direction;
      if (next < 0 || next >= walletPages.length) return current;
      return next;
    });
  }

  function finishDemoAdd() {
    const newCard: Card = {
      id: `custom-${Date.now()}`,
      issuer: draftCard.issuer,
      name: draftCard.name,
      last4: draftCard.last4,
      gradient: 'from-[#364054] via-[#18202d] to-[#070a0f]',
      accent: '#f4f5f7',
      pointsLabel: 'Rewards',
      pointsValue: '18,240 pts',
      recommendation: 'Newly added card — set your perks and value rules next.',
      spendSummary: 'No spend tracking configured yet.',
      categories: ['Custom'],
      alerts: ['New card added to the wallet prototype'],
      rewardReset: 'Set custom reset timing',
      annualFeeMonth: 'Not set',
      monthlyCreditsUsed: 0,
      monthlyCreditsTotal: 1,
      nextResetLabel: 'Configure after setup',
      transactions: [{ id: 'c1', merchant: 'Awaiting connection', amount: '--', date: 'Now', category: 'Setup' }],
      benefits: [{ id: 'custom-benefit', title: 'Starter perk slot', status: 'available', detail: 'Add real benefits in a later build', progress: 0 }],
    };
    setCards((prev) => [...prev, newCard]);
    setSelectedId(newCard.id);
    setWalletPageIndex(0);
    setScanStep('success');
    window.setTimeout(() => {
      setShowScanner(false);
      setScreen('wallet');
    }, 900);
  }

  return (
    <MotionConfig transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.9 }}>
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-8 pt-6">
          {screen === 'wallet' && (
            <section className="flex min-h-[calc(100vh-120px)] flex-col gap-0">
              <div className="mb-3 flex items-center justify-between px-2">
                <button
                  type="button"
                  aria-label="Wallet options"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-[#1c1c1e] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                >
                  <svg width="19" height="19" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <circle cx="5" cy="10" r="1.6" fill="currentColor" />
                    <circle cx="10" cy="10" r="1.6" fill="currentColor" />
                    <circle cx="15" cy="10" r="1.6" fill="currentColor" />
                  </svg>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Share or send"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-[#1c1c1e] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M10 4.25v8.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M6.75 7.5 10 4.25 13.25 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5.5 10.75v3a1.75 1.75 0 0 0 1.75 1.75h5.5a1.75 1.75 0 0 0 1.75-1.75v-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    aria-label="Add pass"
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-[#1c1c1e] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  >
                    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M10 4.25v11.5M4.25 10h11.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="relative z-20 px-1 pt-1">
                <motion.div
                  layout
                  className="relative mx-auto w-full max-w-[360px]"
                >
                  <motion.div
                    layout
                    className={`relative aspect-[1.586/1] overflow-hidden rounded-[28px] bg-gradient-to-br ${selectedCard.gradient} px-5 pb-5 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_32px_70px_rgba(0,0,0,0.34)]`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_28%)]" />
                    <div className="absolute inset-x-4 top-3 h-px bg-white/15" />

                    <div className="relative flex h-full flex-col justify-between text-white">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.28em] text-white/72">{selectedCard.issuer}</p>
                          <h2 className="mt-2 text-[27px] font-semibold tracking-[-0.03em]">{selectedCard.name}</h2>
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
                  </motion.div>
                </motion.div>
              </div>

              <div className="relative z-10 -mt-8 px-2 pt-12">
                <div
                  className="rounded-[18px] border border-white/10 bg-[rgba(118,118,128,0.24)] px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  style={appleInfoFontStyle}
                >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-white/92">
                        <span className="text-sm text-white/70">{pageMeta[walletPages[walletPageIndex]].icon}</span>
                        <p className="text-[13px] font-medium tracking-[-0.01em] capitalize">{pageMeta[walletPages[walletPageIndex]].title}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {walletPages.map((page, index) => (
                          <button
                            key={page}
                            type="button"
                            onClick={() => setWalletPageIndex(index)}
                            className={`rounded-full transition ${walletPageIndex === index ? 'h-2.5 w-7 bg-white' : 'h-2.5 w-2.5 bg-white/35'}`}
                            aria-label={page}
                          />
                        ))}
                      </div>
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
                    className="mt-3 cursor-grab active:cursor-grabbing"
                  >
                    <div
                      className="min-h-[252px] rounded-[26px] border border-white/10 bg-[rgba(118,118,128,0.24)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                      style={appleInfoFontStyle}
                    >
                      {walletPages[walletPageIndex] === 'benefits' && (
                        <div>
                          <div className="mb-1 flex items-center justify-between px-1 pb-3">
                            <p className="text-[11px] font-medium tracking-[0.01em] text-white/58">Available now</p>
                            <p className="text-xs text-white/70">{selectedCard.benefits.length} benefits</p>
                          </div>
                          <div className="divide-y divide-white/10">
                            {selectedCard.benefits.map((benefit) => (
                              <motion.div layout key={benefit.id} className="px-1 py-4 first:pt-0 last:pb-1">
                                <div>
                                  <p className="text-[16px] font-semibold tracking-[-0.02em] text-white">{benefit.title}</p>
                                  <p className="mt-1 text-[13px] leading-[1.35rem] text-white/72">{benefit.detail}</p>
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
                    </div>
                  </motion.div>
              </div>

              <div className="relative z-10 mt-3 px-2 pb-2 pt-0">
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
            </section>
          )}

          {screen === 'opportunities' && (
            <section className="space-y-3">
              <div className="rounded-[30px] border border-white/12 bg-[#0d1224]/90 p-4 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Notifications</p>
                <h2 className="mt-2 text-2xl font-semibold">Expiring perks and missed value</h2>
                <p className="mt-2 text-sm leading-6 text-white/74">This becomes the app’s habit-forming surface: what is expiring, what is unused, and what should happen next.</p>
              </div>

              <div className="grid gap-3">
                {notifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedNotificationId(item.id)}
                    className={`rounded-[28px] border p-4 text-left transition duration-200 ${severityTone(item.severity)} ${selectedNotificationId === item.id ? 'ring-2 ring-white/20 shadow-lg' : 'hover:bg-white/10'}`}
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-white/50">{item.severity}</p>
                    <p className="mt-2 text-base font-medium text-white">{item.title}</p>
                  </button>
                ))}
              </div>

              <div className="rounded-[30px] border border-white/12 bg-[#0d1224]/90 p-4 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Notification detail</p>
                <h3 className="mt-2 text-xl font-semibold text-white">{selectedNotification.title}</h3>
                <p className="mt-3 text-sm leading-6 text-white/72">{selectedNotification.detail}</p>
                <div className="mt-4 rounded-2xl bg-[#8d949f]/24 p-4 text-sm text-white/90">
                  <span className="font-medium">Recommended action:</span> {selectedNotification.action}
                </div>
              </div>
            </section>
          )}

          {screen === 'use-now' && (
            <section className="space-y-3">
              <div className="rounded-[30px] border border-white/12 bg-[#0d1224]/90 p-4 backdrop-blur-xl">
                <p className="text-xs uppercase tracking-[0.22em] text-white/50">Best card assistant</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">What should I use right now?</h2>
                <p className="mt-2 text-sm leading-6 text-white/74">This is the decision engine layer: category, merchant context, and remaining benefit value.</p>
                <div className="mt-4 flex gap-2">
                  {(['Dining', 'Travel', 'General spend'] as const).map((category) => (
                    <button
                      key={category}
                      onClick={() => {
                        setPurchaseCategory(category);
                        const first = recommendations.find((r) => r.category === category);
                        setSelectedRecommendationId(first?.id ?? null);
                      }}
                      className={`rounded-full px-3 py-2 text-xs transition ${purchaseCategory === category ? 'bg-white text-[#111317]' : 'border border-white/12 bg-[#8d949f]/20 text-white/70'}`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3">
                {filteredRecommendations.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedRecommendationId(item.id)}
                    className={`rounded-[28px] border border-white/12 bg-[#0d1224]/90 p-4 text-left backdrop-blur-xl transition ${selectedRecommendationId === item.id ? 'ring-2 ring-white/20 shadow-lg' : 'hover:bg-[#8d949f]/28'}`}
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-white/50">{item.category}</p>
                    <p className="mt-2 text-base font-medium text-white">{item.merchant}</p>
                    <p className="mt-1 text-sm text-white/74">Use {item.card}</p>
                  </button>
                ))}
              </div>

              {selectedRecommendation && (
                <div className="rounded-[30px] border border-white/12 bg-[#0d1224]/90 p-4 backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.22em] text-white/50">Recommendation detail</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">Use {selectedRecommendation.card}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/72">{selectedRecommendation.why}</p>
                  {selectedRecommendation.runnerUp && (
                    <div className="mt-4 rounded-2xl bg-[#8d949f]/24 p-4 text-sm leading-6 text-white/80">
                      <span className="font-medium">Runner-up:</span> {selectedRecommendation.runnerUp}
                    </div>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        {showScanner && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/72 p-4 backdrop-blur-md">
            <motion.div layout className="max-h-[78vh] w-full max-w-sm overflow-y-auto rounded-[30px] border border-white/12 bg-[#09101e]/95 p-4 shadow-[0_40px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
              <div className="mt-1 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/50">Add a card</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {scanStep === 'camera' && 'Scan your card'}
                    {scanStep === 'manual' && 'Enter card details'}
                    {scanStep === 'success' && 'Card added'}
                  </h2>
                </div>
                {scanStep !== 'success' && (
                  <button type="button" onClick={() => setShowScanner(false)} className="shrink-0 rounded-full border border-white/12 bg-white/5 px-3 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white">
                    Close
                  </button>
                )}
              </div>

              {scanStep !== 'success' && (
                <div className="mt-5 flex gap-2 rounded-full bg-[#8d949f]/24 p-1 text-xs">
                  {(['camera', 'manual'] as const).map((step) => (
                    <button
                      key={step}
                      type="button"
                      onClick={() => setScanStep(step)}
                      className={`flex-1 rounded-full px-3 py-2 text-center capitalize transition ${scanStep === step ? 'bg-white text-[#111317]' : 'text-white/50'}`}
                    >
                      {step}
                    </button>
                  ))}
                </div>
              )}

              {scanStep === 'camera' && (
                <div className="mt-5 rounded-[30px] border border-dashed border-white/15 bg-[#8d949f]/20 p-4">
                  <div className="aspect-[0.68] rounded-[26px] border border-white/12 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_30%),linear-gradient(180deg,#0f172d_0%,#05070e_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <p className="text-sm text-white/72">Camera view</p>
                    <div className="mt-6 rounded-[24px] border-2 border-white/28 p-5 text-center text-sm leading-6 text-white/72">
                      Frame the front of your card here. We’ll detect issuer, last four, and likely product name.
                    </div>
                    <div className="mt-6 rounded-2xl bg-emerald-400/10 p-3 text-sm text-emerald-200/85">Detected: premium Amex profile + card ending in 9999</div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button onClick={() => setScanStep('manual')} className="rounded-full border border-white/12 px-4 py-3 text-sm text-white/80 transition hover:bg-[#8d949f]/28">Manual entry</button>
                    <button onClick={finishDemoAdd} className="rounded-full bg-white px-4 py-3 text-sm font-medium text-[#060816] transition hover:opacity-95">Use detection</button>
                  </div>
                </div>
              )}

              {scanStep === 'manual' && (
                <div className="mt-5 space-y-3">
                  <div className="rounded-[28px] border border-white/12 bg-[#8d949f]/20 p-4">
                    <label className="text-xs uppercase tracking-[0.22em] text-white/50">Issuer</label>
                    <input value={draftCard.issuer} onChange={(e) => setDraftCard((d) => ({ ...d, issuer: e.target.value }))} className="mt-2 w-full rounded-2xl border border-white/12 bg-[#8d949f]/24 px-4 py-3 text-white outline-none transition focus:border-white/20" />
                  </div>
                  <div className="rounded-[28px] border border-white/12 bg-[#8d949f]/20 p-4">
                    <label className="text-xs uppercase tracking-[0.22em] text-white/50">Product name</label>
                    <input value={draftCard.name} onChange={(e) => setDraftCard((d) => ({ ...d, name: e.target.value }))} className="mt-2 w-full rounded-2xl border border-white/12 bg-[#8d949f]/24 px-4 py-3 text-white outline-none transition focus:border-white/20" />
                  </div>
                  <div className="rounded-[28px] border border-white/12 bg-[#8d949f]/20 p-4">
                    <label className="text-xs uppercase tracking-[0.22em] text-white/50">Last four</label>
                    <input value={draftCard.last4} onChange={(e) => setDraftCard((d) => ({ ...d, last4: e.target.value }))} className="mt-2 w-full rounded-2xl border border-white/12 bg-[#8d949f]/24 px-4 py-3 text-white outline-none transition focus:border-white/20" />
                  </div>
                  <div className="rounded-[28px] border border-white/12 bg-[#8d949f]/20 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/50">Preview</p>
                    <p className="mt-2 text-lg font-medium text-white">{draftCard.issuer} {draftCard.name}</p>
                    <p className="mt-1 text-sm text-white/74">Will be added to your wallet stack as •••• {draftCard.last4}</p>
                  </div>
                  <button onClick={finishDemoAdd} className="w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-[#060816] transition hover:opacity-95">Add card</button>
                </div>
              )}

              {scanStep === 'success' && (
                <div className="mt-8 rounded-[28px] border border-emerald-400/20 bg-emerald-400/10 p-6 text-center transition-all duration-300">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-300/20 text-2xl text-white">✓</div>
                  <p className="mt-4 text-xl font-semibold text-white">{draftCard.name} added</p>
                  <p className="mt-2 text-sm text-white/70">Sliding into your wallet now…</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
