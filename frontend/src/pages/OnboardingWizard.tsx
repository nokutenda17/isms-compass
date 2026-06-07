/**
 * OnboardingWizard — 5-step guided setup for newly registered organisations.
 *
 * Steps (per spec):
 *   1. Organisation Profile (pre-filled from registration)
 *   2. Scope Selection
 *   3. Risk Appetite
 *   4. Team Setup (optional invite)
 *   5. Launch (review & confirm)
 *
 * Data is saved to the backend on Launch. The user is directed to /dashboard.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Check, ArrowRight, ArrowLeft, Rocket, Building2,
  Target, BarChart2, Users, Send, AlertCircle, Loader2,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */
type StepNum = 1 | 2 | 3 | 4 | 5;

interface WizardData {
  // Step 1 — org profile
  orgName: string;
  city: string;
  sector: string;
  size: string;
  address: string;
  // Step 2 — scope
  scope: string[];
  // Step 3 — risk appetite
  riskAppetite: 'Low' | 'Standard' | 'High';
  // Step 4 — team (invites, optional)
  invites: { email: string; role: string }[];
}

const SCOPE_OPTIONS = [
  { id: 'customer_data',    label: 'Customer & client data' },
  { id: 'employee_data',    label: 'Employee personal data' },
  { id: 'financial',        label: 'Financial records & systems' },
  { id: 'cloud_saas',       label: 'Cloud services & SaaS' },
  { id: 'physical_devices', label: 'Physical devices & hardware' },
  { id: 'network',          label: 'Network infrastructure' },
  { id: 'email_comms',      label: 'Email & communications' },
  { id: 'erp',              label: 'ERP / Business systems' },
  { id: 'mobile',           label: 'Mobile devices' },
  { id: 'physical_access',  label: 'Physical premises & access' },
];

const RISK_OPTIONS = [
  {
    value: 'Low' as const,
    label: 'Low Risk Appetite',
    description: 'Strict controls. Prioritise security over agility. Suitable for regulated industries (finance, healthcare).',
    color: 'border-green-400 bg-green-50',
    dot: 'bg-green-500',
  },
  {
    value: 'Standard' as const,
    label: 'Standard Risk Appetite',
    description: 'Balanced approach. Accept low risks, treat medium and high risks cost-effectively. Recommended for most SMEs.',
    color: 'border-[var(--blue)] bg-[var(--light-blue)]',
    dot: 'bg-[var(--blue)]',
  },
  {
    value: 'High' as const,
    label: 'High Risk Appetite',
    description: 'Flexible controls. Accept more risk to maintain business speed. Document and monitor accepted risks carefully.',
    color: 'border-amber-400 bg-amber-50',
    dot: 'bg-amber-500',
  },
];

const ROLES = ['Contributor', 'Reviewer', 'Auditor'];

