import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useAIEngine } from '@/hooks/useAIEngine';
import { useAuth } from '@/contexts/AuthContext';
import { apiFetch } from '@/lib/api';
import {
  ChevronDown, Save, Sparkles, ArrowLeft, ArrowRight,
  CheckCircle, Lock, Clock, AlertCircle, Plus, Trash2,
  Loader2, FileText, Users, Shield, BookOpen, Activity,
  ClipboardList, Award, Settings, BarChart2, TriangleAlert as AlertTriangle,
} from 'lucide-react';

const STEP_META: Record<number, { title: string; clause: string; icon: React.ElementType; why: string; guidance: string }> = {
  1: { title: 'Organisational Context & Scope', clause: 'ISO 27001:2022 Clause 4', icon: BookOpen, why: 'Scope defines what you\'re protecting. Without a clear boundary, you can\'t know what to secure or what\'s out of scope.', guidance: 'Identify the departments, locations, systems and services included in your ISMS. Your scope should be specific enough to be auditable but realistic for your organisation size.' },
  2: { title: 'Leadership & Policy', clause: 'ISO 27001:2022 Clause 5', icon: FileText, why: 'Management commitment in writing demonstrates that security is a business priority, not just an IT concern.', guidance: 'Write a high-level policy statement signed by leadership. It should cover objectives, responsibilities, and commitment to continual improvement.' },
  3: { title: 'Risk Assessment Planning', clause: 'ISO 27001:2022 Clause 6', icon: BarChart2, why: 'A documented methodology ensures risks are assessed consistently and results are repeatable and defensible to auditors.', guidance: 'Define how you will identify, analyse and evaluate risks. Choose a scoring matrix (3×3, 4×4 or 5×5) and document your likelihood and impact criteria.' },
  4: { title: 'Asset Inventory & Risk Assessment', clause: 'ISO 27001:2022 Clause 6.1', icon: ClipboardList, why: 'You can\'t protect what you don\'t know exists. An asset inventory is the foundation of every risk assessment.', guidance: 'List all information assets: hardware, software, data, people and facilities. For each, identify threats and vulnerabilities then score likelihood × impact.' },
  5: { title: 'Risk Treatment & Controls', clause: 'ISO 27001:2022 Clause 6.2', icon: Shield, why: 'Identifying risks without deciding how to address them achieves nothing. Treatment decisions must be documented and approved.', guidance: 'For each risk, select a treatment option: Mitigate, Accept, Transfer, or Avoid. Document the specific control or action for each.' },
  6: { title: 'Support (Resources, Competence, Communication, Documentation)', clause: 'ISO 27001:2022 Clause 7', icon: Award, why: 'The SoA is a mandatory certification document. It shows auditors exactly which of the 93 Annex A controls you\'ve selected and why.', guidance: 'Review all 93 Annex A controls. Mark each as applicable or not-applicable with a written justification.' },
  7: { title: 'Operational Planning & Implementation', clause: 'ISO 27001:2022 Clause 8', icon: Users, why: 'Unassigned responsibilities create gaps. Every security function must have a named owner who is accountable.', guidance: 'Define roles: ISMS Owner, Data Protection Officer, System Administrators, and any others relevant to your org.' },
  8: { title: 'Performance Evaluation & Internal Audit', clause: 'ISO 27001:2022 Clause 9', icon: BookOpen, why: 'Most security incidents involve human error. A trained workforce is your first line of defence.', guidance: 'Design a training programme covering: phishing awareness, password policy, data handling, incident reporting, and physical security.' },
  9: { title: 'Improvement & Corrective Action', clause: 'ISO 27001:2022 Clause 10', icon: Settings, why: 'Controls are only effective if people know how to operate them. Documented procedures ensure consistency and enable audit.', guidance: 'Write procedures for: access management, change control, incident response, backups, and any other controls implemented.' },
  10: { title: 'Statement of Applicability Review', clause: 'ISO 27001:2022 Annex A', icon: Activity, why: 'Certification is not the finish line — it\'s the start. Continual improvement is a core requirement of ISO 27001.', guidance: 'Establish regular management reviews, internal audit schedule, KPI tracking, and a process for handling nonconformities.' },
};

