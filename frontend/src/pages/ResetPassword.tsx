import { useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function meter(password: string) {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const types = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;
  if (password.length >= 10 && hasUpper && hasLower && (hasNumber || hasSymbol)) return { label: 'Strong', width: 100, color: 'bg-green-500' };
  if (password.length >= 8 && types >= 2) return { label: 'Fair', width: 66, color: 'bg-amber-500' };
  return { label: 'Weak', width: 33, color: 'bg-red-500' };
}

export function ResetPassword() {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const strength = useMemo(() => meter(password), [password]);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setDone(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid or expired reset link';
      setError(msg.includes('expired') || msg.includes('Invalid') ? 'This reset link is invalid or has expired. Request a new one.' : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--page-bg)] p-4">
      <Card className="w-full max-w-md border-[var(--border-color)]">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Set a new password for your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token ? (
            <p className="text-sm text-red-600">
              This reset link is invalid or has expired. <Link className="underline text-[var(--navy)]" to="/forgot-password">Request a new one</Link>.
            </p>
          ) : done ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-color)]">Password reset successful. Please log in.</p>
              <Button asChild className="w-full bg-[var(--navy)] hover:bg-[var(--navy)]/90">
                <Link to="/login">Go to Login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <div className="h-2 rounded bg-gray-200 overflow-hidden">
                  <div className={`h-full ${strength.color}`} style={{ width: `${strength.width}%` }} />
                </div>
                <p className="text-xs text-[var(--muted)]">Strength: {strength.label}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
              {error && (
                <p className="text-sm text-red-600">
                  {error} {error.includes('expired') && <Link to="/forgot-password" className="underline text-[var(--navy)]">Request a new one</Link>}
                </p>
              )}
              <Button type="submit" className="w-full bg-[var(--navy)] hover:bg-[var(--navy)]/90" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
