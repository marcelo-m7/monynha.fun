import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Auth from './Auth';
import { renderWithProviders } from '@/shared/test/renderWithProviders';

const signInMock = vi.fn();
const signUpMock = vi.fn();

vi.mock('@/features/auth/useAuth', () => ({
  useAuth: () => ({
    signIn: signInMock,
    signUp: signUpMock,
    user: null,
    loading: false,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

beforeEach(() => {
  signInMock.mockReset();
  signUpMock.mockReset();
  signInMock.mockResolvedValue({ error: null });
  signUpMock.mockResolvedValue({ error: null });
});

describe('Auth page', () => {
  it('submits login form and calls signIn', async () => {
    renderWithProviders(<Auth />);

    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(signInMock).toHaveBeenCalledWith('user@example.com', 'password123');

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/.+/);
    });
  });

  it('shows inline error feedback when login fails', async () => {
    signInMock.mockResolvedValue({ error: new Error('Invalid login credentials') });

    renderWithProviders(<Auth />);

    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong-password');

    await user.click(screen.getByRole('button', { name: /login/i }));

    expect(signInMock).toHaveBeenCalledWith('user@example.com', 'wrong-password');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/.+/);
    });
  });

  it('switches to signup and calls signUp', async () => {
    renderWithProviders(<Auth />);

    const user = userEvent.setup();

    await user.click(screen.getByText(/don't have an account\? sign up/i));

    await waitFor(() => {
      expect(screen.getByLabelText(/username/i)).toHaveFocus();
    });

    await user.type(screen.getByLabelText(/username/i), 'newuser');
    await user.type(screen.getByLabelText(/email/i), 'newuser@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');

    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith('newuser@example.com', 'password123', 'newuser');
    });
  });
});