// ── AI Draft Area ─────────────────────────────────────────────────────────────
function AIDraftArea({ stepNumber, context }: { stepNumber: number; context: string }) {
  const { sendPrompt, isLoading } = useAIEngine();
  const [draft, setDraft] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'draft' | 'approved'>('idle');
  const { user } = useAuth();

  const generate = async () => {
    setStatus('loading');
    setDraft('');
    const prompt = `You are an ISO 27001 compliance advisor for Zimbabwean SMEs. Write a concise, practical draft for Step ${stepNumber} (${STEP_META[stepNumber].title}) of an ISMS implementation. Context: ${context}. Write in plain language suitable for a non-technical business owner. Keep it under 300 words.`;
    const result = await sendPrompt(
      prompt,
      { step: stepNumber, org: user?.orgName },
      { onToken: (_token, fullText) => setDraft(fullText) }
    );
    setDraft(result);
    setStatus('draft');
  };

  if (status === 'idle') return (
    <Button onClick={generate} className="bg-[#6A1B9A] hover:bg-[#6A1B9A]/90 text-white">
      <Sparkles className="w-4 h-4 mr-2" />Generate AI Draft
    </Button>
  );

  if (status === 'loading') return (
    <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
      <div className="flex items-center gap-2 text-purple-700 mb-3">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm font-medium">AI is generating your draft…</span>
      </div>
      <div className="space-y-2">
        {[1, 0.8, 0.7].map((w, i) => (
          <div key={i} className="h-3 bg-purple-200 rounded animate-pulse" style={{ width: `${w * 100}%` }} />
        ))}
      </div>
    </div>
  );

  if (status === 'approved') return (
    <div className="border-2 border-[#2C6E49] rounded-lg p-4 bg-green-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[#2C6E49] uppercase tracking-wide flex items-center gap-1">
          <CheckCircle className="w-3 h-3" /> Approved Draft
        </span>
        <span className="text-xs text-gray-500">by {user?.name}</span>
      </div>
      <p className="text-sm text-[#404040] whitespace-pre-wrap">{draft}</p>
    </div>
  );

  return (
    <div className="border-2 border-purple-300 rounded-lg bg-purple-50">
      <div className="flex items-center justify-between px-4 py-2 border-b border-purple-200">
        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> AI Draft — Requires Review
        </span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setStatus('idle')} className="h-7 text-xs border-purple-300 text-purple-700">Reject</Button>
          <Button size="sm" variant="outline" onClick={() => setStatus('idle')} className="h-7 text-xs border-purple-300 text-purple-700">Edit</Button>
          <Button size="sm" onClick={() => setStatus('approved')} className="h-7 text-xs bg-[#2C6E49] hover:bg-[#2C6E49]/90 text-white">Approve</Button>
        </div>
      </div>
      <div className="p-4"><p className="text-sm text-[#404040] whitespace-pre-wrap">{draft}</p></div>
    </div>
  );
}

