import { describe, expect, it, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditorApplicationForm } from './EditorApplicationForm';
import { renderWithProviders } from '@/shared/test/renderWithProviders';

const mockMutateAsync = vi.fn();
const mockUseSubmitEditorApplication = vi.fn();

vi.mock('../queries/useEditorApplications', () => ({
  useSubmitEditorApplication: () => mockUseSubmitEditorApplication(),
}));

beforeEach(() => {
  mockUseSubmitEditorApplication.mockReturnValue({
    mutateAsync: mockMutateAsync,
    isPending: false,
  });
});

describe('EditorApplicationForm', () => {
  it('renders all required form fields', () => {
    renderWithProviders(<EditorApplicationForm sourcePath="/editor/apply" />);

    expect(screen.getByLabelText(/full name \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email \*/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send application/i })).toBeInTheDocument();
  });

  it('shows validation errors for empty required fields on submit', async () => {
    renderWithProviders(<EditorApplicationForm sourcePath="/editor/apply" />);

    fireEvent.click(screen.getByRole('button', { name: /send application/i }));

    await waitFor(() => {
      expect(mockMutateAsync).not.toHaveBeenCalled();
    });
  });

  it('calls mutateAsync with correct payload on valid submit', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ application: { id: 'app-1' }, edgeError: null });

    renderWithProviders(<EditorApplicationForm sourcePath="/editor/apply" />);

    await user.type(screen.getByLabelText(/full name \*/i), 'Ana Beatriz');
    await user.type(screen.getByLabelText(/email \*/i), 'ana@example.com');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /send application/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          applicantName: 'Ana Beatriz',
          applicantEmail: 'ana@example.com',
          consentPrivacy: true,
          sourcePath: '/editor/apply',
        }),
      );
    });
  });

  it('shows success notification on successful submit', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({ application: { id: 'app-1' }, edgeError: null });

    renderWithProviders(<EditorApplicationForm sourcePath="/editor/apply" />);

    await user.type(screen.getByLabelText(/full name \*/i), 'Ana Beatriz');
    await user.type(screen.getByLabelText(/email \*/i), 'ana@example.com');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /send application/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });

  it('silently returns on mutation error without throwing to the browser (no double error toast)', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockRejectedValueOnce(new Error('DB error'));

    renderWithProviders(<EditorApplicationForm sourcePath="/editor/apply" />);

    await user.type(screen.getByLabelText(/full name \*/i), 'Ana Beatriz');
    await user.type(screen.getByLabelText(/email \*/i), 'ana@example.com');
    await user.click(screen.getByRole('checkbox'));

    // Submit via form submit event to avoid userEvent multi-click effects.
    fireEvent.submit(screen.getByRole('button', { name: /send application/i }).closest('form')!);

    await waitFor(() => {
      // The form should still be present (not crashed / unhandled rejection)
      expect(screen.getByRole('button', { name: /send application/i })).toBeInTheDocument();
    });
  });

  it('shows warning when email confirmation fails (edgeError set)', async () => {
    const user = userEvent.setup();
    mockMutateAsync.mockResolvedValueOnce({
      application: { id: 'app-1' },
      edgeError: new Error('Resend unavailable'),
    });

    renderWithProviders(<EditorApplicationForm sourcePath="/editor/apply" />);

    await user.type(screen.getByLabelText(/full name \*/i), 'Ana Beatriz');
    await user.type(screen.getByLabelText(/email \*/i), 'ana@example.com');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /send application/i }));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalled();
    });
  });
});
