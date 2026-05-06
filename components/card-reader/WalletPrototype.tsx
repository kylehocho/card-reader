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

type ScanStep = 'camera' | 'confirm' | 'enrich' | 'success';
type Screen = 'wallet' | 'opportunities' | 'use-now';
type PurchaseCategory = 'Dining' | 'Travel' | 'General spend';
type WalletPage = 'benefits' | 'progress' | 'rewards';

const walletPages: WalletPage[] = ['benefits', 'progress', 'rewards'];

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

function statusTone(status: Benefit['status']) {
  switch (status) {
    case 'available':
      return 'bg-emerald-500/15 text-emerald-200 border-emerald-300/20';
    case 'in-progress':
      return 'bg-amber-500/15 text-amber-100 border-amber-300/20';
    case 'expiring':
      return 'bg-rose-500/15 text-rose-100 border-rose-300/20';
    case 'used':
      return 'bg-white/10 text-white/74 border-white/10';
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
  const [notifications, setNotifications] = useState(seedNotifications);
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

  function openScanner() {
    setShowScanner(true);
    setScanStep('camera');
  }

  function selectCard(cardId: string) {
    setSelectedId(cardId);
    setWalletPageIndex(0);
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

  function markFirstAvailableBenefitUsed() {
    setCards((prev) =>
      prev.map((card) => {
        if (card.id !== selectedCard.id) return card;
        const nextBenefits = [...card.benefits];
        const idx = nextBenefits.findIndex((b) => b.status === 'available');
        if (idx === -1) return card;
        nextBenefits[idx] = {
          ...nextBenefits[idx],
          status: 'used',
          detail: 'Marked used in prototype state',
          progress: 100,
        };
        return {
          ...card,
          benefits: nextBenefits,
          monthlyCreditsUsed: Math.min(card.monthlyCreditsUsed + 1, card.monthlyCreditsTotal),
          recommendation: 'One benefit is now used; the next recommendation can rebalance around what remains.',
        };
      }),
    );
  }

  function simulateMonthlyReset() {
    setCards((prev) =>
      prev.map((card) => ({
        ...card,
        monthlyCreditsUsed: 0,
        benefits: card.benefits.map((benefit) =>
          benefit.status === 'used' && benefit.title.toLowerCase().includes('credit')
            ? { ...benefit, status: 'available', detail: 'Reset for the new cycle', progress: 0 }
            : benefit,
        ),
      })),
    );
    setNotifications((prev) => [
      {
        id: `reset-${Date.now()}`,
        title: 'Prototype monthly reset completed',
        detail: 'Used monthly credits were restored to available where relevant.',
        action: 'Review which benefit you want to trigger first this cycle.',
        severity: 'info',
      },
      ...prev,
    ]);
  }

  return (
    <MotionConfig transition={{ type: 'spring', stiffness: 280, damping: 28, mass: 0.9 }}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,#1b2345_0%,#0b1021_28%,#02040b_100%)] text-white">
        <div className="mx-auto flex min-h-screen max-w-md flex-col px-4 pb-8 pt-6">
          <header className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-[32px] font-semibold tracking-[-0.04em] text-white">Card Reader</h1>
            </div>
            <div className="rounded-full border border-white/12 bg-[#8d949f]/24 px-3 py-1 text-[11px] text-white/74">v0.6</div>
          </header>

          {screen === 'wallet' && (
            <section className="flex min-h-[calc(100vh-170px)] flex-col gap-0">
              <div className="relative z-20 px-1 pt-3">
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

              <div className="relative z-10 -mt-8 px-2">
                <div className="rounded-[32px] bg-[#6f7782]/20 px-4 pb-4 pt-12 backdrop-blur-2xl shadow-[0_22px_45px_rgba(0,0,0,0.20)]">
                  <div className="rounded-[18px] border border-white/12 bg-[#8d949f]/28 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
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
                    <div className="min-h-[252px] rounded-[26px] border border-white/12 bg-[#8d949f]/28 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                      {walletPages[walletPageIndex] === 'benefits' && (
                        <div>
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-[11px] uppercase tracking-[0.24em] text-white/50">Available now</p>
                            <p className="text-xs text-white/70">{selectedCard.benefits.length} benefits</p>
                          </div>
                          <div className="space-y-3">
                            {selectedCard.benefits.map((benefit) => (
                              <motion.div layout key={benefit.id} className="rounded-[20px] border border-white/12 bg-[#8d949f]/28 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-[15px] font-medium tracking-[-0.01em] text-white">{benefit.title}</p>
                                    <p className="mt-1 text-[13px] leading-5 text-white/74">{benefit.detail}</p>
                                  </div>
                                  <span className={`rounded-full border px-2.5 py-1 text-[11px] capitalize ${statusTone(benefit.status)}`}>
                                    {benefit.status}
                                  </span>
                                </div>
                                {typeof benefit.progress === 'number' && (
                                  <div className="mt-3 h-2 rounded-full bg-white/8">
                                    <motion.div className="h-2 rounded-full bg-white" animate={{ width: `${Math.max(benefit.progress, 6)}%` }} />
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      )}

                      {walletPages[walletPageIndex] === 'progress' && (
                        <div>
                          <div className="rounded-[20px] border border-white/12 bg-[#8d949f]/28 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">Next unlock</p>
                            <p className="mt-2 text-[19px] font-medium tracking-[-0.02em] text-white">{selectedCard.spendSummary}</p>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <div className="rounded-[20px] border border-white/12 bg-[#8d949f]/28 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                              <p className="text-[10px] uppercase tracking-[0.28em] text-white/48">Monthly credits</p>
                              <p className="mt-2 text-2xl font-semibold text-white">{selectedCard.monthlyCreditsUsed}/{selectedCard.monthlyCreditsTotal}</p>
                              <p className="mt-1 text-sm text-white/74">Used this cycle</p>
                            </div>
                            <div className="rounded-[20px] border border-white/12 bg-[#8d949f]/28 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                              <p className="text-[10px] uppercase tracking-[0.28em] text-white/48">Next reset</p>
                              <p className="mt-2 text-base font-medium text-white">{selectedCard.nextResetLabel}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button onClick={markFirstAvailableBenefitUsed} className="flex-1 rounded-full border border-white/12 bg-[#8d949f]/28 px-4 py-3 text-sm text-white/90 transition hover:bg-white/[0.08]">Mark perk used</button>
                            <button onClick={simulateMonthlyReset} className="flex-1 rounded-full border border-white/12 bg-[#8d949f]/28 px-4 py-3 text-sm text-white/90 transition hover:bg-white/[0.08]">Simulate reset</button>
                          </div>
                        </div>
                      )}

                      {walletPages[walletPageIndex] === 'rewards' && (
                        <div>
                          <div className="rounded-[20px] border border-white/12 bg-[#8d949f]/28 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">Current total</p>
                            <p className="mt-2 text-[31px] font-semibold tracking-[-0.03em] text-white">{selectedCard.pointsValue}</p>
                            <p className="mt-1 text-[13px] text-white/70">{selectedCard.pointsLabel}</p>
                          </div>
                          <div className="mt-3 rounded-[20px] border border-white/12 bg-[#8d949f]/28 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            <p className="text-[10px] uppercase tracking-[0.28em] text-white/48">Membership year</p>
                            <p className="mt-2 text-base font-medium text-white">Annual fee posts in {selectedCard.annualFeeMonth}</p>
                            <p className="mt-3 text-sm leading-6 text-white/72">{selectedCard.rewardReset}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {selectedCard.categories.map((category) => (
                                <span key={category} className="rounded-full border border-white/12 bg-[#8d949f]/28 px-3 py-1 text-xs text-white/92">
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
              </div>

              <div className="relative z-10 -mt-7 px-2 pb-2 pt-0">
                <div className="mb-3 px-2" />
                <div className="relative h-[234px] overflow-hidden">
                  {cards
                    .filter((card) => card.id !== selectedId)
                    .map((card, index) => {
                      const top = 28 + index * 20;
                      const scale = 1 - index * 0.022;
                      const opacity = 1 - index * 0.06;
                      const zIndex = 20 - index;
                      return (
                        <motion.button
                          key={card.id}
                          layout
                          type="button"
                          onClick={() => selectCard(card.id)}
                          whileTap={{ scale: scale - 0.012 }}
                          className={`absolute inset-x-0 rounded-[30px] bg-gradient-to-br ${card.gradient} px-5 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_30px_rgba(0,0,0,0.22)]`}
                          style={{ top, zIndex }}
                          animate={{ scale, opacity, y: index * 1.5 }}
                        >
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_28%)]" />
                          <div className="relative flex items-start justify-between text-white">
                            <div>
                              <p className="text-[10px] uppercase tracking-[0.24em] text-white/70">{card.issuer}</p>
                              <p className="mt-6 text-[20px] font-semibold tracking-[-0.02em]">{card.name}</p>
                            </div>
                            <p className="mt-1 text-xs text-white/74">•••• {card.last4}</p>
                          </div>
                        </motion.button>
                      );
                    })}

                  <motion.button
                    layout
                    type="button"
                    onClick={openScanner}
                    whileTap={{ scale: 0.985 }}
                    className="absolute inset-x-0 top-[92px] rounded-[30px] border border-dashed border-white/18 bg-[#8d949f]/24 px-5 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_30px_rgba(0,0,0,0.16)]"
                    style={{ zIndex: 5 }}
                  >
                    <div className="flex items-start justify-between text-white/92">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.24em] text-white/70">Available cards</p>
                        <p className="mt-6 text-[20px] font-semibold tracking-[-0.02em] text-white">Add Card</p>
                      </div>
                      <p className="mt-1 text-xs text-white/74">Scan</p>
                    </div>
                  </motion.button>
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
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/72 p-3 backdrop-blur-md">
            <motion.div layout className="w-full max-w-md rounded-[34px] border border-white/12 bg-[#09101e]/95 p-5 shadow-[0_40px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
              <div className="mx-auto h-1.5 w-16 rounded-full bg-white/15" />
              <div className="mt-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/50">Add a card</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    {scanStep === 'camera' && 'Scan your card'}
                    {scanStep === 'confirm' && 'Confirm card details'}
                    {scanStep === 'enrich' && 'Complete setup'}
                    {scanStep === 'success' && 'Card added'}
                  </h2>
                </div>
                {scanStep !== 'success' && (
                  <button type="button" onClick={() => setShowScanner(false)} className="rounded-full border border-white/12 px-3 py-1 text-sm text-white/74 transition hover:text-white/90">
                    Close
                  </button>
                )}
              </div>

              <div className="mt-5 flex gap-2 rounded-full bg-[#8d949f]/24 p-1 text-xs">
                {(['camera', 'confirm', 'enrich'] as const).map((step) => (
                  <div key={step} className={`flex-1 rounded-full px-3 py-2 text-center capitalize transition ${scanStep === step ? 'bg-white text-[#111317]' : 'text-white/50'}`}>
                    {step}
                  </div>
                ))}
              </div>

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
                    <button className="rounded-full border border-white/12 px-4 py-3 text-sm text-white/80 transition hover:bg-[#8d949f]/28">Manual entry</button>
                    <button onClick={() => setScanStep('confirm')} className="rounded-full bg-white px-4 py-3 text-sm font-medium text-[#060816] transition hover:opacity-95">Use detection</button>
                  </div>
                </div>
              )}

              {scanStep === 'confirm' && (
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
                  <button onClick={() => setScanStep('enrich')} className="w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-[#060816] transition hover:opacity-95">Confirm card</button>
                </div>
              )}

              {scanStep === 'enrich' && (
                <div className="mt-5 space-y-3">
                  <div className="rounded-[28px] border border-white/12 bg-[#8d949f]/20 p-4 text-sm leading-6 text-white/80">
                    Prototype enrichment attaches reward program, likely category bonuses, annual fee month, and tracked benefit states.
                  </div>
                  <div className="rounded-[28px] border border-white/12 bg-[#8d949f]/20 p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/50">Preview</p>
                    <p className="mt-2 text-lg font-medium text-white">{draftCard.issuer} {draftCard.name}</p>
                    <p className="mt-1 text-sm text-white/74">Will be added to your wallet stack as •••• {draftCard.last4}</p>
                  </div>
                  <button onClick={finishDemoAdd} className="w-full rounded-full bg-white px-4 py-3 text-sm font-medium text-[#060816] transition hover:opacity-95">Finish setup</button>
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
