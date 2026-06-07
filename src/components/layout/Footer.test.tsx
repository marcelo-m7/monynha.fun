import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/shared/test/renderWithProviders';
import { Footer } from './Footer';

vi.mock('@/features/home/useHomeExhibition', () => ({
  useHomeExhibition: () => ({
    data: {
      curation_signals: {
        recent_submissions: 12,
        with_summaries: 10,
        with_tags: 9,
        transcripts_completed: 7,
      },
    },
  }),
}));

describe('Footer', () => {
  it('renders the global navigation map with the imports route', () => {
    renderWithProviders(<Footer />);

    expect(screen.getByRole('heading', { name: /platform/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /learning/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /community/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /institutional/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /imports/i })).toHaveAttribute('href', '/submissions');
  });
});
