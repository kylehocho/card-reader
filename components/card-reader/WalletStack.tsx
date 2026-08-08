'use client';

import { motion } from 'framer-motion';
import type { AddCardStackItem } from './useWalletNavigation';

type WalletStackCard = {
  id: string;
  issuer: string;
  name: string;
  last4: string;
  gradient: string;
};

type WalletStackItem = WalletStackCard | AddCardStackItem;

type WalletStackProps<Card extends WalletStackCard> = {
  isExpanded: boolean;
  items: Array<Card | AddCardStackItem>;
  onExpand: () => void;
  onOpenAddCard: () => void;
  onSelectCard: (cardId: string) => void;
};

export function isAddCardStackItem(item: WalletStackItem): item is AddCardStackItem {
  return item.id === 'add-card';
}

export function walletStackItemLayout({
  index,
  isExpanded,
  itemCount,
}: {
  index: number;
  isExpanded: boolean;
  itemCount: number;
}) {
  const scale = isExpanded ? 1 : 1 - index * 0.024;

  return {
    top: isExpanded ? 12 + index * 62 : 18 + index * 18,
    scale,
    opacity: isExpanded ? 1 : 1 - index * 0.05,
    zIndex: isExpanded ? itemCount - index : 20 - index,
    y: isExpanded ? 0 : index * 1.5,
    whileTapScale: isExpanded ? 0.988 : scale - 0.012,
  };
}

function walletStackCardClassName(item: WalletStackItem) {
  if (isAddCardStackItem(item)) {
    return 'absolute inset-x-0 rounded-[30px] border border-dashed border-white/18 bg-[#8d949f]/24 px-5 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_30px_rgba(0,0,0,0.16)]';
  }

  return `absolute inset-x-0 rounded-[30px] bg-gradient-to-br ${item.gradient} px-5 py-4 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_16px_30px_rgba(0,0,0,0.22)]`;
}

export default function WalletStack<Card extends WalletStackCard>({
  isExpanded,
  items,
  onExpand,
  onOpenAddCard,
  onSelectCard,
}: WalletStackProps<Card>) {
  return (
    <div className="relative z-10 mt-3 pb-2 pt-0">
      <div className={`relative overflow-hidden rounded-[30px] transition-all duration-300 ${isExpanded ? 'h-[430px]' : 'h-[250px]'}`}>
        {items.map((item, index) => {
          const isAddCard = isAddCardStackItem(item);
          const layout = walletStackItemLayout({ index, isExpanded, itemCount: items.length });

          return (
            <motion.button
              key={item.id}
              layout
              type="button"
              onClick={() => {
                if (!isExpanded) {
                  onExpand();
                  return;
                }
                if (isAddCard) {
                  onOpenAddCard();
                  return;
                }
                onSelectCard(item.id);
              }}
              whileTap={{ scale: layout.whileTapScale }}
              className={walletStackCardClassName(item)}
              style={{ top: layout.top, zIndex: layout.zIndex }}
              animate={{
                scale: layout.scale,
                opacity: layout.opacity,
                y: layout.y,
              }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            >
              {!isAddCard && <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.2),transparent_28%)]" />}
              <div className={`relative flex items-start justify-between ${isAddCard ? 'text-white/92' : 'text-white'}`}>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/70">{item.issuer}</p>
                  <p className="mt-6 text-[20px] font-semibold tracking-[-0.02em] text-white">{item.name}</p>
                </div>
                <p className="mt-1 text-xs text-white/74">{isAddCard ? 'Scan or enter' : `•••• ${item.last4}`}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
