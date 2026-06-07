import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export function ForgotPassword() {
  const { isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--page-bg)] p-4">
      <Card className="w-full max-w-md border-[var(--border-color)]">
        <CardHeader>
          <CardTitle>Forgot Password</CardTitle>
          <CardDescription>Request a password reset link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {sent ? (
            <p className="text-sm text-[var(--text-color)]">
              If that email is registered you will receive a reset link.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full bg-[var(--navy)] hover:bg-[var(--navy)]/90" disabled={loading}>
                {loading ? 'Sending...' : 'Send reset link'}
              </Button>
            </form>
          )}
          <p className="text-sm text-center">
            <Link to="/login" className="text-[var(--navy)] underline">Back to Login</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
