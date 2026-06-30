import type {
  AnalysisAccount,
  AnalysisCardProduct,
  AnalysisTransaction,
  BenefitRule,
  BenefitTracker,
  CardRecommendation,
  RewardCategory,
  WalletAnalysis,
} from '@/lib/benefits/types';

type AnalyzeWalletInput = {
  cardProducts: AnalysisCardProduct[];
  accounts: AnalysisAccount[];
  transactions: AnalysisTransaction[];
  asOf?: Date;
};

const rewardAliases: Record<RewardCategory, string[]> = {
  dining: ['dining', 'restaurants'],
  groceries: ['groceries', 'us_supermarkets', 'online_grocery'],
  travel: ['travel'],
  flights: ['flights', 'air_travel', 'capital_one_travel_flights'],
  hotel: ['hotel', 'hotels', 'prepaid_hotels', 'capital_one_travel_hotels'],
  gas: ['gas', 'ev_charging'],
  drugstore: ['drugstore'],
  rent: ['rent'],
  streaming: ['streaming'],
  capital_one_travel: ['capital_one_travel', 'capital_one_travel_hotels', 'capital_one_travel_flights'],
  rotating_quarterly: ['rotating_quarterly'],
  general: ['general'],
};

function daysAgo(days: number, asOf: Date) {
  const date = new Date(asOf);
  date.setDate(date.getDate() - days);
  return date;
}

function normalizeText(transaction: AnalysisTransaction) {
  const personalFinance =
    transaction.personal_finance_category && typeof transaction.personal_finance_category === 'object' && !Array.isArray(transaction.personal_finance_category)
      ? Object.values(transaction.personal_finance_category).join(' ')
      : '';

  return [transaction.merchant_name, transaction.name, ...(transaction.category ?? []), personalFinance].filter(Boolean).join(' ').toLowerCase();
}

export function inferBenefitCategory(transaction: AnalysisTransaction): RewardCategory {
  const text = normalizeText(transaction);

  if (/rent|apartment|property management|bilt/.test(text)) return 'rent';
  if (/grocery|supermarket|whole foods|market|trader joe|kroger|safeway/.test(text)) return 'groceries';
  if (/restaurant|dining|coffee|cafe|chipotle|doordash|uber eats|bar|food|resy/.test(text)) return 'dining';
  if (/airline|united|delta|american airlines|southwest|flight|airfare|tsa|global entry/.test(text)) return 'flights';
  if (/hotel|hyatt|marriott|hilton|airbnb|lodging/.test(text)) return 'hotel';
  if (/gas|fuel|shell|chevron|exxon|ev charging|chargepoint/.test(text)) return 'gas';
  if (/drugstore|pharmacy|walgreens|cvs/.test(text)) return 'drugstore';
  if (/uber|lyft|taxi|train|parking|transit|travel/.test(text)) return 'travel';
  if (/netflix|hulu|disney|peacock|spotify|streaming/.test(text)) return 'streaming';
  return 'general';
}

function multiplierFor(product: AnalysisCardProduct, category: RewardCategory) {
  const aliases = rewardAliases[category] ?? ['general'];
  return Math.max(...aliases.map((alias) => product.rewards[alias] ?? 0), product.rewards.general ?? 1);
}

function transactionMatchesBenefit(transaction: AnalysisTransaction, rule: BenefitRule) {
  const text = normalizeText(transaction);
  const category = inferBenefitCategory(transaction);
  const categoryMatch = rule.eligible_categories?.some((eligibleCategory) => {
    const normalized = eligibleCategory.toLowerCase();
    return normalized === category || text.includes(normalized.replaceAll('_', ' '));
  });
  const merchantMatch = rule.eligible_merchants?.some((merchant) => text.includes(merchant.toLowerCase()));

  if (!rule.eligible_categories?.length && !rule.eligible_merchants?.length) return false;
  return Boolean(categoryMatch || merchantMatch);
}

function transactionsForAccount(account: AnalysisAccount, transactions: AnalysisTransaction[]) {
  return transactions.filter((transaction) => transaction.plaid_account_id === account.id || transaction.account_id === account.account_id);
}

function recentTransactions(transactions: AnalysisTransaction[], days: number, asOf: Date) {
  const start = daysAgo(days, asOf).getTime();
  return transactions.filter((transaction) => {
    const transactionTime = new Date(transaction.date + 'T00:00:00').getTime();
    return transactionTime >= start && !transaction.pending && transaction.amount > 0;
  });
}

function buildStatementCreditTracker(product: AnalysisCardProduct, account: AnalysisAccount, rule: BenefitRule, transactions: AnalysisTransaction[], asOf: Date): BenefitTracker {
  const lookbackDays = rule.cadence === 'monthly' ? 31 : rule.cadence === 'semiannual' ? 183 : 366;
  const matchingTransactions = recentTransactions(transactionsForAccount(account, transactions), lookbackDays, asOf).filter((transaction) => transactionMatchesBenefit(transaction, rule));
  const used = Math.min(
    matchingTransactions.reduce((total, transaction) => total + transaction.amount, 0),
    rule.value ?? 0,
  );
  const target = rule.value ?? 0;
  const progress = target > 0 ? Math.min(100, Math.round((used / target) * 100)) : 0;

  return {
    id: `${account.id}-${rule.id}`,
    cardProductId: product.id,
    cardName: product.name,
    issuer: product.issuer,
    title: rule.title,
    type: rule.type,
    cadence: rule.cadence ?? 'ongoing',
    status: rule.enrollment_required && used === 0 ? 'needs-action' : progress >= 100 ? 'used' : used > 0 ? 'in-progress' : 'available',
    used,
    target,
    progress,
    detail: `$${Math.round(used)} of $${Math.round(target)} detected from linked transactions.`,
    nextAction: rule.enrollment_required && used === 0 ? 'Confirm enrollment, then route eligible spend here.' : 'Route eligible spend here before the reset window closes.',
  };
}

