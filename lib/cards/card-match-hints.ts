export type MatchableCardProduct = {
  id: string;
  issuer: string;
  name: string;
};

export type CardProductMatchSuggestion<TProduct extends MatchableCardProduct = MatchableCardProduct> = {
  product: TProduct;
  confidence: number;
  reason: string;
};

type SuggestCardProductMatchInput<TProduct extends MatchableCardProduct> = {
  accountName: string;
  institutionName?: string | null;
  products: TProduct[];
};

const productAliases: Record<string, string[]> = {
  'chase-sapphire-reserve': ['sapphire reserve', 'csr', 'chase reserve'],
  'chase-sapphire-preferred': ['sapphire preferred', 'csp', 'chase preferred'],
  'amex-platinum': ['amex platinum', 'american express platinum', 'platinum card'],
  'amex-gold': ['amex gold', 'american express gold', 'gold card'],
  'capital-one-venture-x': ['venture x', 'capital one venture x', 'venture x rewards'],
  'chase-freedom-unlimited': ['freedom unlimited', 'cfu'],
  'chase-freedom-flex': ['freedom flex', 'cff'],
  'citi-strata-premier': ['strata premier', 'citi premier'],
  'bilt-mastercard': ['bilt mastercard', 'bilt card'],
  'discover-it-cash-back': ['discover it', 'discover cash back'],
};

const stopWords = new Set(['the', 'from', 'card', 'credit', 'rewards', 'reward', 'visa', 'mastercard', 'american', 'express']);

function normalize(value: string) {
  return value.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokenSet(value: string) {
  return new Set(
    normalize(value)
      .split(' ')
      .filter((token) => token.length > 1 && !stopWords.has(token)),
  );
}

function countMatches(left: Set<string>, right: Set<string>) {
  let count = 0;
  for (const token of left) {
    if (right.has(token)) count += 1;
  }
  return count;
}

function issuerMatches(input: string, issuer: string) {
  const normalizedInput = normalize(input);
  const normalizedIssuer = normalize(issuer);

  if (!normalizedIssuer) return false;
  if (normalizedInput.includes(normalizedIssuer)) return true;
  if (normalizedIssuer.includes('american express') && /\bamex\b/.test(normalizedInput)) return true;
  if (normalizedIssuer.includes('capital one') && normalizedInput.includes('capital one')) return true;
  if (normalizedIssuer.includes('bilt') && normalizedInput.includes('bilt')) return true;
  return false;
}

function aliasScore(input: string, product: MatchableCardProduct) {
  const normalizedInput = normalize(input);
  const aliases = productAliases[product.id] ?? [];

  for (const alias of aliases) {
    if (normalizedInput.includes(normalize(alias))) {
      return 0.92;
    }
  }

  return 0;
}

function productTokenScore(inputTokens: Set<string>, product: MatchableCardProduct) {
  const productTokens = tokenSet(product.name);
  if (productTokens.size === 0) return 0;

  const matched = countMatches(productTokens, inputTokens);
  return matched / productTokens.size;
}

export function suggestCardProductMatch<TProduct extends MatchableCardProduct>({
  accountName,
  institutionName,
  products,
}: SuggestCardProductMatchInput<TProduct>): CardProductMatchSuggestion<TProduct> | null {
  const input = [accountName, institutionName].filter(Boolean).join(' ');
  const inputTokens = tokenSet(input);
  if (!inputTokens.size) return null;

  const scored = products
    .map((product) => {
      const alias = aliasScore(input, product);
      const tokenScore = productTokenScore(inputTokens, product);
      const issuerScore = issuerMatches(input, product.issuer) ? 0.16 : 0;
      const confidence = Math.min(Math.max(alias, tokenScore * 0.82 + issuerScore), 0.98);

      return {
        product,
        confidence,
        reason:
          alias > 0
            ? `Matched "${accountName}" to a known ${product.name} alias.`
            : `Matched ${Math.round(tokenScore * 100)}% of product-name tokens${issuerScore > 0 ? ' plus issuer signal' : ''}.`,
      };
    })
    .filter((candidate) => candidate.confidence >= 0.56)
    .sort((left, right) => right.confidence - left.confidence);

  return scored[0] ?? null;
}
