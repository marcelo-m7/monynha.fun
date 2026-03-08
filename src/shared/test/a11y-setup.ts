/**
 * Accessibility Testing Setup and Configuration
 * 
 * This module provides utilities for testing WCAG 2.1 Level AA compliance
 * using axe-core for React. Tests ensure proper color contrast, aria labels,
 * keyboard navigation, and focus management.
 */

import { axe as axeCore, Result } from 'axe-core';
import { screen } from '@testing-library/react';

/**
 * Axe configuration for standard accessibility testing
 */
export const axeConfig = {
  rules: {
    // Disable rules that might not apply to your app
    'skip-link': { enabled: true },
    'html-lang': { enabled: false }, // Often set in base HTML
  },
};

/**
 * Run accessibility audit on the main content area
 * Useful for testing page templates
 */
export async function auditPageA11y() {
  const main = screen.queryByRole('main') || document.body;
  const results = await axeCore(main);
  return results;
}

/**
 * Run accessibility audit on a specific region
 * @param container - The element to audit
 */
export async function auditElementA11y(container: HTMLElement) {
  const results = await axeCore(container);
  return results;
}

/**
 * Check for specific accessibility violations
 * @param results - Axe results object
 * @param violationType - Filter by violation type (e.g., 'color-contrast')
 */
export function filterViolationsByType(
  results: Result,
  violationType: string
) {
  return (results.violations || []).filter((v) => v.id === violationType);
}

/**
 * Common a11y test patterns
 */
export const a11yPatterns = {
  /**
   * Test that all buttons have accessible names
   */
  checkButtonAccessibility: async (container: HTMLElement) => {
    const buttons = container.querySelectorAll('button');
    const issues: string[] = [];

    buttons.forEach((btn) => {
      const hasText = btn.textContent?.trim().length ?? 0 > 0;
      const hasAriaLabel = btn.hasAttribute('aria-label');
      const hasTitle = btn.hasAttribute('title');

      if (!hasText && !hasAriaLabel && !hasTitle) {
        issues.push(`Button without text or aria-label: ${btn.className}`);
      }
    });

    return issues;
  },

  /**
   * Test that all images have alt text
   */
  checkImageAccessibility: async (container: HTMLElement) => {
    const images = container.querySelectorAll('img');
    const issues: string[] = [];

    images.forEach((img) => {
      if (!img.hasAttribute('alt')) {
        issues.push(`Image without alt text: ${img.src}`);
      } else if (img.getAttribute('alt')?.length === 0) {
        issues.push(`Image with empty alt text: ${img.src}`);
      }
    });

    return issues;
  },

  /**
   * Test for color contrast violations
   */
  checkContrast: async (container: HTMLElement) => {
    const results = await axeCore(container);
    const contrastViolations = (results.violations || []).filter((v) => v.id === 'color-contrast');
    return contrastViolations;
  },

  /**
   * Test keyboard navigation
   */
  checkKeyboardNav: (container: HTMLElement) => {
    const interactiveElements = container.querySelectorAll(
      'button, a, input, select, textarea, [tabindex]'
    );
    return Array.from(interactiveElements);
  },

  /**
   * Test for proper focus indicators
   */
  checkFocusIndicators: (container: HTMLElement) => {
    const styles = window.getComputedStyle(container);
    const hasFocusStyle = styles.outline || styles.borderColor;
    return { hasFocusStyle, styles };
  },
};

/**
 * Assert no accessibility violations with custom error message
 */
export async function expectNoA11yViolations(container: HTMLElement) {
  const results = await axeCore(container);
  
  if ((results.violations || []).length > 0) {
    const violations = (results.violations || [])
      .map((v) => `${v.id}: ${v.impact} - ${v.nodes.length} nodes`)
      .join('\n');
    throw new Error(`Accessibility violations found:\n${violations}`);
  }
}
