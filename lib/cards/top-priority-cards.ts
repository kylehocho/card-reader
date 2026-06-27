import topPriorityCardProducts from '@/data/top-priority-card-products.json';
import type { AnalysisCardProduct } from '@/lib/benefits/types';

export const topPriorityCards = topPriorityCardProducts as unknown as AnalysisCardProduct[];

export const topPriorityCardIds = topPriorityCards.map((card) => card.id);

export function getTopPriorityCard(cardProductId: string) {
  return topPriorityCards.find((card) => card.id === cardProductId) ?? null;
}
