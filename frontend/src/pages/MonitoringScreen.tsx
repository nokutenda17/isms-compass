import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import { useAIEngine } from '@/hooks/useAIEngine';
import { useToast } from '@/hooks/use-toast';
import { Loader as Loader2, Sparkles, Plus, TriangleAlert as AlertTriangle } from 'lucide-react';

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'Critical': return 'bg-[var(--red)] text-white';
    case 'High':     return 'bg-[var(--amber)] text-white';
    case 'Medium':   return 'bg-yellow-500 text-white';
    case 'Low':      return 'bg-[var(--green)] text-white';
    default:         return 'bg-gray-400 text-white';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'High':   return 'bg-[var(--red)] text-white';
    case 'Medium': return 'bg-[var(--amber)] text-white';
    case 'Low':    return 'bg-[var(--green)] text-white';
    default:       return 'bg-gray-400 text-white';
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Closed': case 'Completed': case 'Resolved': return 'bg-[var(--green)] text-white';
    case 'In Progress': case 'Under Investigation':   return 'bg-[var(--blue)] text-white';
    case 'Open': case 'Scheduled':                    return 'bg-[var(--amber)] text-white';
    default:                                           return 'bg-gray-400 text-white';
  }
}

export function MonitoringScreen() {
  const { sendPrompt, isLoading } = useAIEngine();
  const { toast } = useToast();

  // Dialog visibility
  const [showIncidentDialog, setShowIncidentDialog] = useState(false);
  const [showActionDialog, setShowActionDialog]     = useState(false);
  const [showAISuggest, setShowAISuggest]           = useState(false);
  const [selectedAction, setSelectedAction]         = useState<string | null>(null);
  const [aiSuggestion, setAiSuggestion]             = useState('');

  // Incident form state
  const [incTitle, setIncTitle]               = useState('');
  const [incDescription, setIncDescription]   = useState('');
  const [incSeverity, setIncSeverity]         = useState('Medium');
  const [submittingInc, setSubmittingInc]     = useState(false);

  // Corrective action form state
  const [actTitle, setActTitle]               = useState('');
  const [actDescription, setActDescription]   = useState('');
  const [actPriority, setActPriority]         = useState('Medium');
  const [actDueDate, setActDueDate]           = useState('');
  const [submittingAct, setSubmittingAct]     = useState(false);

  // ── Live data ──────────────────────────────────────────────────────────────
  const [incidents, setIncidents]                 = useState<any[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<any[]>([]);
  const [audits, setAudits]                       = useState<any[]>([]);
  const [reviews, setReviews]                     = useState<any[]>([]);
  const [monLoading, setMonLoading]               = useState(true);
  const [monError, setMonError]                   = useState<string | null>(null);

  const fetchMonitoring = useCallback(async () => {
    setMonLoading(true);
    setMonError(null);
    try {
      const [incData, actData, audData, revData] = await Promise.all([
        apiFetch<any[]>('/monitoring/incidents'),
        apiFetch<any[]>('/monitoring/corrective-actions'),
        apiFetch<any[]>('/monitoring/audits'),
        apiFetch<any[]>('/monitoring/management-reviews').catch(() => []),
      ]);
      setIncidents(Array.isArray(incData) ? incData : []);
      setCorrectiveActions(Array.isArray(actData) ? actData : []);
      setAudits(Array.isArray(audData) ? audData : []);
      setReviews(Array.isArray(revData) ? revData : []);
    } catch (e) {
      console.error('Monitoring fetch error:', e);
      setMonError(e instanceof Error ? e.message : 'Failed to load monitoring data.');
    } finally {
      setMonLoading(false);
    }
  }, []);

  useEffect(() => { fetchMonitoring(); }, [fetchMonitoring]);

  // ── Submit: Report Incident ────────────────────────────────────────────────
  const handleReportIncident = async () => {
    if (!incTitle.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSubmittingInc(true);
    try {
      await apiFetch('/monitoring/incidents', {
        method: 'POST',
        body: JSON.stringify({ title: incTitle, description: incDescription, severity: incSeverity }),
      });
      toast({ title: 'Incident reported', description: `"${incTitle}" has been logged.` });
      setShowIncidentDialog(false);
      setIncTitle(''); setIncDescription(''); setIncSeverity('Medium');
      fetchMonitoring();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to report incident.', variant: 'destructive' });
    } finally {
      setSubmittingInc(false);
    }
  };

  // ── Submit: Create Corrective Action ──────────────────────────────────────
  const handleCreateAction = async () => {
    if (!actTitle.trim()) {
      toast({ title: 'Title is required', variant: 'destructive' });
      return;
    }
    setSubmittingAct(true);
    try {
      await apiFetch('/monitoring/corrective-actions', {
        method: 'POST',
        body: JSON.stringify({ title: actTitle, description: actDescription, priority: actPriority, dueDate: actDueDate }),
      });
      toast({ title: 'Corrective action created', description: `"${actTitle}" has been added.` });
      setShowActionDialog(false);
      setActTitle(''); setActDescription(''); setActPriority('Medium'); setActDueDate('');
      fetchMonitoring();
    } catch (e) {
      toast({ title: 'Error', description: e instanceof Error ? e.message : 'Failed to create action.', variant: 'destructive' });
    } finally {
      setSubmittingAct(false);
    }
  };

  // ── AI Action Plan ─────────────────────────────────────────────────────────
  const handleAISuggestForAction = async (actionId: string) => {
    setSelectedAction(actionId);
    setShowAISuggest(true);
    setAiSuggestion('');
    const action = correctiveActions.find((a) => a.action_id === actionId || a.id === actionId);
    if (!action) return;
    const prompt = `As an ISO 27001 compliance expert, provide a detailed action plan to resolve: "${action['title']}". Include specific steps, timeline, and success criteria.`;
    const suggestion = await sendPrompt(
      prompt,
      { context: action['description'], priority: action['priority'] },
      { onToken: (_token: string, fullText: string) => setAiSuggestion(fullText) },
    );
    setAiSuggestion(suggestion);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-color)] mb-2">Monitoring &amp; Review</h1>
        <p className="text-[var(--muted)]">Track incidents, corrective actions, audits, and management reviews</p>
      </div>

      {monError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-800">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm font-medium">{monError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchMonitoring} className="border-red-200 text-red-700 hover:bg-red-100">Retry</Button>
        </div>
      )}

      <Tabs defaultValue="incidents" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-[var(--light-blue)]">
          <TabsTrigger value="incidents">Incidents</TabsTrigger>
          <TabsTrigger value="actions">Corrective Actions</TabsTrigger>
          <TabsTrigger value="audits">Internal Audits</TabsTrigger>
          <TabsTrigger value="reviews">Management Review</TabsTrigger>
        </TabsList>

        {/* ── Incidents ── */}
        <TabsContent value="incidents" className="space-y-4">
          <Card className="border-[var(--border-color)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Security Incidents</CardTitle>
                  <CardDescription>{incidents.length} incident{incidents.length !== 1 ? 's' : ''} reported</CardDescription>
                </div>
                <Button onClick={() => setShowIncidentDialog(true)} className="bg-[var(--blue)] hover:bg-[var(--blue)]/90">
                  <Plus className="w-4 h-4 mr-2" />Report Incident
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {monLoading
                ? <p className="text-center py-4 text-[var(--muted)]">Loading…</p>
                : incidents.map((incident) => (
                  <div key={incident.incident_id as string} className="p-4 border border-[var(--border-color)] rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-[var(--text-color)]">{incident.title as string}</h3>
                      <Badge className={`text-xs ${getSeverityColor(incident.severity)}`}>{incident.severity as string}</Badge>
                    </div>
                    <p className="text-sm text-[var(--muted)] mb-3">{incident.description as string}</p>
                    <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                      <span>Reported by {(incident.reported_by || incident.reportedBy) as string} on {new Date(incident.reported_date || incident.reportedDate).toLocaleDateString()}</span>
                      <Badge className={`text-xs ${getStatusColor(incident.status)}`}>{incident.status as string}</Badge>
                    </div>
                  </div>
                ))
              }
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Corrective Actions ── */}
        <TabsContent value="actions" className="space-y-4">
          <Card className="border-[var(--border-color)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Corrective Actions</CardTitle>
                  <CardDescription>{correctiveActions.length} action{correctiveActions.length !== 1 ? 's' : ''} tracked</CardDescription>
                </div>
                <Button onClick={() => setShowActionDialog(true)} className="bg-[var(--blue)] hover:bg-[var(--blue)]/90">
                  <Plus className="w-4 h-4 mr-2" />New Action
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {correctiveActions.map((action) => {
                const dueDateStr = action.due_date || action.dueDate;
                const isOverdue = action.status !== 'Closed' && dueDateStr && new Date(dueDateStr) < new Date();
                const actionKey = action.action_id || action.id;
                return (
                  <div key={actionKey as string} className={`p-4 border rounded-lg transition-colors ${isOverdue ? 'border-[var(--red)] bg-red-50' : 'border-[var(--border-color)] hover:bg-gray-50'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-[var(--text-color)]">{action.title as string}</h3>
                      <div className="flex gap-2">
                        <Badge className={`text-xs ${getPriorityColor(action.priority)}`}>{action.priority as string}</Badge>
                        <Badge className={`text-xs ${getStatusColor(action.status)}`}>{action.status as string}</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-[var(--muted)] mb-3">{action.description as string}</p>
                    <div className="flex items-center justify-between text-xs text-[var(--muted)] mb-3">
                      <span>Assigned to {(action.assigned_to || action.assignedTo) as string}</span>
                      <span className={isOverdue ? 'text-[var(--red)] font-semibold' : ''}>
                        {dueDateStr ? `Due ${new Date(dueDateStr).toLocaleDateString()}` : 'No due date'}
                        {isOverdue && ' (OVERDUE)'}
                      </span>
                    </div>
                    <Button
                      size="sm" variant="outline"
                      onClick={() => handleAISuggestForAction(actionKey)}
                      disabled={isLoading && selectedAction === actionKey}
                      className="border-[var(--ai-purple)] text-[var(--ai-purple)] w-full"
                    >
                      {isLoading && selectedAction === actionKey
                        ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Generating...</>
                        : <><Sparkles className="w-3 h-3 mr-1" />AI Action Plan</>
                      }
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Internal Audits ── */}
        <TabsContent value="audits" className="space-y-4">
          <Card className="border-[var(--border-color)]">
            <CardHeader>
              <CardTitle>Internal Audits</CardTitle>
              <CardDescription>Scheduled and completed audits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {audits.map((audit) => (
                <div key={audit.audit_id as string} className="p-4 border border-[var(--border-color)] rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-[var(--text-color)]">{audit.title as string}</h3>
                    <Badge className={`text-xs ${getStatusColor(audit.status)}`}>{audit.status as string}</Badge>
                  </div>
                  <p className="text-sm text-[var(--muted)] mb-3">{audit.scope}</p>
                  <div className="flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>Auditor: {(audit.auditor || 'TBC') as string}</span>
                    <span>{audit.type as string} · Scheduled {new Date(audit.scheduled_date || audit.scheduledDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full border-[var(--border-color)]">
                <Plus className="w-4 h-4 mr-2" />Schedule New Audit
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Management Reviews ── */}
        <TabsContent value="reviews" className="space-y-4">
          <Card className="border-[var(--border-color)]">
            <CardHeader>
              <CardTitle>Management Reviews</CardTitle>
              <CardDescription>Organisation's formal review of ISMS performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {monLoading ? (
                <p className="text-center py-4 text-[var(--muted)]">Loading…</p>
              ) : reviews.length === 0 ? (
                <p className="text-center py-6 text-[var(--muted)]">No management reviews recorded yet.</p>
              ) : reviews.map((review) => (
                <div key={review.review_id as string} className="p-4 border border-[var(--border-color)] rounded-lg bg-[var(--light-blue)]">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-[var(--text-color)]">
                      Management Review — {new Date(review.review_date).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </h3>
                    <Badge className="bg-[var(--green)] text-white text-xs">Completed</Badge>
                  </div>
                  {Array.isArray(review.attendees) && review.attendees.length > 0 && (
                    <p className="text-sm text-[var(--muted)] mb-1">
                      Attendees: {review.attendees.join(', ')}
                    </p>
                  )}
                  {review.decisions && (
                    <p className="text-sm text-[var(--text-color)] mt-2">
                      <span className="font-medium">Decisions: </span>{review.decisions}
                    </p>
                  )}
                  {review.approved_by && (
                    <p className="text-xs text-[var(--muted)] mt-2">Approved by {review.approved_by}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── AI Suggestion Dialog ── */}
      <Dialog open={showAISuggest} onOpenChange={setShowAISuggest}>
        <DialogContent className="border-[var(--border-color)] max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Action Plan</DialogTitle>
            <DialogDescription>Generated suggestions for resolving the corrective action</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="p-4 bg-[var(--light-blue)] rounded-lg whitespace-pre-wrap text-sm leading-relaxed">
              {aiSuggestion || 'Loading suggestions...'}
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(aiSuggestion)} className="flex-1">Copy to Clipboard</Button>
              <Button onClick={() => setShowAISuggest(false)} className="flex-1 bg-[var(--blue)] hover:bg-[var(--blue)]/90">Close</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Report Incident Dialog ── */}
      <Dialog open={showIncidentDialog} onOpenChange={setShowIncidentDialog}>
        <DialogContent className="border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle>Report Security Incident</DialogTitle>
            <DialogDescription>Document a new security incident for investigation</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="incTitle">Incident Title <span className="text-red-500">*</span></Label>
              <Input
                id="incTitle"
                value={incTitle}
                onChange={(e) => setIncTitle(e.target.value)}
                placeholder="e.g., Unauthorized access attempt"
                className="border-[var(--border-color)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="incDesc">Description</Label>
              <Textarea
                id="incDesc"
                value={incDescription}
                onChange={(e) => setIncDescription(e.target.value)}
                placeholder="Describe the incident in detail..."
                className="border-[var(--border-color)]"
              />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={incSeverity} onValueChange={setIncSeverity}>
                <SelectTrigger className="border-[var(--border-color)]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Critical', 'High', 'Medium', 'Low'].map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full bg-[var(--blue)] hover:bg-[var(--blue)]/90" onClick={handleReportIncident} disabled={submittingInc}>
              {submittingInc
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting…</>
                : 'Report Incident'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── New Corrective Action Dialog ── */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle>Create Corrective Action</DialogTitle>
            <DialogDescription>Define a new corrective action for ISMS improvement</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="actTitle">Action Title <span className="text-red-500">*</span></Label>
              <Input
                id="actTitle"
                value={actTitle}
                onChange={(e) => setActTitle(e.target.value)}
                placeholder="e.g., Implement MFA on all admin accounts"
                className="border-[var(--border-color)]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actDesc">Description</Label>
              <Textarea
                id="actDesc"
                value={actDescription}
                onChange={(e) => setActDescription(e.target.value)}
                placeholder="Describe the action..."
                className="border-[var(--border-color)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={actPriority} onValueChange={setActPriority}>
                  <SelectTrigger className="border-[var(--border-color)]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['High', 'Medium', 'Low'].map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="actDue">Due Date</Label>
                <Input
                  id="actDue"
                  type="date"
                  value={actDueDate}
                  onChange={(e) => setActDueDate(e.target.value)}
                  className="border-[var(--border-color)]"
                />
              </div>
            </div>
            <Button className="w-full bg-[var(--blue)] hover:bg-[var(--blue)]/90" onClick={handleCreateAction} disabled={submittingAct}>
              {submittingAct
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</>
                : 'Create Action'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