const STEPS = [
  { number: 1 as StepNum, icon: Building2, title: 'Organisation Profile',  short: 'Profile'  },
  { number: 2 as StepNum, icon: Target,    title: 'Scope Selection',        short: 'Scope'    },
  { number: 3 as StepNum, icon: BarChart2, title: 'Risk Appetite',          short: 'Risk'     },
  { number: 4 as StepNum, icon: Users,     title: 'Team Setup',             short: 'Team'     },
  { number: 5 as StepNum, icon: Rocket,    title: 'Launch',                 short: 'Launch'   },
];

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{msg}</p>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */
export function OnboardingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<StepNum>(1);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [data, setData] = useState<WizardData>({
    // Pre-fill from logged-in user/org context
    orgName:      user?.orgName   || '',
    city:         user?.city      || '',
    sector:       user?.orgSector || '',
    size:         user?.orgSize   || '',
    address:      '',
    scope:        [],
    riskAppetite: 'Standard',
    invites:      [{ email: '', role: 'Contributor' }],
  });

  /* ── Helpers ─────────────────────────────────────────────────────────── */
  const set = <K extends keyof WizardData>(field: K, value: WizardData[K]) =>
    setData(d => ({ ...d, [field]: value }));

  const toggleScope = (id: string) =>
    set('scope', data.scope.includes(id)
      ? data.scope.filter(s => s !== id)
      : [...data.scope, id]);

  const touch = (...fields: string[]) =>
    setTouched(t => ({ ...t, ...Object.fromEntries(fields.map(f => [f, true])) }));

  /* ── Per-step validation ─────────────────────────────────────────────── */
  const step1Errors = () => {
    const e: Record<string, string> = {};
    if (!data.orgName.trim()) e.orgName = 'Organisation name is required';
    if (!data.city.trim())    e.city    = 'City / region is required';
    if (!data.sector)         e.sector  = 'Please select a sector';
    if (!data.size)           e.size    = 'Please select organisation size';
    return e;
  };

  const step2Errors = () => {
    const e: Record<string, string> = {};
    if (data.scope.length === 0) e.scope = 'Select at least one item in scope';
    return e;
  };

  const currentErrors = (): Record<string, string> => {
    if (step === 1) return step1Errors();
    if (step === 2) return step2Errors();
    return {};
  };

  const liveErrors = Object.keys(touched).length > 0 ? currentErrors() : {};

  /* ── Navigation ──────────────────────────────────────────────────────── */
  const touchAllStep = () => {
    if (step === 1) touch('orgName', 'city', 'sector', 'size');
    if (step === 2) touch('scope');
  };

  const handleNext = () => {
    touchAllStep();
    const errs = currentErrors();
    if (Object.keys(errs).length > 0) return;
    setTouched({});
    if (step < 5) setStep((step + 1) as StepNum);
  };

  const handleBack = () => {
    setTouched({});
    if (step > 1) setStep((step - 1) as StepNum);
  };

  /* ── Launch (save + redirect) ────────────────────────────────────────── */
  const handleLaunch = async () => {
    setSaving(true);
    try {
      // Save org profile (scope + risk appetite) to backend
      await apiFetch('/organisations', {
        method: 'POST',
        body: JSON.stringify({
          name:         data.orgName,
          city:         data.city,
          sector:       data.sector,
          size:         data.size,
          address:      data.address,
          riskAppetite: data.riskAppetite,
          scope:        data.scope,
        }),
      });

      // Send any invites (ignore errors — invites are optional)
      const validInvites = data.invites.filter(i => i.email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email.trim()));
      for (const invite of validInvites) {
        try {
          await apiFetch('/users/invite', {
            method: 'POST',
            body: JSON.stringify({ email: invite.email.trim(), role: invite.role }),
          });
        } catch {
          // Non-fatal
        }
      }

      toast({
        title: '🎉 Setup complete!',
        description: `Welcome to ISMS Compass, ${data.orgName}. Your dashboard is ready.`,
      });
      navigate('/dashboard');
    } catch (err) {
      toast({
        title: 'Setup failed',
        description: err instanceof Error ? err.message : 'Could not save organisation profile.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[var(--page-bg)] flex flex-col items-center justify-center p-4 py-10">
      <div className="max-w-2xl w-full space-y-6">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-[var(--navy)] mb-1">ISMS Compass Setup</h1>
          <p className="text-[var(--muted)]">Complete all five steps to configure your ISMS and start your ISO 27001 journey</p>
        </div>

        {/* Step progress bar */}
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div key={s.number} className="flex items-center flex-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                s.number < step  ? 'bg-green-500 text-white' :
                s.number === step ? 'bg-[var(--navy)] text-white ring-4 ring-[var(--navy)]/20' :
                                    'bg-gray-200 text-gray-500'
              }`}>
                {s.number < step ? <Check className="w-4 h-4" /> : <s.icon className="w-4 h-4" />}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-1 mx-1 rounded-full transition-all ${s.number < step ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step labels (hidden on small screens) */}
        <div className="hidden sm:flex justify-between px-1">
          {STEPS.map(s => (
            <span key={s.number} className={`text-xs font-medium text-center flex-1 ${
              s.number === step ? 'text-[var(--navy)]' :
              s.number < step   ? 'text-green-600'    : 'text-gray-400'
            }`}>{s.short}</span>
          ))}
        </div>

        {/* Card */}
        <Card className="border-[var(--border-color)] shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              {(() => { const S = STEPS[step - 1]; return <S.icon className="w-5 h-5 text-[var(--navy)]" />; })()}
              <div>
                <CardTitle>{STEPS[step - 1].title}</CardTitle>
                <CardDescription>Step {step} of {STEPS.length}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            {/* ──── STEP 1: Organisation Profile ──────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="ob-orgName">Organisation Name</Label>
                  <Input
                    id="ob-orgName"
                    placeholder="e.g. SafeRoute Logistics (Pvt) Ltd"
                    value={data.orgName}
                    onChange={e => set('orgName', e.target.value)}
                    onBlur={() => touch('orgName')}
                    className={`border-[var(--border-color)] ${touched.orgName && liveErrors.orgName ? 'border-red-400' : ''}`}
                  />
                  <FieldError msg={touched.orgName ? liveErrors.orgName : undefined} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ob-city">City / Region</Label>
                  <Input
                    id="ob-city"
                    placeholder="e.g. Harare"
                    value={data.city}
                    onChange={e => set('city', e.target.value)}
                    onBlur={() => touch('city')}
                    className={`border-[var(--border-color)] ${touched.city && liveErrors.city ? 'border-red-400' : ''}`}
                  />
                  <FieldError msg={touched.city ? liveErrors.city : undefined} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Business Sector</Label>
                    <Select value={data.sector} onValueChange={v => { set('sector', v); touch('sector'); }}>
                      <SelectTrigger id="ob-sector" className={`border-[var(--border-color)] ${touched.sector && liveErrors.sector ? 'border-red-400' : ''}`}>
                        <SelectValue placeholder="Select sector" />
                      </SelectTrigger>
                      <SelectContent>
                        {['Logistics','Financial Services','Healthcare','Manufacturing','Retail','Technology','Education','Government','NGO / Non-Profit','Other'].map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError msg={touched.sector ? liveErrors.sector : undefined} />
                  </div>

                  <div className="space-y-1">
                    <Label>Number of Employees</Label>
                    <Select value={data.size} onValueChange={v => { set('size', v); touch('size'); }}>
                      <SelectTrigger id="ob-size" className={`border-[var(--border-color)] ${touched.size && liveErrors.size ? 'border-red-400' : ''}`}>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {['1-10','11-25','26-50','51-100','100+'].map(s => (
                          <SelectItem key={s} value={s}>{s} employees</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldError msg={touched.size ? liveErrors.size : undefined} />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ob-address">Office Address <span className="text-[var(--muted)] font-normal">(optional)</span></Label>
                  <Input
                    id="ob-address"
                    placeholder="e.g. 45 Samora Machel Ave, Harare CBD"
                    value={data.address}
                    onChange={e => set('address', e.target.value)}
                    className="border-[var(--border-color)]"
                  />
                </div>
              </div>
            )}

            {/* ──── STEP 2: Scope Selection ────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-[var(--muted)]">
                  Select all information systems, data types, and assets that fall within your ISMS scope. You can refine this later.
                </p>
                {touched.scope && liveErrors.scope && (
                  <FieldError msg={liveErrors.scope} />
                )}
                <div className="grid grid-cols-1 gap-2">
                  {SCOPE_OPTIONS.map(opt => (
                    <label
                      key={opt.id}
                      htmlFor={`scope-${opt.id}`}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                        data.scope.includes(opt.id)
                          ? 'border-[var(--blue)] bg-[var(--light-blue)]'
                          : 'border-[var(--border-color)] hover:bg-gray-50'
                      }`}
                    >
                      <Checkbox
                        id={`scope-${opt.id}`}
                        checked={data.scope.includes(opt.id)}
                        onCheckedChange={() => { toggleScope(opt.id); touch('scope'); }}
                      />
                      <span className="text-sm font-medium text-[var(--text-color)]">{opt.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-[var(--muted)] mt-2">
                  {data.scope.length === 0
                    ? 'No items selected yet'
                    : `${data.scope.length} item${data.scope.length > 1 ? 's' : ''} selected`}
                </p>
              </div>
            )}

            {/* ──── STEP 3: Risk Appetite ──────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-3">
                <p className="text-sm text-[var(--muted)]">
                  Your risk appetite defines how your organisation balances security controls against business agility.
                  This influences which controls are prioritised in your risk treatment plan.
                </p>
                <RadioGroup
                  value={data.riskAppetite}
                  onValueChange={v => set('riskAppetite', v as WizardData['riskAppetite'])}
                  className="space-y-3"
                >
                  {RISK_OPTIONS.map(opt => (
                    <label
                      key={opt.value}
                      htmlFor={`risk-${opt.value}`}
                      className={`flex items-start gap-4 p-4 border-2 rounded-xl cursor-pointer transition-all ${
                        data.riskAppetite === opt.value ? opt.color : 'border-[var(--border-color)] hover:bg-gray-50'
                      }`}
                    >
                      <RadioGroupItem value={opt.value} id={`risk-${opt.value}`} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 font-semibold text-[var(--text-color)]">
                          <span className={`w-2 h-2 rounded-full ${opt.dot}`} />
                          {opt.label}
                        </div>
                        <p className="text-sm text-[var(--muted)] mt-1">{opt.description}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {/* ──── STEP 4: Team Setup ─────────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-4">
                <p className="text-sm text-[var(--muted)]">
                  Invite team members to collaborate on your ISMS. They will receive an email with an invite code
                  to set up their account. You can also skip this step and invite people later from <strong>User Management</strong>.
                </p>

                <div className="space-y-3">
                  {data.invites.map((invite, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label htmlFor={`inv-email-${idx}`}>
                          {idx === 0 ? 'Email address' : ''}
                        </Label>
                        <Input
                          id={`inv-email-${idx}`}
                          type="email"
                          placeholder="colleague@company.co.zw"
                          value={invite.email}
                          onChange={e => {
                            const invites = [...data.invites];
                            invites[idx] = { ...invites[idx], email: e.target.value };
                            set('invites', invites);
                          }}
                          className="border-[var(--border-color)]"
                        />
                      </div>
                      <div className="w-36 space-y-1">
                        <Label>{idx === 0 ? 'Role' : ''}</Label>
                        <Select
                          value={invite.role}
                          onValueChange={v => {
                            const invites = [...data.invites];
                            invites[idx] = { ...invites[idx], role: v };
                            set('invites', invites);
                          }}
                        >
                          <SelectTrigger className="border-[var(--border-color)]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {data.invites.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => set('invites', data.invites.filter((_, i) => i !== idx))}
                          className="text-red-500 hover:text-red-700 mb-0.5"
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => set('invites', [...data.invites, { email: '', role: 'Contributor' }])}
                  className="border-[var(--border-color)]"
                >
                  + Add another
                </Button>

                <div className="p-3 bg-[var(--light-blue)] rounded-lg">
                  <p className="text-xs text-[var(--navy)]">
                    <strong>Role guide:</strong> Contributors can fill in step data. Reviewers can add feedback.
                    Auditors have read-only access for audit purposes.
                  </p>
                </div>
              </div>
            )}

            {/* ──── STEP 5: Launch (review & confirm) ─────────────────── */}
            {step === 5 && (
              <div className="space-y-4">
                <div className="p-5 bg-[var(--light-blue)] rounded-xl border border-[var(--border-color)] space-y-3">
                  <h3 className="font-semibold text-[var(--navy)] flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Organisation Summary
                  </h3>
                  {[
                    { label: 'Name',          value: data.orgName || '—' },
                    { label: 'Location',      value: data.city || '—' },
                    { label: 'Sector',        value: data.sector || '—' },
                    { label: 'Size',          value: data.size ? `${data.size} employees` : '—' },
                    { label: 'Risk Appetite', value: data.riskAppetite },
                    { label: 'Scope Items',   value: `${data.scope.length} selected` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between items-center text-sm border-b border-[var(--border-color)] pb-2 last:border-0 last:pb-0">
                      <span className="font-medium text-[var(--navy)]">{label}:</span>
                      <span className="text-[var(--text-color)]">{value}</span>
                    </div>
                  ))}
                </div>

                {data.invites.filter(i => i.email.trim()).length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-[var(--border-color)] space-y-2">
                    <h3 className="font-semibold text-[var(--navy)] flex items-center gap-2 text-sm">
                      <Send className="w-4 h-4" /> Team Invites to Send
                    </h3>
                    {data.invites.filter(i => i.email.trim()).map((inv, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-[var(--text-color)]">{inv.email}</span>
                        <span className="text-[var(--muted)]">{inv.role}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 border border-green-200 bg-green-50 rounded-xl">
                  <p className="text-sm text-green-800">
                    <strong>You're all set!</strong> Click <em>Launch ISMS</em> to save your configuration
                    and go to your dashboard. You will start at Step 1 of the 10-step ISO 27001 implementation process.
                  </p>
                </div>
              </div>
            )}

            {/* ──── Navigation buttons ─────────────────────────────────── */}
            <div className="flex gap-3 pt-2">
              {step > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={saving}
                  className="border-[var(--border-color)]"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}

              {step < 5 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  className="flex-1 bg-[var(--navy)] hover:bg-[var(--navy)]/90"
                >
                  {step === 4 ? (
                    <><Check className="w-4 h-4 mr-2" /> Review & Confirm</>
                  ) : (
                    <>Continue <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void handleLaunch()}
                  disabled={saving}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  {saving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
                  ) : (
                    <><Rocket className="w-4 h-4 mr-2" /> Launch ISMS</>
                  )}
                </Button>
              )}
            </div>

            {/* Skip step 4 */}
            {step === 4 && (
              <button
                type="button"
                onClick={() => { setTouched({}); setStep(5); }}
                className="w-full text-center text-sm text-[var(--muted)] hover:text-[var(--text-color)] underline underline-offset-2 mt-1"
              >
                Skip for now — I'll invite team members later
              </button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
