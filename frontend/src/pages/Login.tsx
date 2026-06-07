import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, Users, KeyRound, Building2, LogIn, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

type Tab = 'signin' | 'invite';

/* ── Password-strength helper (reused from Register) ──────────────────── */
function pwStrength(p: string) {
  const hasUpper = /[A-Z]/.test(p);
  const hasLower = /[a-z]/.test(p);
  const hasNumber = /\d/.test(p);
  const hasSymbol = /[^A-Za-z0-9]/.test(p);
  const types = [hasUpper, hasLower, hasNumber, hasSymbol].filter(Boolean).length;
  if (p.length >= 10 && hasUpper && hasLower && (hasNumber || hasSymbol))
    return { label: 'Strong', score: 100, color: 'bg-green-500' };
  if (p.length >= 8 && types >= 2)
    return { label: 'Fair', score: 66, color: 'bg-amber-500' };
  return { label: 'Weak', score: 33, color: 'bg-red-500' };
}

/* ── Inline field error ────────────────────────────────────────────────── */
function FieldError({ msg }: { msg: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-600 mt-1">{msg}</p>;
}

export function Login() {
  const [tab, setTab] = useState<Tab>('signin');
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  /* session-expired toast */
  useEffect(() => {
    const reason = localStorage.getItem('isms_logout_reason');
    if (reason === 'inactive') {
      toast({ title: 'Session expired', description: 'You were signed out due to inactivity.', variant: 'destructive' });
      localStorage.removeItem('isms_logout_reason');
    }
  }, [toast]);

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ──────────────────────────────────────────────────── */}
      <div className="flex-1 bg-[var(--navy)] flex flex-col justify-center items-center p-12 text-white">
        <div className="max-w-md space-y-8">
          <div>
            <h1 className="text-4xl font-extrabold mb-4">ISO 27001, Made Simple</h1>
            <p className="text-lg text-white/80">
              Your complete implementation assistant designed specifically for Zimbabwean SMEs
            </p>
          </div>
          <div className="space-y-4">
            {[
              { icon: Shield, title: 'AI-Powered Guidance', body: 'Get instant help with risk assessments, control selection, and policy drafting' },
              { icon: Lock,   title: 'Step-by-Step Implementation', body: 'Follow a structured 10-step process from scope definition to certification' },
              { icon: Users,  title: 'Team Collaboration', body: 'Assign tasks, track progress, and maintain audit trails across your organisation' },
            ].map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex items-start gap-3 p-4 bg-white/10 rounded-lg backdrop-blur">
                <Icon className="w-6 h-6 flex-shrink-0 mt-1" />
                <div>
                  <div className="font-semibold mb-1">{title}</div>
                  <div className="text-sm text-white/70">{body}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            {['Zimbabwe Context', 'SME Focused', 'Offline Ready'].map(b => (
              <Badge key={b} variant="outline" className="bg-white/20 text-white border-white/30">{b}</Badge>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ─────────────────────────────────────────────────── */}
      <div className="flex-1 bg-white flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md space-y-4">

          {/* Tab switcher */}
          <div className="flex rounded-xl border border-[var(--border-color)] overflow-hidden">
            <button
              id="tab-signin"
              onClick={() => setTab('signin')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                tab === 'signin'
                  ? 'bg-[var(--navy)] text-white'
                  : 'bg-white text-[var(--muted)] hover:text-[var(--text-color)]'
              }`}
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
            <button
              id="tab-invite"
              onClick={() => setTab('invite')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
                tab === 'invite'
                  ? 'bg-[var(--navy)] text-white'
                  : 'bg-white text-[var(--muted)] hover:text-[var(--text-color)]'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              Join with Invite
            </button>
          </div>

          {/* Panels */}
          {tab === 'signin' && <SignInPanel login={login} navigate={navigate} toast={toast} />}
          {tab === 'invite' && <InvitePanel navigate={navigate} toast={toast} />}

          {/* Register link */}
          <Card className="border-[var(--border-color)] bg-gray-50">
            <CardContent className="p-4 flex items-center gap-3">
              <Building2 className="w-5 h-5 text-[var(--navy)] flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-color)]">New organisation?</p>
                <p className="text-xs text-[var(--muted)]">Register and set up your ISMS from scratch</p>
              </div>
              <Button asChild size="sm" variant="outline" className="border-[var(--navy)] text-[var(--navy)] hover:bg-[var(--navy)] hover:text-white">
                <Link to="/register">Register</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Sign-In Panel
   ════════════════════════════════════════════════════════════════════════ */
function SignInPanel({ login, navigate, toast }: {
  login: (e: string, p: string) => Promise<{ onboarding_required?: boolean }>;
  navigate: ReturnType<typeof useNavigate>;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [touched, setTouched] = useState<{ email?: boolean; password?: boolean }>({});

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const validate = () => {
    const e: typeof errors = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!EMAIL_RE.test(email.trim())) e.email = 'Please enter a valid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    return e;
  };

  const handleBlur = (field: 'email' | 'password') =>
    setTouched(t => ({ ...t, [field]: true }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsLoading(true);
    setErrors({});
    try {
      const result = await login(email.trim(), password);
      toast({ title: 'Welcome back!', description: 'Successfully signed in to ISMS Compass.' });
      if (result?.onboarding_required) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Invalid email or password';
      setErrors({ form: msg });
    } finally {
      setIsLoading(false);
    }
  };

  const liveErrors = touched.email || touched.password ? validate() : {};

  return (
    <Card className="border-[var(--border-color)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Sign In</CardTitle>
        <CardDescription>Enter your credentials to access ISMS Compass</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="signin-email">Email address</Label>
            <Input
              id="signin-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.co.zw"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onBlur={() => handleBlur('email')}
              className={`border-[var(--border-color)] ${touched.email && liveErrors.email ? 'border-red-400' : ''}`}
            />
            <FieldError msg={(touched.email && liveErrors.email) ? liveErrors.email : ''} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="signin-password">Password</Label>
            <div className="relative">
              <Input
                id="signin-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onBlur={() => handleBlur('password')}
                className={`border-[var(--border-color)] pr-10 ${touched.password && liveErrors.password ? 'border-red-400' : ''}`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text-color)]"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <FieldError msg={(touched.password && liveErrors.password) ? liveErrors.password : ''} />
          </div>

          {errors.form && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{errors.form}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-[var(--navy)] hover:bg-[var(--navy)]/90"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in…' : 'Sign In'}
          </Button>

          <div className="flex justify-between text-sm pt-1">
            <Link to="/forgot-password" className="text-[var(--navy)] underline underline-offset-2">
              Forgot password?
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Invite Panel  (join an existing org with an invite code)
   ════════════════════════════════════════════════════════════════════════ */
function InvitePanel({ navigate, toast }: {
  navigate: ReturnType<typeof useNavigate>;
  toast: ReturnType<typeof useToast>['toast'];
}) {
  const [form, setForm] = useState({ email: '', inviteCode: '', name: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [orgLookupDone, setOrgLookupDone] = useState(false);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const strength = useMemo(() => pwStrength(form.password), [form.password]);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /* Look up org name as user types email */
  useEffect(() => {
    const email = form.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { setOrgName(''); setOrgLookupDone(false); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/register/invite-org?email=${encodeURIComponent(email)}`);
        const data = await res.json() as { orgName?: string };
        setOrgName(data.orgName || '');
        setOrgLookupDone(true);
      } catch { setOrgName(''); }
    }, 500);
    return () => clearTimeout(t);
  }, [form.email]);  // eslint-disable-line react-hooks/exhaustive-deps

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email address';
    if (!form.inviteCode.trim()) e.inviteCode = 'Invite code is required';
    else if (form.inviteCode.trim().length < 6) e.inviteCode = 'Invite code is too short';
    if (!form.name.trim()) e.name = 'Your full name is required';
    else if (form.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(form.password)) e.password = 'Password must contain at least one uppercase letter';
    else if (!/\d/.test(form.password)) e.password = 'Password must contain at least one number';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match';
    return e;
  };

  const touch = (field: string) => setTouched(t => ({ ...t, [field]: true }));
  const liveErrors = Object.keys(touched).length > 0 ? validate() : {};

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: field === 'inviteCode' ? e.target.value.toUpperCase() : e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allTouched = Object.fromEntries(['email','inviteCode','name','password','confirmPassword'].map(k => [k, true]));
    setTouched(allTouched);
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register/accept-invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email.trim().toLowerCase(),
          inviteCode: form.inviteCode.trim().toUpperCase(),
          name: form.name.trim(),
          password: form.password,
          confirmPassword: form.confirmPassword,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Failed to activate account');
      setDone(true);
      toast({ title: 'Account activated!', description: 'You can now sign in with your new password.' });
    } catch (err) {
      setErrors({ form: err instanceof Error ? err.message : 'Failed to activate account' });
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <Card className="border-[var(--border-color)]">
        <CardContent className="p-8 text-center space-y-4">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
          <div>
            <h3 className="font-semibold text-lg text-[var(--text-color)]">Account Activated!</h3>
            <p className="text-sm text-[var(--muted)] mt-1">
              Your account is ready. Sign in with your email and new password.
            </p>
          </div>
          <Button
            className="w-full bg-[var(--navy)] hover:bg-[var(--navy)]/90"
            onClick={() => navigate('/login')}
          >
            Go to Sign In
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[var(--border-color)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Join with Invite Code</CardTitle>
        <CardDescription>
          Enter the invite code sent to you by your ISMS Owner to join your organisation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">

          {/* Email */}
          <div className="space-y-1">
            <Label htmlFor="inv-email">Work email address</Label>
            <Input
              id="inv-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.co.zw"
              value={form.email}
              onChange={set('email')}
              onBlur={() => touch('email')}
              className={`border-[var(--border-color)] ${touched.email && liveErrors.email ? 'border-red-400' : ''}`}
            />
            {orgLookupDone && orgName && (
              <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" /> Joining <strong>{orgName}</strong>
              </p>
            )}
            <FieldError msg={(touched.email && liveErrors.email) ? liveErrors.email : ''} />
          </div>

          {/* Invite code */}
          <div className="space-y-1">
            <Label htmlFor="inv-code">Invite code</Label>
            <Input
              id="inv-code"
              placeholder="e.g. ABC123"
              value={form.inviteCode}
              onChange={set('inviteCode')}
              onBlur={() => touch('inviteCode')}
              className={`border-[var(--border-color)] font-mono tracking-widest uppercase ${touched.inviteCode && liveErrors.inviteCode ? 'border-red-400' : ''}`}
              maxLength={20}
            />
            <p className="text-xs text-[var(--muted)]">
              Your ISMS Owner will share this code with you via email or message.
            </p>
            <FieldError msg={(touched.inviteCode && liveErrors.inviteCode) ? liveErrors.inviteCode : ''} />
          </div>

          {/* Full name */}
          <div className="space-y-1">
            <Label htmlFor="inv-name">Your full name</Label>
            <Input
              id="inv-name"
              placeholder="e.g. Kudzai Mlambo"
              value={form.name}
              onChange={set('name')}
              onBlur={() => touch('name')}
              className={`border-[var(--border-color)] ${touched.name && liveErrors.name ? 'border-red-400' : ''}`}
            />
            <FieldError msg={(touched.name && liveErrors.name) ? liveErrors.name : ''} />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <Label htmlFor="inv-password">Create a password</Label>
            <div className="relative">
              <Input
                id="inv-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.password}
                onChange={set('password')}
                onBlur={() => touch('password')}
                className={`border-[var(--border-color)] pr-10 ${touched.password && liveErrors.password ? 'border-red-400' : ''}`}
              />
              <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text-color)]">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.password && (
              <>
                <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden mt-1">
                  <div className={`h-full transition-all ${strength.color}`} style={{ width: `${strength.score}%` }} />
                </div>
                <p className="text-xs text-[var(--muted)]">Strength: {strength.label}</p>
              </>
            )}
            <FieldError msg={(touched.password && liveErrors.password) ? liveErrors.password : ''} />
          </div>

          {/* Confirm password */}
          <div className="space-y-1">
            <Label htmlFor="inv-confirm">Confirm password</Label>
            <div className="relative">
              <Input
                id="inv-confirm"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                onBlur={() => touch('confirmPassword')}
                className={`border-[var(--border-color)] pr-10 ${touched.confirmPassword && liveErrors.confirmPassword ? 'border-red-400' : ''}`}
              />
              <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text-color)]">
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <FieldError msg={(touched.confirmPassword && liveErrors.confirmPassword) ? liveErrors.confirmPassword : ''} />
          </div>

          {errors.form && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{errors.form}</p>
            </div>
          )}

          <Button type="submit" className="w-full bg-[var(--navy)] hover:bg-[var(--navy)]/90" disabled={loading}>
            {loading ? 'Activating account…' : 'Activate Account & Join'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
