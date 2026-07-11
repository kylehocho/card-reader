import type { CardProductSuggestion } from '@/components/card-reader/AccountMatchSuggestionCard';
import type { PlaidConnectedAccount } from '@/components/card-reader/types';
import { suggestCardProductMatch } from '@/lib/cards/card-match-hints';
import type { Database } from '@/lib/supabase/types';
import { useMemo } from 'react';

type CardProductRow = Database['public']['Tables']['card_products']['Row'];

export function derivePlaidAccountMatchSuggestions(accounts: PlaidConnectedAccount[], cardProducts: CardProductRow[]) {
  return new Map<string, CardProductSuggestion | null>(
    accounts.map((account) => [
      account.accountId,
      suggestCardProductMatch({
        accountName: account.name,
        institutionName: account.institutionName,
        products: cardProducts,
      }),
    ]),
  );
}

export function usePlaidAccountMatching(accounts: PlaidConnectedAccount[], cardProducts: CardProductRow[]) {
  const matchSuggestionByAccountId = useMemo(
    () => derivePlaidAccountMatchSuggestions(accounts, cardProducts),
    [accounts, cardProducts],
  );

  return { matchSuggestionByAccountId };
}
