'use client';

import { useNowDemoMerchantNames } from '@/lib/recommendation/use-now-demo-merchants';
import type { MerchantResult } from './useMerchantRecommendation';
import type { PurchaseCategory, RecommendationItem } from './WalletPrototype';

type UseNowScreenProps = {
  merchantQuery: string;
  merchantRecommendationError: string | null;
  merchantRecommendationStatus: 'idle' | 'loading' | 'ready' | 'error';
  featuredMerchant: MerchantResult;
  merchantResults: MerchantResult[];
  purchaseCategory: PurchaseCategory;
  recommendations: RecommendationItem[];
  filteredRecommendations: RecommendationItem[];
  selectedRecommendation: RecommendationItem | undefined;
  selectedRecommendationId: string | null;
  onBack: () => void;
  onMerchantQueryChange: (query: string) => void;
  onOpenDemoMerchant: (merchant: string) => void;
  onPurchaseCategoryChange: (category: PurchaseCategory) => void;
  onSelectedRecommendationChange: (recommendationId: string | null) => void;
};

export default function UseNowScreen({
  merchantQuery,
  merchantRecommendationError,
  merchantRecommendationStatus,
  featuredMerchant,
  merchantResults,
  purchaseCategory,
  recommendations,
  filteredRecommendations,
  selectedRecommendation,
  selectedRecommendationId,
  onBack,
  onMerchantQueryChange,
  onOpenDemoMerchant,
  onPurchaseCategoryChange,
  onSelectedRecommendationChange,
}: UseNowScreenProps) {
  return (
    <section className="space-y-3">
      <div className="mb-1 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full bg-[#2c2c2e] px-3 py-1.5 text-sm font-medium text-white/88"
        >
          Back
        </button>
        <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-white">Use Now</h2>
        <div className="w-[56px]" />
      </div>
      <div className="overflow-hidden rounded-[30px] border border-white/12 bg-[#0d1224]/90 p-4 backdrop-blur-xl">
        <p className="text-xs uppercase tracking-[0.22em] text-white/50">Best card assistant</p>
        <h2 className="mt-2 text-[22px] font-semibold leading-tight text-white">What should I use right now?</h2>
        <p className="mt-2 text-sm leading-6 text-white/74">Search a business and compare the cards that rank highest for that merchant.</p>
        <div className="mt-4 rounded-[22px] border border-white/12 bg-white/[0.07] px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[17px] text-white/48">⌕</span>
            <input
              value={merchantQuery}
              onChange={(event) => onMerchantQueryChange(event.target.value)}
              placeholder="Search Sephora, Chipotle, Delta..."
              className="w-full bg-transparent text-[16px] text-white outline-none placeholder:text-white/36"
            />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {useNowDemoMerchantNames.map((merchant) => (
            <button
              key={merchant}
              type="button"
              onClick={() => onOpenDemoMerchant(merchant)}
              className="rounded-full border border-white/12 bg-[#8d949f]/20 px-3 py-2 text-xs text-white/76 transition hover:bg-white/12"
            >
              {merchant}
            </button>
          ))}
        </div>
        <div className="hidden">
          {(['Dining', 'Travel', 'General spend'] as const).map((category) => (
            <button
              key={category}
              onClick={() => {
                onPurchaseCategoryChange(category);
                const first = recommendations.find((recommendation) => recommendation.category === category);
                onSelectedRecommendationChange(first?.id ?? null);
              }}
              className={`rounded-full px-3 py-2 text-xs transition ${purchaseCategory === category ? 'bg-white text-[#111317]' : 'border border-white/12 bg-[#8d949f]/20 text-white/70'}`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {merchantQuery.trim() && merchantRecommendationStatus === 'loading' && (
        <div className="rounded-[24px] border border-white/12 bg-[#0d1224]/90 p-4 text-sm leading-6 text-white/70 backdrop-blur-xl">
          Checking live recommendation...
        </div>
      )}
      {merchantQuery.trim() && merchantRecommendationStatus === 'error' && merchantRecommendationError && (
        <div className="rounded-[24px] border border-amber-300/18 bg-amber-300/10 p-4 text-sm leading-6 text-amber-50/86 backdrop-blur-xl">
          {merchantRecommendationError}
        </div>
      )}

      <div className="overflow-hidden rounded-[30px] border border-white/12 bg-[#0d1224]/90 p-4 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.22em] text-white/50">Top result</p>
            <h3 className="mt-2 text-xl font-semibold text-white">Use {featuredMerchant.card}</h3>
            <p className="mt-1 text-sm text-white/60">{featuredMerchant.merchant} · {featuredMerchant.category}</p>
          </div>
          <span className="hidden shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-[#111317] sm:inline-flex">#{featuredMerchant.rank}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="min-w-0 rounded-2xl bg-white/[0.06] px-3 py-3">
            <p className="text-[11px] text-white/46">Reward</p>
            <p className="mt-1 text-[13px] font-medium leading-snug text-white">{featuredMerchant.reward}</p>
          </div>
          <div className="min-w-0 rounded-2xl bg-white/[0.06] px-3 py-3">
            <p className="text-[11px] text-white/46">Est. value</p>
            <p className="mt-1 text-[13px] font-medium leading-snug text-white">{featuredMerchant.value}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-white/72">{featuredMerchant.reason}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {featuredMerchant.matchedBenefits.map((benefit) => (
            <span key={benefit} className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs text-white/84">
              {benefit}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-3">
        {merchantResults.length > 0 ? (
          merchantResults.map((item) => (
            <div key={item.id} className="rounded-[28px] border border-white/12 bg-[#0d1224]/90 p-4 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/50">{item.category}</p>
                  <p className="mt-2 text-base font-medium text-white">{item.card}</p>
                  <p className="mt-1 text-sm text-white/66">{item.reward}</p>
                </div>
                <div className="hidden shrink-0 text-right sm:block">
                  <p className="text-[11px] text-white/42">Rank</p>
                  <p className="text-[22px] font-semibold text-white">#{item.rank}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/70">{item.reason}</p>
            </div>
          ))
        ) : (
          <div className="rounded-[28px] border border-white/12 bg-[#0d1224]/90 p-4 text-sm leading-6 text-white/70 backdrop-blur-xl">
            No mock merchant match yet. The backend version would fall back to MCC/category matching and issuer offer search.
          </div>
        )}
      </div>

      <div className="hidden">
        <div className="grid gap-3">
          {filteredRecommendations.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectedRecommendationChange(item.id)}
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
              <p className="mt-3 rounded-2xl bg-white/[0.07] px-3 py-3 text-sm leading-5 text-white/68">
                Runner-up: {selectedRecommendation.runnerUp}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
