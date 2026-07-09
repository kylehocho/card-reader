export type Transaction = {
  id: string;
  merchant: string;
  amount: string;
  date: string;
  category: string;
};

export type PlaidConnectedAccount = {
  dbId?: string;
  accountId: string;
  institutionName: string;
  name: string;
  mask: string;
  type: string;
  subtype: string;
  currentBalance: number | null;
  limit: number | null;
  cardProductId?: string | null;
  cardProductName?: string | null;
  cardProductIssuer?: string | null;
  matchStatus?: string | null;
  recentTransactions?: Transaction[];
};
