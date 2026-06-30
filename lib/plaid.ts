import { Configuration, CountryCode, CreditAccountSubtype, PlaidApi, PlaidEnvironments, Products } from 'plaid';

const plaidEnv = (process.env.PLAID_ENV ?? 'sandbox').trim();

if (!['sandbox', 'development', 'production'].includes(plaidEnv)) {
  throw new Error('PLAID_ENV must be sandbox, development, or production.');
}

export function getPlaidClient() {
  const clientId = process.env.PLAID_CLIENT_ID?.trim();
  const secret = process.env.PLAID_SECRET?.trim();

  if (!clientId || !secret) {
    throw new Error('Missing Plaid credentials. Set PLAID_CLIENT_ID and PLAID_SECRET.');
  }

  return new PlaidApi(
    new Configuration({
      basePath: PlaidEnvironments[plaidEnv],
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': clientId,
          'PLAID-SECRET': secret,
        },
      },
    }),
  );
}

export const plaidProducts = [Products.Liabilities, Products.Transactions];
export const plaidCountryCodes = [CountryCode.Us];
export const plaidCreditCardAccountFilters = {
  credit: {
    account_subtypes: [CreditAccountSubtype.CreditCard],
  },
};