// ── Step 1: ISMS Scope ────────────────────────────────────────────────────────
function Step1Form({ initialData = {}, onChange }: any) {
  const [scopeStatement, setScopeStatement] = useState(initialData.scopeStatement || '');
  const [departments, setDepartments] = useState(initialData.departments || ['']);
  const [locations, setLocations] = useState(initialData.locations || ['']);
  const [exclusions, setExclusions] = useState(initialData.exclusions || '');
  const [legalReqs, setLegalReqs] = useState(initialData.legalReqs || 'Zimbabwe Cyber and Data Protection Act (Chapter 12:07)');
  
  useEffect(() => {
    onChange?.({ scopeStatement, departments, locations, exclusions, legalReqs });
  }, [scopeStatement, departments, locations, exclusions, legalReqs, onChange]);

  const addDept = () => setDepartments([...departments, '']);
  const addLoc = () => setLocations([...locations, '']);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="scope">Scope Statement <span className="text-red-500">*</span></Label>
        <Textarea id="scope" value={scopeStatement} onChange={e => setScopeStatement(e.target.value)}
          placeholder='e.g. "The ISMS applies to information systems, processes and personnel supporting SafeRoute Logistics operations in Harare, including customer data, fleet management and financial records."'
          className="min-h-24 border-gray-200" />
        <p className="text-xs text-gray-500">A single clear paragraph describing what is in scope.</p>
      </div>
      <div className="space-y-2">
        <Label>Departments in Scope</Label>
        {departments.map((d, i) => (
          <div key={i} className="flex gap-2">
            <Input value={d} onChange={e => { const u = [...departments]; u[i] = e.target.value; setDepartments(u); }} placeholder="e.g. Finance, Operations, IT" className="border-gray-200" />
            {departments.length > 1 && <Button size="icon" variant="ghost" onClick={() => setDepartments(departments.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addDept} className="border-gray-200 text-[#2E75B6]"><Plus className="w-3 h-3 mr-1" />Add</Button>
      </div>
      <div className="space-y-2">
        <Label>Locations in Scope</Label>
        {locations.map((l, i) => (
          <div key={i} className="flex gap-2">
            <Input value={l} onChange={e => { const u = [...locations]; u[i] = e.target.value; setLocations(u); }} placeholder="e.g. Harare Head Office, Bulawayo Depot" className="border-gray-200" />
            {locations.length > 1 && <Button size="icon" variant="ghost" onClick={() => setLocations(locations.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></Button>}
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={addLoc} className="border-gray-200 text-[#2E75B6]"><Plus className="w-3 h-3 mr-1" />Add</Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="exclusions">Explicit Exclusions (optional)</Label>
        <Textarea id="exclusions" value={exclusions} onChange={e => setExclusions(e.target.value)} placeholder="List anything explicitly out of scope, and why." className="min-h-20 border-gray-200" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="legalReqs">Applicable Legal and Regulatory Requirements</Label>
        <Textarea id="legalReqs" value={legalReqs} onChange={e => setLegalReqs(e.target.value)} placeholder="List any legal or regulatory requirements that apply to your ISMS." className="min-h-20 border-gray-200" />
      </div>
      <AIDraftArea stepNumber={1} context={`Scope: ${scopeStatement}. Departments: ${departments.filter(Boolean).join(', ')}. Locations: ${locations.filter(Boolean).join(', ')}.`} />
    </div>
  );
}

// ── Step 2: Information Security Policy ──────────────────────────────────────
function Step2Form({ initialData = {}, onChange }: any) {
  const [policyText, setPolicyText] = useState(initialData.policyText || '');
  const [objectives, setObjectives] = useState(initialData.objectives || ['', '', '']);
  const [signedBy, setSignedBy] = useState(initialData.signedBy || '');
  const [reviewDate, setReviewDate] = useState(initialData.reviewDate || '');
  
  useEffect(() => {
    onChange?.({ policyText, objectives, signedBy, reviewDate });
  }, [policyText, objectives, signedBy, reviewDate, onChange]);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Security Objectives <span className="text-red-500">*</span></Label>
        <p className="text-xs text-gray-500">At least 3 measurable information security objectives.</p>
        {objectives.map((obj, i) => (
          <div key={i} className="flex gap-2 items-center">
            <div className="w-6 h-6 rounded-full bg-[#D6E4F0] text-[#1F3864] text-xs flex items-center justify-center font-bold flex-shrink-0">{i + 1}</div>
            <Input value={obj} onChange={e => { const u = [...objectives]; u[i] = e.target.value; setObjectives(u); }} placeholder={`Objective ${i + 1}`} className="border-gray-200" />
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setObjectives([...objectives, ''])} className="border-gray-200 text-[#2E75B6]"><Plus className="w-3 h-3 mr-1" />Add Objective</Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="policy">Policy Statement <span className="text-red-500">*</span></Label>
        <Textarea id="policy" value={policyText} onChange={e => setPolicyText(e.target.value)} placeholder="Write the formal policy statement here. Express management commitment to protecting information assets, define the approach to risk management, and state consequences of non-compliance." className="min-h-36 border-gray-200" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="signedBy">Approved By <span className="text-red-500">*</span></Label>
          <Input id="signedBy" value={signedBy} onChange={e => setSignedBy(e.target.value)} placeholder="e.g. CEO / Managing Director" className="border-gray-200" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reviewDate">Next Review Date</Label>
          <Input id="reviewDate" type="date" value={reviewDate} onChange={e => setReviewDate(e.target.value)} className="border-gray-200" />
        </div>
      </div>
      <AIDraftArea stepNumber={2} context={`Objectives: ${objectives.filter(Boolean).join('; ')}. Approved by: ${signedBy}.`} />
    </div>
  );
}

// ── Step 3: Risk Assessment Methodology ──────────────────────────────────────
function Step3Form({ initialData = {}, onChange }: any) {
  const [matrixSize, setMatrixSize] = useState(initialData.matrixSize || '4');
  const [acceptableRisk, setAcceptableRisk] = useState(initialData.acceptableRisk || 6);
  
  useEffect(() => {
    onChange?.({ matrixSize, acceptableRisk });
  }, [matrixSize, acceptableRisk, onChange]);

  const likelihoodLabels = ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost Certain'];
  const impactLabels = ['Negligible', 'Minor', 'Moderate', 'Major', 'Critical'];
  const n = parseInt(matrixSize);
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>Risk Matrix Size <span className="text-red-500">*</span></Label>
        <div className="grid grid-cols-3 gap-3">
          {[{ v: '3', l: '3×3', d: 'Simple — small teams' }, { v: '4', l: '4×4', d: 'Standard — recommended' }, { v: '5', l: '5×5', d: 'Comprehensive' }].map(({ v, l, d }) => (
            <div key={v} onClick={() => setMatrixSize(v)} className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${matrixSize === v ? 'border-[#2E75B6] bg-[#D6E4F0]' : 'border-gray-200 hover:border-[#BDD7EE]'}`}>
              <p className="font-bold text-[#1F3864] text-lg">{l}</p>
              <p className="text-xs text-gray-500">{d}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Likelihood Scale (1–{n})</Label>
          {Array.from({ length: n }, (_, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded bg-[#BDD7EE] text-[#1F3864] font-bold text-xs flex items-center justify-center">{i + 1}</div>
              <span className="text-[#404040]">{likelihoodLabels[i]}</span>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <Label>Impact Scale (1–{n})</Label>
          {Array.from({ length: n }, (_, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-6 h-6 rounded bg-[#BDD7EE] text-[#1F3864] font-bold text-xs flex items-center justify-center">{i + 1}</div>
              <span className="text-[#404040]">{impactLabels[i]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Label>Risk Acceptance Threshold: <span className="font-bold text-[#1F3864]">{acceptableRisk}</span></Label>
        <p className="text-xs text-gray-500">Risks scoring at or below this value are accepted without additional controls.</p>
        <Slider value={[acceptableRisk]} min={1} max={n * n} step={1} onValueChange={v => setAcceptableRisk(v[0])} className="w-full" />
        <div className="flex justify-between text-xs text-gray-400"><span>1 (Low)</span><span>{n * n} (Maximum)</span></div>
      </div>
      <AIDraftArea stepNumber={3} context={`${n}×${n} risk matrix. Acceptance threshold: ${acceptableRisk}. Max score: ${n * n}.`} />
    </div>
  );
}

// ── Step 4: Asset Inventory ───────────────────────────────────────────────────
function Step4Form({ initialData = {}, onChange }: any) {
  const [assets, setAssets] = useState(initialData.assets || [{ name: '', type: 'Data', owner: '', sensitivity: 'Medium' }]);
  
  useEffect(() => {
    onChange?.({ assets });
  }, [assets, onChange]);

  const types = ['Data', 'Hardware', 'Software', 'People', 'Facilities', 'Service'];
  const sensitivities = ['Low', 'Medium', 'High', 'Critical'];
  const update = (i: number, field: string, value: string) => { const u = [...assets]; (u[i] as Record<string, string>)[field] = value; setAssets(u); };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><Label>Asset Inventory <span className="text-red-500">*</span></Label><p className="text-xs text-gray-500 mt-0.5">List all information assets in scope.</p></div>
        <Button variant="outline" size="sm" onClick={() => setAssets([...assets, { name: '', type: 'Data', owner: '', sensitivity: 'Medium' }])} className="border-[#2E75B6] text-[#2E75B6]"><Plus className="w-3 h-3 mr-1" />Add Asset</Button>
      </div>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-12 bg-[#1F3864] px-3 py-2 text-xs font-semibold text-white">
          <div className="col-span-4">Asset Name</div><div className="col-span-2">Type</div><div className="col-span-3">Owner</div><div className="col-span-2">Sensitivity</div><div className="col-span-1" />
        </div>
        {assets.map((a, i) => (
          <div key={i} className={`grid grid-cols-12 gap-2 px-3 py-2 items-center ${i % 2 === 1 ? 'bg-[#F5F7FA]' : 'bg-white'}`}>
            <Input value={a.name} onChange={e => update(i, 'name', e.target.value)} placeholder="e.g. Customer database" className="col-span-4 border-gray-200 h-8 text-sm" />
            <Select value={a.type} onValueChange={v => update(i, 'type', v)}><SelectTrigger className="col-span-2 border-gray-200 h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            <Input value={a.owner} onChange={e => update(i, 'owner', e.target.value)} placeholder="Name / role" className="col-span-3 border-gray-200 h-8 text-sm" />
            <Select value={a.sensitivity} onValueChange={v => update(i, 'sensitivity', v)}><SelectTrigger className="col-span-2 border-gray-200 h-8 text-sm"><SelectValue /></SelectTrigger><SelectContent>{sensitivities.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            <Button size="icon" variant="ghost" onClick={() => setAssets(assets.filter((_, j) => j !== i))} className="col-span-1 text-gray-400 hover:text-red-600 h-8 w-8"><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        ))}
      </div>
      <div className="flex items-start gap-2 p-3 bg-[#D6E4F0] rounded-lg text-sm text-[#1F3864]">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>These assets will appear in the Risk Register as selectable options when adding new risks.</p>
      </div>
    </div>
  );
}

// ── Step 5: Risk Treatment Plan ───────────────────────────────────────────────
function Step5Form({ initialData = {}, onChange }: any) {
  const [treatments, setTreatments] = useState(initialData.treatments || [
    { id: 'R001', threat: 'Unauthorised access to customer data', treatment: 'Mitigate', control: '', owner: '', dueDate: '' },
    { id: 'R002', threat: 'Ransomware attack on file server', treatment: 'Mitigate', control: '', owner: '', dueDate: '' },
    { id: 'R003', threat: 'Phishing attacks on staff', treatment: 'Mitigate', control: '', owner: '', dueDate: '' },
  ]);
  
  useEffect(() => {
    onChange?.({ treatments });
  }, [treatments, onChange]);

  const update = (i: number, field: string, value: string) => { const u = [...treatments]; (u[i] as Record<string, string>)[field] = value; setTreatments(u); };
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 p-3 bg-[#D6E4F0] rounded-lg text-sm text-[#1F3864]">
        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>This plan is populated from your Risk Register. <span className="font-semibold underline cursor-pointer" onClick={() => window.location.href = '/risks'}>Visit the Risk Register</span> to add risks, then return here to document treatment decisions.</p>
      </div>
      {treatments.map((t, i) => (
        <Card key={i} className="border-gray-200">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div><Badge variant="outline" className="text-xs mb-1 border-gray-200">{t.id}</Badge><p className="text-sm font-semibold text-[#404040]">{t.threat}</p></div>
              <Select value={t.treatment} onValueChange={v => update(i, 'treatment', v)}>
                <SelectTrigger className="w-32 h-8 text-xs border-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent>{['Mitigate', 'Accept', 'Transfer', 'Avoid'].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <Textarea value={t.control} onChange={e => update(i, 'control', e.target.value)} placeholder="Describe the specific control or action..." className="min-h-16 text-sm border-gray-200" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Owner</Label><Input value={t.owner} onChange={e => update(i, 'owner', e.target.value)} placeholder="Name or role" className="h-8 text-sm border-gray-200" /></div>
              <div className="space-y-1"><Label className="text-xs">Target Date</Label><Input type="date" value={t.dueDate} onChange={e => update(i, 'dueDate', e.target.value)} className="h-8 text-sm border-gray-200" /></div>
            </div>
          </CardContent>
        </Card>
      ))}
      <AIDraftArea stepNumber={5} context={`${treatments.length} risks. Treatments: ${treatments.map(t => t.treatment).join(', ')}.`} />
    </div>
  );
}

// ── Step 6: Statement of Applicability ───────────────────────────────────────
function Step6Form({ initialData = {}, onChange }: any) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#404040]">The Statement of Applicability covers all 93 ISO 27001:2022 Annex A controls. The dedicated SoA screen provides the full workflow including AI-drafted justifications and approval tracking.</p>
      <div className="flex items-start gap-3 p-4 bg-[#D6E4F0] rounded-lg border border-[#BDD7EE]">
        <Award className="w-5 h-5 text-[#1F3864] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-[#1F3864]">Continue in Statement of Applicability</p>
          <p className="text-sm text-[#404040] mt-1">All 93 controls, category tabs, AI draft generation, bulk approval, and export are available there.</p>
          <Button className="mt-3 bg-[#2E75B6] hover:bg-[#2E75B6]/90 text-white" size="sm" onClick={() => window.location.href = '/soa'}>Open Statement of Applicability →</Button>
        </div>
      </div>
    </div>
  );
}

// ── Step 7: Roles & Responsibilities ─────────────────────────────────────────
function Step7Form({ initialData = {}, onChange }: any) {
  const defaultRoles = [
    { name: 'ISMS Owner', responsibilities: 'Overall accountability for the ISMS. Approves policies, signs off risk treatment decisions, conducts management reviews.' },
    { name: 'Data Protection Officer', responsibilities: 'Ensures compliance with data protection laws. Point of contact for data subject requests and regulatory bodies.' },
    { name: 'IT Administrator', responsibilities: 'Manages access control, system configurations, backups and technical security controls.' },
    { name: 'Department Heads', responsibilities: 'Responsible for information security within their teams. Ensure staff complete mandatory training.' },
    { name: 'All Staff', responsibilities: 'Comply with the information security policy. Report security incidents and suspected vulnerabilities immediately.' },
  ];
  const [roles, setRoles] = useState(initialData.roles || defaultRoles.map(r => ({ ...r, assignedTo: '' })));
  
  useEffect(() => {
    onChange?.({ roles });
  }, [roles, onChange]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Assign a named person to each role. This creates accountability and is required for ISO 27001 certification.</p>
      {roles.map((role, i) => (
        <Card key={i} className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1"><p className="font-semibold text-sm text-[#1F3864]">{role.name}</p><p className="text-xs text-gray-500 mt-0.5">{role.responsibilities}</p></div>
              <Input value={role.assignedTo} onChange={e => { const u = [...roles]; u[i].assignedTo = e.target.value; setRoles(u); }} placeholder="Full name" className="w-48 border-gray-200 text-sm h-8 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={() => setRoles([...roles, { name: '', responsibilities: '', assignedTo: '' }])} className="border-gray-200 text-[#2E75B6]"><Plus className="w-3 h-3 mr-1" />Add Custom Role</Button>
    </div>
  );
}

// ── Step 8: Security Awareness & Training ─────────────────────────────────────
function Step8Form({ initialData = {}, onChange }: any) {
  const [items, setItems] = useState(initialData.items || [
    { topic: 'Information Security Awareness', audience: 'All Staff', frequency: 'Annual', method: 'Online Module', done: false },
    { topic: 'Phishing Simulation', audience: 'All Staff', frequency: 'Quarterly', method: 'Simulated Email', done: false },
    { topic: 'Data Handling & Classification', audience: 'All Staff', frequency: 'Annual', method: 'Workshop', done: false },
    { topic: 'ISMS Roles & Responsibilities', audience: 'ISMS Team', frequency: 'On Hire', method: 'Onboarding', done: false },
    { topic: 'Incident Response Procedures', audience: 'IT & Management', frequency: 'Annual', method: 'Tabletop Exercise', done: false },
  ]);
  
  useEffect(() => {
    onChange?.({ items });
  }, [items, onChange]);

  const update = (i: number, field: string, value: string | boolean) => { const u = [...items]; (u[i] as Record<string, string | boolean>)[field] = value; setItems(u); };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Training Programme <span className="text-red-500">*</span></Label>
        <Button variant="outline" size="sm" onClick={() => setItems([...items, { topic: '', audience: 'All Staff', frequency: 'Annual', method: '', done: false }])} className="border-[#2E75B6] text-[#2E75B6]"><Plus className="w-3 h-3 mr-1" />Add Training</Button>
      </div>
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-12 bg-[#1F3864] px-3 py-2 text-xs font-semibold text-white">
          <div className="col-span-3">Topic</div><div className="col-span-2">Audience</div><div className="col-span-2">Frequency</div><div className="col-span-3">Method</div><div className="col-span-2 text-center">Completed</div>
        </div>
        {items.map((item, i) => (
          <div key={i} className={`grid grid-cols-12 gap-2 px-3 py-2 items-center ${i % 2 === 1 ? 'bg-[#F5F7FA]' : 'bg-white'}`}>
            <Input value={item.topic} onChange={e => update(i, 'topic', e.target.value)} className="col-span-3 border-gray-200 h-8 text-xs" />
            <Input value={item.audience} onChange={e => update(i, 'audience', e.target.value)} className="col-span-2 border-gray-200 h-8 text-xs" />
            <Input value={item.frequency} onChange={e => update(i, 'frequency', e.target.value)} className="col-span-2 border-gray-200 h-8 text-xs" />
            <Input value={item.method} onChange={e => update(i, 'method', e.target.value)} className="col-span-3 border-gray-200 h-8 text-xs" />
            <div className="col-span-2 flex justify-center"><Checkbox checked={item.done} onCheckedChange={v => update(i, 'done', !!v)} /></div>
          </div>
        ))}
      </div>
      <AIDraftArea stepNumber={8} context={`${items.length} training items. Topics: ${items.map(t => t.topic).filter(Boolean).join(', ')}.`} />
    </div>
  );
}

// ── Step 9: Operational Procedures ───────────────────────────────────────────
function Step9Form({ initialData = {}, onChange }: any) {
  const procedures = ['Access Management Procedure', 'Change Management Procedure', 'Incident Response Procedure', 'Backup & Recovery Procedure', 'Acceptable Use Policy', 'Data Classification Procedure', 'Supplier Management Procedure', 'Business Continuity Plan'];
  const required = new Set(['Access Management Procedure', 'Change Management Procedure', 'Incident Response Procedure', 'Backup & Recovery Procedure', 'Acceptable Use Policy']);
  const [docs, setDocs] = useState(initialData.docs || procedures.map(p => ({ name: p, status: 'Not Started', owner: '' })));
  
  useEffect(() => {
    onChange?.({ docs });
  }, [docs, onChange]);

  const statusColors: Record<string, string> = { 'Not Started': 'bg-gray-100 text-gray-600', 'Draft': 'bg-[#D6E4F0] text-[#1F3864]', 'Under Review': 'bg-orange-100 text-orange-700', 'Approved': 'bg-green-100 text-[#2C6E49]' };
  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">Track the status of each required operational procedure. Approved procedures provide audit evidence.</p>
      {docs.map((doc, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-white">
          <FileText className="w-4 h-4 text-[#2E75B6] flex-shrink-0" />
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-sm font-medium text-[#404040] truncate">{doc.name}</span>
            {required.has(doc.name) && <Badge variant="outline" className="text-xs text-red-600 border-red-200 flex-shrink-0">Required</Badge>}
          </div>
          <Select value={doc.status} onValueChange={v => { const u = [...docs]; u[i].status = v; setDocs(u); }}>
            <SelectTrigger className={`w-36 h-7 text-xs border-0 font-medium ${statusColors[doc.status]}`}><SelectValue /></SelectTrigger>
            <SelectContent>{Object.keys(statusColors).map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
          </Select>
          <Input value={doc.owner} onChange={e => { const u = [...docs]; u[i].owner = e.target.value; setDocs(u); }} placeholder="Owner" className="w-32 border-gray-200 h-7 text-xs" />
        </div>
      ))}
      <AIDraftArea stepNumber={9} context={`Procedures: ${docs.map(d => `${d.name} (${d.status})`).join(', ')}.`} />
    </div>
  );
}

// ── Step 10: Monitoring & Review ─────────────────────────────────────────────
function Step10Form({ initialData = {}, onChange }: any) {
  const [reviewFreq, setReviewFreq] = useState(initialData.reviewFreq || 'Quarterly');
  const [auditFreq, setAuditFreq] = useState(initialData.auditFreq || 'Annual');
  const [kpis, setKpis] = useState(initialData.kpis || [
    { metric: 'Number of security incidents', target: '< 2 per quarter', measurement: 'Incident log' },
    { metric: 'Risk treatment completion rate', target: '> 90%', measurement: 'Risk Register' },
    { metric: 'SoA controls implemented', target: '> 80%', measurement: 'Statement of Applicability' },
    { metric: 'Training completion rate', target: '100% annual', measurement: 'Training records' },
  ]);
  
  useEffect(() => {
    onChange?.({ reviewFreq, auditFreq, kpis });
  }, [reviewFreq, auditFreq, kpis, onChange]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label>Management Review Frequency</Label><Select value={reviewFreq} onValueChange={setReviewFreq}><SelectTrigger className="border-gray-200"><SelectValue /></SelectTrigger><SelectContent>{['Monthly', 'Quarterly', 'Bi-annual', 'Annual'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Internal Audit Frequency</Label><Select value={auditFreq} onValueChange={setAuditFreq}><SelectTrigger className="border-gray-200"><SelectValue /></SelectTrigger><SelectContent>{['Quarterly', 'Bi-annual', 'Annual'].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Key Performance Indicators</Label>
          <Button variant="outline" size="sm" onClick={() => setKpis([...kpis, { metric: '', target: '', measurement: '' }])} className="border-[#2E75B6] text-[#2E75B6]"><Plus className="w-3 h-3 mr-1" />Add KPI</Button>
        </div>
        <div className="rounded-lg border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-12 bg-[#1F3864] px-3 py-2 text-xs font-semibold text-white">
            <div className="col-span-4">Metric</div><div className="col-span-3">Target</div><div className="col-span-4">How Measured</div><div className="col-span-1" />
          </div>
          {kpis.map((kpi, i) => (
            <div key={i} className={`grid grid-cols-12 gap-2 px-3 py-2 items-center ${i % 2 === 1 ? 'bg-[#F5F7FA]' : 'bg-white'}`}>
              <Input value={kpi.metric} onChange={e => { const u = [...kpis]; u[i].metric = e.target.value; setKpis(u); }} className="col-span-4 border-gray-200 h-8 text-sm" />
              <Input value={kpi.target} onChange={e => { const u = [...kpis]; u[i].target = e.target.value; setKpis(u); }} className="col-span-3 border-gray-200 h-8 text-sm" />
              <Input value={kpi.measurement} onChange={e => { const u = [...kpis]; u[i].measurement = e.target.value; setKpis(u); }} className="col-span-4 border-gray-200 h-8 text-sm" />
              <Button size="icon" variant="ghost" onClick={() => setKpis(kpis.filter((_, j) => j !== i))} className="col-span-1 text-gray-400 hover:text-red-600 h-8 w-8"><Trash2 className="w-3.5 h-3.5" /></Button>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-start gap-2 p-3 bg-[#D6E4F0] rounded-lg text-sm text-[#1F3864]">
        <Activity className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <p>Use the <span className="font-semibold underline cursor-pointer" onClick={() => window.location.href = '/monitoring'}>Monitoring screen</span> to log incidents, schedule audits, and record management review minutes throughout your ISMS lifecycle.</p>
      </div>
    </div>
  );
}

const STEP_FORMS: Record<number, React.ComponentType<any>> = {
  1: Step1Form, 2: Step2Form, 3: Step3Form, 4: Step4Form, 5: Step5Form,
  6: Step6Form, 7: Step7Form, 8: Step8Form, 9: Step9Form, 10: Step10Form,
};

// ── Main StepModule ───────────────────────────────────────────────────────────
export function StepModule() {
  const { stepNumber } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const step = parseInt(stepNumber || '1');
  const meta = STEP_META[step];
  const StepForm = STEP_FORMS[step];
  const [stepData, setStepData] = useState<Record<string, unknown> | null>(null);
  const [stepFormData, setStepFormData] = useState<Record<string, unknown>>({});
  const [stepLoading, setStepLoading] = useState(true);
  const [stepError, setStepError] = useState<string | null>(null);
  const [explainerOpen, setExplainerOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const fetchStepData = useCallback(() => {
    setStepLoading(true);
    setStepError(null);
    apiFetch<Record<string, unknown>>(`/steps/${step}`)
      .then(data => { setStepData(data); setStepFormData((data as Record<string, unknown>).draft_data as Record<string, unknown> || {}); setStepLoading(false); })
      .catch((e) => {
        setStepError(e instanceof Error ? e.message : 'Failed to load step data');
        setStepData(null);
        setStepLoading(false);
        toast({ title: 'Error', description: 'Failed to load step data', variant: 'destructive' });
      });
  }, [step, toast]);

  useEffect(() => {
    fetchStepData();
  }, [fetchStepData]);

  useEffect(() => {
    const timer = setInterval(() => setLastSaved(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const isLocked = stepData?.status === 'Locked' || stepData?.status === 'Not Started';

  useEffect(() => {
    if (!stepLoading && isLocked) {
      navigate('/steps');
    }
  }, [stepLoading, isLocked, navigate]);

  if (stepLoading) return (
    <div className="flex items-center justify-center py-20"><span className="text-[var(--muted)]">Loading step…</span></div>
  );

  if (stepError) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center max-w-md mx-auto">
      <div className="bg-red-50 border border-red-200 p-6 rounded-xl w-full">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Step</h2>
        <p className="text-red-600 mb-6">{stepError}</p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate('/steps')} className="border-red-200 text-red-700 hover:bg-red-100">Back</Button>
          <Button onClick={fetchStepData} className="bg-red-600 hover:bg-red-700 text-white">Retry</Button>
        </div>
      </div>
    </div>
  );

  if (!meta || !stepData) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <Lock className="w-12 h-12 text-gray-200 mb-3" />
      <p className="font-semibold text-gray-400">Step not found</p>
      <Button variant="outline" onClick={() => navigate('/steps')} className="mt-4 border-gray-200">Back to Steps</Button>
    </div>
  );

  const isComplete = stepData['status'] === 'Complete';
  const isOwner = user?.role === 'ISMS_Owner';
  const Icon = meta.icon;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiFetch(`/steps/${step}/draft`, {
        method: 'PATCH',
        body: JSON.stringify(stepFormData),
      });
      setLastSaved(new Date());
      toast({ title: 'Draft saved', description: `Step ${step} progress saved.` });
    } catch {
      toast({ title: 'Save failed', description: 'Could not save to server. Will retry automatically.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleComplete = async () => {
    try {
      await apiFetch(`/steps/${step}/complete`, { method: 'POST', body: JSON.stringify(stepFormData) });
      toast({ title: `Step ${step} complete!`, description: step < 10 ? `Step ${step + 1} has been unlocked.` : 'All 10 steps complete — you\'re audit-ready!' });
      navigate('/steps');
    } catch (e: unknown) {
      toast({ title: 'Could not complete step', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-0 -mt-6 -mx-6">
      {/* Navy header banner */}
      <div className="bg-[#1F3864] px-8 py-6 mb-6">
        <p className="text-xs text-[#D6E4F0] mb-3">
          <button onClick={() => navigate('/dashboard')} className="hover:text-white">Dashboard</button> › <button onClick={() => navigate('/steps')} className="hover:text-white">ISMS Steps</button> › <span className="text-white">Step {step}</span>
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="text-5xl font-extrabold text-white/20 leading-none select-none">{step}</div>
            <div>
              <div className="flex items-center gap-2 mb-1"><Icon className="w-5 h-5 text-[#D6E4F0]" /><h1 className="text-xl font-bold text-white">{meta.title}</h1></div>
              <p className="text-sm text-[#BDD7EE]">{meta.clause}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isComplete && <Badge className="bg-[#2C6E49] text-white border-0 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Complete</Badge>}
            {isLocked && <Badge className="bg-white/10 text-[#BDD7EE] border-0 flex items-center gap-1"><Lock className="w-3 h-3" /> Locked</Badge>}
            {stepData['status'] === 'In Progress' && <Badge className="bg-[#2E75B6] text-white border-0 flex items-center gap-1"><Clock className="w-3 h-3" /> In Progress</Badge>}
            {!isComplete && !isLocked && isOwner && (
              <Button onClick={handleComplete} className="bg-white text-[#1F3864] hover:bg-[#D6E4F0] font-semibold">
                <CheckCircle className="w-4 h-4 mr-2" /> Mark Complete
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="px-6 space-y-4">
        {isLocked ? (
          <Card className="border-gray-200">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Lock className="w-12 h-12 text-gray-300 mb-4" />
              <p className="font-semibold text-[#404040] text-lg">Step {step} is locked</p>
              <p className="text-sm text-gray-500 mt-2 max-w-xs">Complete Step {step - 1} before starting this step.</p>
              <Button className="mt-6 bg-[#2E75B6] hover:bg-[#2E75B6]/90 text-white" onClick={() => navigate(`/steps/${step - 1}`)}>Go to Step {step - 1}</Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Explainer */}
            <Collapsible open={explainerOpen} onOpenChange={setExplainerOpen}>
              <Card className="border-[#BDD7EE] bg-[#D6E4F0]">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer pb-2 pt-4 px-5">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold text-[#1F3864]">About this step</CardTitle>
                      <ChevronDown className={`w-4 h-4 text-[#2E75B6] transition-transform ${explainerOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="px-5 pb-4 pt-0 space-y-2">
                    <p className="text-sm text-[#404040]">{meta.guidance}</p>
                    <p className="text-xs text-[#404040]"><span className="font-semibold text-[#2E75B6]">Why it matters: </span>{meta.why}</p>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>

            {/* Form */}
            <Card className="border-gray-200">
              <CardHeader><CardTitle className="text-base text-[#1F3864]">{meta.title}</CardTitle><CardDescription>Complete all required fields to unlock Mark Complete.</CardDescription></CardHeader>
              <CardContent><StepForm initialData={stepData['draft_data'] || {}} onChange={setStepFormData} /></CardContent>
            </Card>

            {/* Comments */}
            <Card className="border-gray-200">
              <CardHeader className="pb-3"><CardTitle className="text-sm text-[#404040]">Team Comments</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-gray-400 text-center py-4">No comments yet. Reviewers can add inline comments here.</p></CardContent>
            </Card>
          </>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between py-4 border-t border-gray-200 bg-white sticky bottom-0 -mx-6 px-6">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {isSaving ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</> : lastSaved ? <><CheckCircle className="w-3 h-3 text-[#2C6E49]" /> Saved {lastSaved.toLocaleTimeString()}</> : <><Clock className="w-3 h-3" /> Auto-saves every 30s</>}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={step === 1} onClick={() => navigate(`/steps/${step - 1}`)} className="border-gray-200"><ArrowLeft className="w-4 h-4 mr-1" />Previous</Button>
            <Button variant="outline" size="sm" disabled={step === 10} onClick={() => navigate(`/steps/${step + 1}`)} className="border-gray-200">Next<ArrowRight className="w-4 h-4 ml-1" /></Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" size="sm" onClick={handleSave} disabled={isSaving || isLocked} className="border-gray-200">
              {isSaving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Save className="w-4 h-4 mr-1" />}Save Draft
            </Button>
            {!isComplete && !isLocked && isOwner && (
              <Button size="sm" onClick={handleComplete} className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white"><CheckCircle className="w-4 h-4 mr-1" />Complete Step</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
