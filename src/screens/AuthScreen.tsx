import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../contexts/AuthContext';

type AuthMode = 'signin' | 'signup';

export function AuthScreen() {
  const { user, loading, error, clearError, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localMessage, setLocalMessage] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Spinner size="lg" className="text-primary-500" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setLocalMessage(null);
    clearError();

    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
        setLocalMessage('Account created. If email confirmation is enabled, check your inbox.');
      }
    } catch {
      // Auth context already sets user-facing error.
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">Necro Dash</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {mode === 'signin' ? 'Sign in to view your analytics dashboard.' : 'Create an account to continue.'}
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
          />

          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />

          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          {localMessage ? <p className="text-sm text-emerald-600">{localMessage}</p> : null}

          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            {mode === 'signin' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            className="text-primary-600 dark:text-primary-400 font-medium"
            onClick={() => {
              clearError();
              setLocalMessage(null);
              setMode(mode === 'signin' ? 'signup' : 'signin');
            }}
          >
            {mode === 'signin' ? 'Create one' : 'Sign in'}
          </button>
        </div>
      </Card>
    </div>
  );
}
