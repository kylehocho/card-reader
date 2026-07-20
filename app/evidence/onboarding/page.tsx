import type { Metadata } from 'next';
import EvidenceHarness from './EvidenceHarness';

type OnboardingEvidencePageProps = {
  searchParams?: Promise<{
    state?: string;
  }>;
};

export const metadata: Metadata = {
  title: 'Onboarding Evidence - Card Reader',
  description: 'Deterministic visual evidence route for Card Reader onboarding UI boundaries.',
};

export default async function OnboardingEvidencePage({ searchParams }: OnboardingEvidencePageProps) {
  const params = await searchParams;

  return <EvidenceHarness state={params?.state ?? 'manual-card'} />;
}
