import type { MerchantContext } from '@/lib/recommendation/merchant-context';

export type UseNowDemoMerchant = {
  id: string;
  label: string;
  context: MerchantContext;
};

export const useNowDemoMerchants: UseNowDemoMerchant[] = [
  {
    id: 'whole-foods',
    label: 'Whole Foods',
    context: {
      merchant: 'Whole Foods',
      host: 'wholefoodsmarket.com',
      url: 'https://www.wholefoodsmarket.com/',
      title: 'Whole Foods Market',
      categoryHint: 'groceries',
    },
  },
  {
    id: 'patagonia',
    label: 'Patagonia',
    context: {
      merchant: 'Patagonia',
      host: 'patagonia.com',
      url: 'https://www.patagonia.com/shop/mens',
      title: 'Patagonia Outdoor Clothing',
      categoryHint: 'shopping',
    },
  },
  {
    id: 'delta',
    label: 'Delta',
    context: {
      merchant: 'Delta',
      host: 'delta.com',
      url: 'https://www.delta.com/us/en/flight-search/book-a-flight',
      title: 'Delta Air Lines',
      categoryHint: 'flights',
    },
  },
  {
    id: 'amazon',
    label: 'Amazon',
    context: {
      merchant: 'Amazon',
      host: 'amazon.com',
      url: 'https://www.amazon.com/s?k=travel+backpack',
      title: 'Amazon.com: travel backpack',
      categoryHint: 'online marketplace',
    },
  },
  {
    id: 'chipotle',
    label: 'Chipotle',
    context: {
      merchant: 'Chipotle',
      host: 'chipotle.com',
      url: 'https://www.chipotle.com/order',
      title: 'Chipotle Mexican Grill',
      categoryHint: 'dining',
    },
  },
];

export const useNowDemoMerchantNames = useNowDemoMerchants.map((merchant) => merchant.label);

export function demoMerchantContextForQuery(query: string): MerchantContext {
  const normalizedQuery = query.trim().toLowerCase();
  const demoMerchant = useNowDemoMerchants.find((merchant) => merchant.label.toLowerCase() === normalizedQuery || merchant.id === normalizedQuery);
  return demoMerchant ? demoMerchant.context : { merchant: query.trim() };
}
