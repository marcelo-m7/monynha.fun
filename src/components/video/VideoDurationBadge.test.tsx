import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/shared/test/renderWithProviders';
import { VideoDurationBadge } from './VideoDurationBadge';

describe('VideoDurationBadge', () => {
  it('renders formatted duration with an accessible label', () => {
    renderWithProviders(<VideoDurationBadge durationSeconds={125} />);

    expect(screen.getByLabelText('Duration: 2:05')).toBeInTheDocument();
    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('does not render without a positive duration', () => {
    const { container, rerender } = renderWithProviders(<VideoDurationBadge durationSeconds={null} />);
    expect(container).toBeEmptyDOMElement();

    rerender(<VideoDurationBadge durationSeconds={0} />);
    expect(container).toBeEmptyDOMElement();
  });
});
