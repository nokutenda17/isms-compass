import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Building2, User, Mail, Lock, Eye, EyeOff,
  CheckCircle2, ArrowRight, ArrowLeft, Shield,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const SECTORS = [
  'Logistics', 'Financial Services', 'Healthcare', 'Manufacturing',
  'Retail', 'Technology', 'Education', 'Government', 'NGO / Non-Profit', 'Other',
];
const SIZES = ['1-10', '11-25', '26-50', '51-100', '100+'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ── Password strength ───────────────────────────────────────────────── */
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

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-600 mt-1">{msg}</p>;
}

type StepNum = 1 | 2;

interface FormState {
  orgName: string;
  sector: string;
  city: string;
  size: string;
  ownerName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
}

const INITIAL_FORM: FormState = {
  orgName: '',
  sector: SECTORS[0],
  city: '',
  size: SIZES[1],
  ownerName: '',
  email: '',
  password: '',
  confirmPassword: '',
  agreedToTerms: false,
};

export function Register() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<StepNum>(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [touched, setTouched] = useState<Partial<Record<keyof FormState, boolean>>>({});
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const strength = useMemo(() => pwStrength(form.password), [form.password]);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  /* ── Email availability check ─────────────────────────────────────── */
  useEffect(() => {
    const email = form.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) { setEmailAvailable(null); return; }
    const t = setTimeout(async () => {
      setEmailChecking(true);
      try {
        const res = await fetch(`${API_BASE}/register/check-email?email=${encodeURIComponent(email)}`);
        const data = await res.json() as { available: boolean };
        setEmailAvailable(Boolean(data.available));
      } catch { setEmailAvailable(null); }
      finally { setEmailChecking(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [form.email]);

  /* ── Validation ────────────────────────────────────────────────────── */
  const step1Errors = (): Partial<Record<keyof FormState, string>> => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.orgName.trim()) e.orgName = 'Organisation name is required';
    else if (form.orgName.trim().length < 2) e.orgName = 'Name must be at least 2 characters';
    if (!form.sector) e.sector = 'Please select a sector';
    if (!form.city.trim()) e.city = 'City / region is required';
    if (!form.size) e.size = 'Please select organisation size';
    return e;
  };

  const step2Errors = (): Partial<Record<keyof FormState, string>> => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.ownerName.trim()) e.ownerName = 'Your full name is required';
    else if (form.ownerName.trim().length < 2) e.ownerName = 'Name must be at least 2 characters';
    if (!form.email.trim()) e.email = 'Email address is required';
    else if (!EMAIL_RE.test(form.email.trim())) e.email = 'Please enter a valid email address';
    else if (emailAvailable === false) e.email = 'This email is already registered';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(form.password)) e.password = 'Must contain at least one uppercase letter';
    else if (!/\d/.test(form.password)) e.password = 'Must contain at least one number';
    if (!form.confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (form.confirmPassword !== form.password) e.confirmPassword = 'Passwords do not match';
    if (!form.agreedToTerms) e.agreedToTerms = 'You must agree to the Terms of Use to continue';
    return e;
  };

  const touch = (...fields: (keyof FormState)[]) =>
    setTouched(t => ({ ...t, ...Object.fromEntries(fields.map(f => [f, true])) }));

  const set = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm(f => ({ ...f, [field]: value }));

  /* ── Step 1: continue ─────────────────────────────────────────────── */
  const handleContinue = () => {
    touch('orgName', 'sector', 'city', 'size');
    const errs = step1Errors();
    if (Object.keys(errs).length > 0) return;
    setStep(2);
  };

  /* ── Step 2: submit ───────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    touch('ownerName', 'email', 'password', 'confirmPassword', 'agreedToTerms');
    const errs = step2Errors();
    if (Object.keys(errs).length > 0) return;
    if (emailChecking) return; // wait for check

    setServerError('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName: form.orgName.trim(),
          sector: form.sector,
          city: form.city.trim(),
          size: form.size,
          ownerName: form.ownerName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          confirmPassword: form.confirmPassword,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      // Auto-login so the user is authenticated before hitting /onboarding
      await login(form.email.trim().toLowerCase(), form.password);
      toast({ title: 'Account created!', description: `Welcome to ISMS Compass. Let's set up ${form.orgName.trim()}.` });
      navigate('/onboarding');
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  /* ── Derived live errors for touched fields ───────────────────────── */
  const liveStep1 = Object.keys(touched).length ? step1Errors() : {};
  const liveStep2 = Object.keys(touched).length ? step2Errors() : {};

  const step1Valid = Object.keys(step1Errors()).length === 0;

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="flex-1 bg-[var(--navy)] hidden md:flex flex-col justify-center items-center p-12 text-white">
        <div className="max-w-md space-y-8">
          <div>
            <h1 className="text-4xl font-extrabold mb-4">ISMS Compass</h1>
            <p className="text-white/80 text-lg">
              Create your organisation and start your ISO 27001 implementation journey.
            </p>
          </div>

          {/* Step indicator */}
          <div className="space-y-4">
            {[
              { n: 1, icon: Building2, title: 'Organisation Details', body: 'Name, sector, location, and size' },
              { n: 2, icon: User,      title: 'Owner Account',        body: 'Your name, email, and password' },
              { n: 3, icon: Shield,    title: 'Onboarding Wizard',    body: '5-step guided setup of your ISMS' },
            ].map(({ n, icon: Icon, title, body }) => (
              <div key={n} className={`flex items-start gap-3 p-4 rounded-lg transition-all ${
                n === step ? 'bg-white/20' : n < step ? 'bg-white/10 opacity-70' : 'bg-white/5 opacity-40'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  n < step ? 'bg-green-500' : n === step ? 'bg-white text-[var(--navy)]' : 'bg-white/20'
                }`}>
                  {n < step ? <CheckCircle2 className="w-4 h-4" /> : n}
                </div>
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    <Icon className="w-4 h-4" /> {title}
                  </div>
                  <div className="text-sm text-white/70 mt-0.5">{body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 bg-white flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <Card className="border-[var(--border-color)]">
            <CardHeader>
              <div className="flex items-center gap-2 text-xs text-[var(--muted)] mb-1 font-medium uppercase tracking-wide">
                <span className={step === 1 ? 'text-[var(--navy)] font-bold' : ''}>Step 1</span>
                <span>→</span>
                <span className={step === 2 ? 'text-[var(--navy)] font-bold' : ''}>Step 2</span>
                <span>→</span>
                <span>Onboarding</span>
              </div>
              <CardTitle>
                {step === 1 ? 'Register Your Organisation' : 'Create Your Owner Account'}
              </CardTitle>
              <CardDescription>
                {step === 1
                  ? 'Tell us about your organisation — name, sector and location.'
                  : 'Enter your details. You will be the ISMS Owner for this organisation.'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {step === 1 ? (
                /* ── STEP 1 ────────────────────────────────────────── */
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="reg-orgName">
                      <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> Organisation Name</span>
                    </Label>
                    <Input
                      id="reg-orgName"
                      placeholder="e.g. SafeRoute Logistics (Pvt) Ltd"
                      value={form.orgName}
                      onChange={e => set('orgName', e.target.value)}
                      onBlur={() => touch('orgName')}
                      className={`border-[var(--border-color)] ${touched.orgName && liveStep1.orgName ? 'border-red-400' : ''}`}
                    />
                    <FieldError msg={touched.orgName ? liveStep1.orgName : undefined} />
                  </div>

                  <div className="space-y-1">
                    <Label>Business Sector</Label>
                    <Select
                      value={form.sector}
                      onValueChange={v => { set('sector', v); touch('sector'); }}
                    >
                      <SelectTrigger id="reg-sector" className={`border-[var(--border-color)] ${touched.sector && liveStep1.sector ? 'border-red-400' : ''}`}>
                        <SelectValue placeholder="Select a sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTORS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FieldError msg={touched.sector ? liveStep1.sector : undefined} />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="reg-city">City / Region</Label>
                    <Input
                      id="reg-city"
                      placeholder="e.g. Harare"
                      value={form.city}
                      onChange={e => set('city', e.target.value)}
                      onBlur={() => touch('city')}
                      className={`border-[var(--border-color)] ${touched.city && liveStep1.city ? 'border-red-400' : ''}`}
                    />
                    <FieldError msg={touched.city ? liveStep1.city : undefined} />
                  </div>

                  <div className="space-y-1">
                    <Label>Number of Employees</Label>
                    <Select
                      value={form.size}
                      onValueChange={v => { set('size', v); touch('size'); }}
                    >
                      <SelectTrigger id="reg-size" className={`border-[var(--border-color)] ${touched.size && liveStep1.size ? 'border-red-400' : ''}`}>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {SIZES.map(s => <SelectItem key={s} value={s}>{s} employees</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FieldError msg={touched.size ? liveStep1.size : undefined} />
                  </div>

                  <Button
                    type="button"
                    onClick={handleContinue}
                    className="w-full bg-[var(--navy)] hover:bg-[var(--navy)]/90 mt-2"
                  >
                    Continue <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>

                  <p className="text-center text-sm text-[var(--muted)]">
                    Already registered?{' '}
                    <Link to="/login" className="text-[var(--navy)] underline underline-offset-2">Sign in</Link>
                  </p>
                </div>
              ) : (
                /* ── STEP 2 ────────────────────────────────────────── */
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="reg-ownerName">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> Your Full Name</span>
                    </Label>
                    <Input
                      id="reg-ownerName"
                      placeholder="e.g. Tinashe Moyo"
                      value={form.ownerName}
                      onChange={e => set('ownerName', e.target.value)}
                      onBlur={() => touch('ownerName')}
                      className={`border-[var(--border-color)] ${touched.ownerName && liveStep2.ownerName ? 'border-red-400' : ''}`}
                    />
                    <FieldError msg={touched.ownerName ? liveStep2.ownerName : undefined} />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="reg-email">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> Work Email Address</span>
                    </Label>
                    <Input
                      id="reg-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.co.zw"
                      value={form.email}
                      onChange={e => set('email', e.target.value)}
                      onBlur={() => touch('email')}
                      className={`border-[var(--border-color)] ${touched.email && liveStep2.email ? 'border-red-400' : ''}`}
                    />
                    <p className="text-xs">
                      {emailChecking
                        ? <span className="text-[var(--muted)]">Checking availability…</span>
                        : emailAvailable === true
                          ? <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Email is available</span>
                          : emailAvailable === false
                            ? <span className="text-red-600">Email is already registered</span>
                            : null}
                    </p>
                    <FieldError msg={touched.email ? liveStep2.email : undefined} />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="reg-password">
                      <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> Password</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="reg-password"
                        type={showPw ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={form.password}
                        onChange={e => set('password', e.target.value)}
                        onBlur={() => touch('password')}
                        className={`border-[var(--border-color)] pr-10 ${touched.password && liveStep2.password ? 'border-red-400' : ''}`}
                      />
                      <button type="button" tabIndex={-1} onClick={() => setShowPw(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text-color)]">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.password && (
                      <>
                        <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
                          <div className={`h-full transition-all ${strength.color}`} style={{ width: `${strength.score}%` }} />
                        </div>
                        <p className="text-xs text-[var(--muted)]">
                          Strength: <span className="font-medium">{strength.label}</span>
                          {strength.label !== 'Strong' && ' — use uppercase, numbers & symbols'}
                        </p>
                      </>
                    )}
                    <FieldError msg={touched.password ? liveStep2.password : undefined} />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="reg-confirm">Confirm Password</Label>
                    <div className="relative">
                      <Input
                        id="reg-confirm"
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={form.confirmPassword}
                        onChange={e => set('confirmPassword', e.target.value)}
                        onBlur={() => touch('confirmPassword')}
                        className={`border-[var(--border-color)] pr-10 ${touched.confirmPassword && liveStep2.confirmPassword ? 'border-red-400' : ''}`}
                      />
                      <button type="button" tabIndex={-1} onClick={() => setShowConfirm(v => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text-color)]">
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {form.confirmPassword && form.confirmPassword === form.password && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Passwords match
                      </p>
                    )}
                    <FieldError msg={touched.confirmPassword ? liveStep2.confirmPassword : undefined} />
                  </div>

                  {/* Terms of Use */}
                  <div className={`p-3 rounded-lg border ${touched.agreedToTerms && liveStep2.agreedToTerms ? 'border-red-300 bg-red-50' : 'border-[var(--border-color)] bg-gray-50'}`}>
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="reg-terms"
                        checked={form.agreedToTerms}
                        onCheckedChange={checked => { set('agreedToTerms', Boolean(checked)); touch('agreedToTerms'); }}
                        className="mt-0.5"
                      />
                      <Label htmlFor="reg-terms" className="text-sm font-normal cursor-pointer leading-relaxed">
                        I agree to the{' '}
                        <a href="#" className="text-[var(--navy)] underline underline-offset-2">Terms of Use</a>{' '}
                        and{' '}
                        <a href="#" className="text-[var(--navy)] underline underline-offset-2">Privacy Policy</a>.
                        I confirm I am authorised to register this organisation.
                      </Label>
                    </div>
                    <FieldError msg={touched.agreedToTerms ? liveStep2.agreedToTerms : undefined} />
                  </div>

                  {serverError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-700">{serverError}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="border-[var(--border-color)]">
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-[var(--navy)] hover:bg-[var(--navy)]/90"
                      disabled={loading || emailAvailable === false || emailChecking}
                    >
                      {loading ? 'Creating account…' : (
                        <><CheckCircle2 className="w-4 h-4 mr-2" />Create Organisation & Continue</>
                      )}
                    </Button>
                  </div>

                  <p className="text-center text-sm text-[var(--muted)]">
                    Already have an account?{' '}
                    <Link to="/login" className="text-[var(--navy)] underline underline-offset-2">Sign in</Link>
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
