import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PageHero } from './PageHero';

describe('PageHero', () => {
  it('does not animate by default', () => {
    render(
      <PageHero
        title="Tube Open2"
        description="A calm learning homepage"
        actions={<button type="button">Explore</button>}
        aside={<div>Featured video</div>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Tube Open2' })).not.toHaveClass('animate-home-hero-item');
    expect(screen.getByText('A calm learning homepage')).not.toHaveClass('animate-home-hero-item');
    expect(screen.getByText('Featured video').parentElement).not.toHaveClass('animate-home-hero-aside');
  });

  it('adds staggered entrance classes when enabled', () => {
    render(
      <PageHero
        animateEntrance
        eyebrow="New"
        title="Tube Open2"
        description="A calm learning homepage"
        actions={<button type="button">Explore</button>}
        aside={<div>Featured video</div>}
      />,
    );

    expect(screen.getByText('New')).toHaveClass('animate-home-hero-item', 'animation-delay-0');
    expect(screen.getByRole('heading', { name: 'Tube Open2' })).toHaveClass(
      'animate-home-hero-item',
      'animation-delay-70',
    );
    expect(screen.getByText('A calm learning homepage')).toHaveClass(
      'animate-home-hero-item',
      'animation-delay-140',
    );
    expect(screen.getByRole('button', { name: 'Explore' }).parentElement).toHaveClass(
      'animate-home-hero-item',
      'animation-delay-210',
    );
    expect(screen.getByText('Featured video').parentElement).toHaveClass(
      'animate-home-hero-aside',
      'animation-delay-140',
    );
  });

  it('starts the stagger on the title when no eyebrow is rendered', () => {
    render(
      <PageHero
        animateEntrance
        title="Tube Open2"
        description="A calm learning homepage"
        actions={<button type="button">Explore</button>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Tube Open2' })).toHaveClass(
      'animate-home-hero-item',
      'animation-delay-0',
    );
    expect(screen.getByText('A calm learning homepage')).toHaveClass(
      'animate-home-hero-item',
      'animation-delay-70',
    );
    expect(screen.getByRole('button', { name: 'Explore' }).parentElement).toHaveClass(
      'animate-home-hero-item',
      'animation-delay-140',
    );
  });

  it('keeps action controls interactive while animated', async () => {
    const onClick = vi.fn();

    render(
      <PageHero
        animateEntrance
        title="Tube Open2"
        actions={
          <button type="button" onClick={onClick}>
            Explore
          </button>
        }
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Explore' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