function buildWelcomeTracker(product: AnalysisCardProduct, account: AnalysisAccount, rule: BenefitRule, transactions: AnalysisTransaction[], asOf: Date): BenefitTracker {
  const eligibleTransactions = recentTransactions(transactionsForAccount(account, transactions), rule.days ?? 90, asOf);
  const used = eligibleTransactions.reduce((total, transaction) => total + transaction.amount, 0);
  const target = rule.target ?? 0;
  const progress = target > 0 ? Math.min(100, Math.round((used / target) * 100)) : 0;

  return {
    id: `${account.id}-${rule.id}`,
    cardProductId: product.id,
    cardName: product.name,
    issuer: product.issuer,
    title: rule.title,
    type: rule.type,
    cadence: 'first_year',
    status: progress >= 100 ? 'used' : used > 0 ? 'in-progress' : 'available',
    used,
    target,
    progress,
    detail: `$${Math.round(used)} of $${Math.round(target)} in eligible recent spend. Bonus: ${rule.bonus ?? 'offer terms vary'}.`,
    nextAction: progress >= 100 ? 'Bonus threshold appears complete; verify issuer posting.' : 'Prioritize everyday eligible spend on this card until the threshold is met.',
  };
}

function buildRecommendations(cardProducts: AnalysisCardProduct[], accounts: AnalysisAccount[], transactions: AnalysisTransaction[]): CardRecommendation[] {
  const productById = new Map(cardProducts.map((product) => [product.id, product]));
  const linkedProducts = accounts.map((account) => (account.card_product_id ? productById.get(account.card_product_id) : null)).filter((product): product is AnalysisCardProduct => Boolean(product));

  if (linkedProducts.length < 2) return [];

  return transactions
    .filter((transaction) => transaction.amount > 0 && !transaction.pending)
    .map((transaction) => {
      const account = accounts.find((candidate) => candidate.id === transaction.plaid_account_id || candidate.account_id === transaction.account_id);
      const currentProduct = account?.card_product_id ? productById.get(account.card_product_id) : null;
      const category = inferBenefitCategory(transaction);
      const bestProduct = [...linkedProducts].sort((left, right) => multiplierFor(right, category) - multiplierFor(left, category))[0];
      const currentMultiplier = currentProduct ? multiplierFor(currentProduct, category) : 1;
      const bestMultiplier = bestProduct ? multiplierFor(bestProduct, category) : 1;
      const estimatedLift = Math.max(transaction.amount * (bestMultiplier - currentMultiplier) * 0.01, 0);

      return {
        id: `${transaction.id}-recommendation`,
        transactionId: transaction.id,
        merchant: transaction.merchant_name ?? transaction.name,
        category,
        currentCard: currentProduct?.name ?? 'Unmatched card',
        bestCard: bestProduct?.name ?? 'Best linked card',
        currentMultiplier,
        bestMultiplier,
        estimatedLift,
        reason: `${category} spend earns ${bestMultiplier}x on ${bestProduct?.name ?? 'the best linked card'} versus ${currentMultiplier}x on ${currentProduct?.name ?? 'the current card'}.`,
      };
    })
    .filter((recommendation) => recommendation.bestMultiplier > recommendation.currentMultiplier)
    .slice(0, 8);
}

export function analyzeWallet({ cardProducts, accounts, transactions, asOf = new Date() }: AnalyzeWalletInput): WalletAnalysis {
  const productById = new Map(cardProducts.map((product) => [product.id, product]));
  const trackers: BenefitTracker[] = [];
  const welcomeBonuses: BenefitTracker[] = [];

  for (const account of accounts) {
    if (!account.card_product_id) continue;
    const product = productById.get(account.card_product_id);
    if (!product) continue;

    for (const rule of product.benefits) {
      if (rule.type === 'statement_credit') {
        trackers.push(buildStatementCreditTracker(product, account, rule, transactions, asOf));
      }

      if (rule.type === 'welcome_bonus') {
        welcomeBonuses.push(buildWelcomeTracker(product, account, rule, transactions, asOf));
      }
    }
  }

  const recommendations = buildRecommendations(cardProducts, accounts, transactions);

  return {
    trackers,
    welcomeBonuses,
    recommendations,
    alerts: [
      ...trackers.filter((tracker) => tracker.status === 'needs-action').map((tracker) => `${tracker.cardName}: ${tracker.title} needs setup or enrollment.`),
      ...trackers.filter((tracker) => tracker.status === 'available').slice(0, 4).map((tracker) => `${tracker.cardName}: ${tracker.title} has unused value.`),
      ...recommendations.slice(0, 3).map((recommendation) => `${recommendation.merchant}: use ${recommendation.bestCard} next time.`),
    ],
  };
}
