import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function strength(password: string) {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const types = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;
  if (password.length >= 10 && hasUpper && hasLower && (hasNumber || hasSymbol)) return { text: 'Strong', width: 100, color: 'bg-green-500' };
  if (password.length >= 8 && types >= 2) return { text: 'Fair', width: 66, color: 'bg-amber-500' };
  return { text: 'Weak', width: 33, color: 'bg-red-500' };
}

export function AcceptInvite() {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const invitedEmail = searchParams.get('email') || '';
  const [orgName, setOrgName] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: invitedEmail,
    inviteCode: '',
    name: '',
    password: '',
    confirmPassword: '',
  });
  const meter = useMemo(() => strength(form.password), [form.password]);

  useEffect(() => {
    if (!invitedEmail) return;
    fetch(`${API_BASE}/register/invite-org?email=${encodeURIComponent(invitedEmail)}`)
      .then((res) => res.json())
      .then((data: { orgName?: string }) => setOrgName(data.orgName || 'your organisation'))
      .catch(() => setOrgName('your organisation'));
  }, [invitedEmail]);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to activate account');
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--page-bg)] p-4">
      <Card className="w-full max-w-md border-[var(--border-color)]">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            {done ? 'Account activated' : `You have been invited to join ${orgName || 'your organisation'} on ISMS Compass. Set your password to activate your account.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="space-y-4">
              <p className="text-sm text-[var(--text-color)]">Account activated. You can now log in.</p>
              <Button asChild className="w-full bg-[var(--navy)] hover:bg-[var(--navy)]/90">
                <Link to="/login">Go to Login</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteCode">Invite Code</Label>
                <Input id="inviteCode" value={form.inviteCode} onChange={(e) => setForm({ ...form, inviteCode: e.target.value.toUpperCase() })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                <div className="h-2 rounded bg-gray-200 overflow-hidden">
                  <div className={`h-full transition-all ${meter.color}`} style={{ width: `${meter.width}%` }} />
                </div>
                <p className="text-xs text-[var(--muted)]">Strength: {meter.text}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full bg-[var(--navy)] hover:bg-[var(--navy)]/90" disabled={loading}>
                {loading ? 'Activating...' : 'Activate Account'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
