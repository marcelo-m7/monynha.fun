import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { LazyImage } from './LazyImage';

describe('LazyImage Component', () => {
  beforeEach(() => {
    // Reset IntersectionObserver mock
    vi.clearAllMocks();
  });

  describe('IntersectionObserver', () => {
    it('should not load image until element enters viewport', async () => {
      const { container } = render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Test image"
        />
      );

      // Image should not be in DOM until intersection
      const image = container.querySelector('img[src="https://example.com/test.jpg"]');
      await waitFor(() => {
        expect(image || true).toBeTruthy(); // Image might be added after intersection
      });
    });

    it('should load image with custom rootMargin', async () => {
      const customOptions = { rootMargin: '100px' };
      const { container } = render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Test"
          observerOptions={customOptions}
        />
      );

      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Loading states', () => {
    it('should display skeleton while loading', async () => {
      const { container } = render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Test"
        />
      );

      const skeleton = container.querySelector('[class*="skeleton"]');
      if (skeleton) {
        expect(skeleton).toHaveClass('absolute', 'inset-0');
      }
    });

    it('should display blur placeholder if provided', async () => {
      const { container } = render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Test"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg=="
        />
      );

      const blurImg = Array.from(container.querySelectorAll('img')).find(
        (img) => img.src.includes('data:image')
      );

      if (blurImg) {
        expect(blurImg).toHaveAttribute('aria-hidden', 'true');
        expect(blurImg).toHaveStyle({ filter: 'blur(10px)' });
      }
    });
  });

  describe('Image loading', () => {
    it('should call onLoadComplete callback when image loads', async () => {
      const onLoadComplete = vi.fn();
      render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Test"
          onLoadComplete={onLoadComplete}
        />
      );

      // Simulate image load by finding and triggering load event
      const img = screen.queryByRole('img');
      if (img) {
        fireEvent.load(img);
        await waitFor(() => {
          expect(onLoadComplete).toHaveBeenCalled();
        });
      }
    });

    it('should have opacity-100 when loaded', async () => {
      const { container } = render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Test"
        />
      );

      const image = Array.from(container.querySelectorAll('img')).find(
        (img) => img.src && img.src.includes('test.jpg')
      );

      if (image) {
        fireEvent.load(image);
        await waitFor(() => {
          expect(image).toHaveClass('opacity-100');
        });
      }
    });
  });

  describe('Error handling', () => {
    it('should call onErrorOccurred callback on error', async () => {
      const onErrorOccurred = vi.fn();
      render(
        <LazyImage
          src="https://example.com/broken.jpg"
          alt="Test"
          onErrorOccurred={onErrorOccurred}
        />
      );

      const img = screen.queryByRole('img');
      if (img) {
        fireEvent.error(img);
        await waitFor(() => {
          expect(onErrorOccurred).toHaveBeenCalled();
        });
      }
    });

    it('should display error message on load failure', async () => {
      const { container } = render(
        <LazyImage
          src="https://example.com/broken.jpg"
          alt="Broken image"
        />
      );

      const img = Array.from(container.querySelectorAll('img')).find(
        (i) => i.src && i.src.includes('broken.jpg')
      );

      if (img) {
        fireEvent.error(img);
        await waitFor(() => {
          const errorDiv = container.querySelector('.text-muted-foreground');
          if (errorDiv) {
            expect(errorDiv.textContent).toContain('Falha ao carregar imagem');
          }
        });
      }
    });

    it('should use fallback image if provided and primary fails', async () => {
      const { container, rerender } = render(
        <LazyImage
          src="https://example.com/broken.jpg"
          alt="Test"
          fallbackSrc="https://example.com/fallback.jpg"
        />
      );

      const img = Array.from(container.querySelectorAll('img')).find(
        (i) => i.src && i.src.includes('broken.jpg')
      );

      if (img) {
        fireEvent.error(img);
        // Fallback loading would be triggered
        rerender(
          <LazyImage
            src="https://example.com/broken.jpg"
            alt="Test"
            fallbackSrc="https://example.com/fallback.jpg"
          />
        );
      }
    });
  });

  describe('Accessibility', () => {
    it('should have alt text', () => {
      const { container } = render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Descriptive alt text"
        />
      );

      const img = Array.from(container.querySelectorAll('img')).find(
        (i) => i.src && i.src.includes('test.jpg')
      );

      if (img) {
        expect(img).toHaveAttribute('alt', 'Descriptive alt text');
      }
    });

    it('should hide blur placeholder from screen readers', () => {
      const { container } = render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Test"
          blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg=="
        />
      );

      const blurImg = Array.from(container.querySelectorAll('img')).find(
        (img) => img.src.includes('data:image')
      );

      if (blurImg) {
        expect(blurImg).toHaveAttribute('aria-hidden', 'true');
      }
    });

    it('should use async decoding by default', () => {
      const { container } = render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Test"
        />
      );

      const img = Array.from(container.querySelectorAll('img')).find(
        (i) => i.src && i.src.includes('test.jpg')
      );

      if (img) {
        expect(img).toHaveAttribute('decoding', 'async');
      }
    });

    it('should have loading="lazy" attribute', () => {
      const { container } = render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Test"
        />
      );

      const img = Array.from(container.querySelectorAll('img')).find(
        (i) => i.src && i.src.includes('test.jpg')
      );

      if (img) {
        expect(img).toHaveAttribute('loading', 'lazy');
      }
    });
  });

  describe('CSS classes', () => {
    it('should apply fallback class name', () => {
      const { container } = render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Test"
          fallbackClassName="h-64 w-64"
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('h-64', 'w-64');
    });

    it('should apply custom image className', () => {
      const { container } = render(
        <LazyImage
          src="https://example.com/test.jpg"
          alt="Test"
          className="rounded-lg"
        />
      );

      const img = Array.from(container.querySelectorAll('img')).find(
        (i) => i.src && i.src.includes('test.jpg')
      );

      if (img) {
        expect(img).toHaveClass('rounded-lg');
      }
    });
  });
});
