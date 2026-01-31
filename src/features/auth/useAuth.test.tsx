import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, render, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './useAuth';

const signInWithEmailMock = vi.fn();
const signUpWithEmailMock = vi.fn();
const signOutUserMock = vi.fn();

vi.mock('./auth.api', () => ({
  signInWithEmail: (...args: unknown[]) => signInWithEmailMock(...args),
  signUpWithEmail: (...args: unknown[]) => signUpWithEmailMock(...args),
  signOutUser: () => signOutUserMock(),
}));

const onAuthStateChangeMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock('@/shared/api/supabase/supabaseClient', () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args: unknown[]) => onAuthStateChangeMock(...args),
      getSession: () => getSessionMock(),
    },
  },
}));

function TestConsumer() {
  const { user, loading, signIn } = useAuth();

  return (
    <div>
      <span>{loading ? 'loading' : 'ready'}</span>
      <span>{user?.email ?? 'no-user'}</span>
      <button type="button" onClick={() => signIn('test@example.com', 'secret')}>
        sign-in
      </button>
    </div>
  );
}

beforeEach(() => {
  onAuthStateChangeMock.mockReset();
  getSessionMock.mockReset();
  signInWithEmailMock.mockReset();
  signUpWithEmailMock.mockReset();
  signOutUserMock.mockReset();

  onAuthStateChangeMock.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });

  getSessionMock.mockResolvedValue({ data: { session: null } });
});

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Broken = () => {
      useAuth();
      return null;
    };

    expect(() => render(<Broken />)).toThrow('useAuth must be used within an AuthProvider');
    consoleErrorSpy.mockRestore();
  });

  it('sets loading to false after session check and allows signIn', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('ready')).toBeInTheDocument();
    });

    screen.getByRole('button', { name: /sign-in/i }).click();

    expect(signInWithEmailMock).toHaveBeenCalledWith('test@example.com', 'secret');
  });
});
