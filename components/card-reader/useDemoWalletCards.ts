'use client';

import type { ManualCardDraft } from '@/components/card-reader/useAddCardPresentation';

type DemoWalletCardLike = {
  id: string;
};

export function buildDemoWalletCard({
  draftCard,
  sequence,
}: {
  draftCard: ManualCardDraft;
  sequence: number;
}) {
  return {
    id: `custom-${sequence}`,
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
    multipliers: [
      {
        id: `custom-${sequence}-flat`,
        category: 'gas' as const,
        label: 'Custom category',
        multiplier: 'Set rate',
        detail: 'Map bonus categories after onboarding',
        icon: '⚙️',
      },
    ],
    concierges: [],
    alerts: [draftCard.isBusiness ? 'Business card added to the wallet prototype' : 'New card added to the wallet prototype'],
    rewardReset: 'Set custom reset timing',
    annualFeeMonth: 'Not set',
    monthlyCreditsUsed: 0,
    monthlyCreditsTotal: 1,
    annualFee: 0,
    perkValueUsed: 0,
    nextResetLabel: 'Configure after setup',
    transactions: [{ id: `custom-${sequence}-setup`, merchant: 'Awaiting connection', amount: '--', date: 'Now', category: 'Setup' }],
    benefits: [{ id: `custom-${sequence}-benefit`, title: 'Starter perk slot', status: 'available' as const, detail: 'Add real benefits in a later build', progress: 0 }],
    isBusiness: draftCard.isBusiness,
  };
}

export function appendDemoWalletCard<Card extends DemoWalletCardLike>({
  cards,
  draftCard,
  sequence,
}: {
  cards: Card[];
  draftCard: ManualCardDraft;
  sequence: number;
}) {
  const card = buildDemoWalletCard({ draftCard, sequence });

  return {
    card,
    cards: [...cards, card],
    selectedId: card.id,
  };
}
