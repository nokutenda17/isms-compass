import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import { useAIEngine } from '@/hooks/useAIEngine';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Download, Sparkles, Loader as Loader2, TriangleAlert as AlertTriangle } from 'lucide-react';

const CONTROLS_PER_PAGE = 5;

export function StatementOfApplicability() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { sendPrompt, isLoading: aiLoading } = useAIEngine();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedControls, setSelectedControls] = useState<Set<string>>(new Set());
  const [showAIDraft, setShowAIDraft] = useState(false);
  const [selectedControlForDraft, setSelectedControlForDraft] = useState<string | null>(null);
  const [aiDraft, setAiDraft] = useState('');
  const [saveDraftLoading, setSaveDraftLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  // Track which refs are currently being toggled (to show spinner)
  const [togglingRefs, setTogglingRefs] = useState<Set<string>>(new Set());

  // ── Live data ──────────────────────────────────────────────────────────────
  const [controls, setControls] = useState<any[]>([]);
  const [soaLoading, setSoaLoading] = useState(true);
  const [soaError, setSoaError] = useState<string | null>(null);

  const fetchControls = useCallback(async () => {
    setSoaLoading(true);
    setSoaError(null);
    try {
      const data = await apiFetch<any[]>(
        selectedCategory === 'all' ? '/soa' : `/soa?category=${encodeURIComponent(selectedCategory)}`
      );
      setControls(data);
    } catch (e: unknown) {
      setSoaError(e instanceof Error ? e.message : 'Failed to load SoA controls');
    } finally {
      setSoaLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => { fetchControls(); }, [fetchControls]);

  const allControls = controls; // backend returns all 93, filtered by category
  const categories = ['all', ...Array.from(new Set(controls.map((c) => c.category as string))).filter(Boolean)];

  const filteredControls = useMemo(() => controls, [controls]);

  const paginatedControls = filteredControls.slice(
    currentPage * CONTROLS_PER_PAGE,
    (currentPage + 1) * CONTROLS_PER_PAGE
  );

  const applicableCount = allControls.filter(c => c.applicable).length || 1;
  const notApplicableCount = allControls.filter(c => !c.applicable).length;
  const implementedCount = allControls.filter(c => c.implementation_status === 'Implemented').length;
  const progressPercent = Math.round((implementedCount / applicableCount) * 100);

  // ── Toggle applicability ───────────────────────────────────────────────────
  const handleToggleApplicable = async (controlRef: string, currentValue: boolean) => {
    if (user?.role !== 'ISMS_Owner') return;

    const newValue = !currentValue;

    // Optimistic update
    setControls(prev =>
      prev.map(c =>
        c.annex_a_ref === controlRef ? { ...c, applicable: newValue } : c
      )
    );

    setTogglingRefs(prev => new Set(prev).add(controlRef));
    try {
      await apiFetch(`/soa/${encodeURIComponent(controlRef)}`, {
        method: 'PATCH',
        body: JSON.stringify({ applicable: newValue ? 1 : 0 }),
      });
      toast({
        title: newValue ? 'Control marked applicable' : 'Control marked not applicable',
        description: `${controlRef} has been updated.`,
      });
    } catch (e: unknown) {
      // Revert optimistic update on failure
      setControls(prev =>
        prev.map(c =>
          c.annex_a_ref === controlRef ? { ...c, applicable: currentValue } : c
        )
      );
      toast({
        title: 'Update failed',
        description: e instanceof Error ? e.message : 'Could not update applicability.',
        variant: 'destructive',
      });
    } finally {
      setTogglingRefs(prev => {
        const next = new Set(prev);
        next.delete(controlRef);
        return next;
      });
    }
  };

  const handleGenerateAIDraft = async (controlRef: string) => {
    const control = allControls.find(c => (c.annex_a_ref as string) === controlRef);
    if (!control) return;

    setSelectedControlForDraft(controlRef);
    setShowAIDraft(true);
    setAiDraft('');

    const name = (control.control_name as string) || '';
    const prompt = `As an ISO 27001 expert for a ${user?.orgSector} company in ${user?.city}, write a detailed SoA justification for Annex A control ${controlRef}: "${name}".

After the required single-line DRAFT prefix, cover in order: (1) why this control applies to the organisation and scope, (2) current or planned treatment, (3) specific evidence or records to maintain, (4) practical implementation or verification steps. Write at least several paragraphs of specific content — not a disclaimer alone.

Use plain paragraphs only (no Markdown, no ### headings, no **bold**).`;

    const draft = await sendPrompt(
      prompt,
      {
        organization: user?.orgName,
        sector: user?.orgSector,
        size: user?.orgSize,
        controlRef: controlRef,
        controlName: name,
        controlCategory: control.category as string,
      },
      {
        onToken: (_token, fullText) => setAiDraft(fullText),
      }
    );

    setAiDraft(draft);
  };

  const handleAcceptAIDraft = async () => {
    const ref = selectedControlForDraft;
    const text = aiDraft.trim();
    if (!ref) return;
    if (!text) {
      toast({
        title: 'Nothing to save',
        description: 'Add or edit the justification text before accepting.',
        variant: 'destructive',
      });
      return;
    }
    setSaveDraftLoading(true);
    try {
      await apiFetch(`/soa/${encodeURIComponent(ref)}`, {
        method: 'PATCH',
        body: JSON.stringify({ justification: text }),
      });
      toast({ title: 'Justification saved', description: `${ref} has been updated.` });
      setShowAIDraft(false);
      setSelectedControlForDraft(null);
      await fetchControls();
    } catch (e: unknown) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Could not save justification.',
        variant: 'destructive',
      });
    } finally {
      setSaveDraftLoading(false);
    }
  };

  const handleBulkGenerate = async () => {
    const controlsToGenerate = allControls.filter(
      (c) => selectedControls.has(c.annex_a_ref as string) && !c.justification
    );

    if (controlsToGenerate.length === 0) return;

    const prompt = `Generate concise justifications for these ISO 27001 Annex A controls for a ${user?.orgSector} organization: ${controlsToGenerate.map((c) => c.annex_a_ref as string).join(', ')}. Format as JSON.`;

    await sendPrompt(prompt, {
      organization: user?.orgName,
      sector: user?.orgSector,
      controlRefs: controlsToGenerate.map((c) => c.annex_a_ref as string),
    });
  };

  const handleExportSoA = () => {
    const csv = [
      ['Control ID', 'Category', 'Control', 'Applicable', 'Justification', 'Status'],
      ...allControls.map((c) => [
        c.annex_a_ref as string,
        c.category as string,
        c.control_name as string,
        c.applicable ? 'Yes' : 'No',
        (c.justification as string) || '',
        (c.implementation_status as string) || 'Not Started'
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soa-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (soaLoading) return (
    <div className="flex items-center justify-center py-20">
      <span className="text-[var(--muted)]">Loading Statement of Applicability…</span>
    </div>
  );

  if (soaError) return (
    <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center justify-between m-6">
      <div className="flex items-center gap-3 text-red-800">
        <AlertTriangle className="w-5 h-5" />
        <p className="text-sm font-medium">{soaError}</p>
      </div>
      <Button variant="outline" size="sm" onClick={fetchControls} className="border-red-200 text-red-700 hover:bg-red-100">
        Retry
      </Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-color)] mb-2">Statement of Applicability</h1>
          <p className="text-[var(--muted)]">Define and justify your selection of Annex A controls</p>
        </div>
        {user?.role === 'ISMS_Owner' && (
          <Button
            onClick={handleExportSoA}
            className="bg-[var(--blue)] hover:bg-[var(--blue)]/90"
          >
            <Download className="w-4 h-4 mr-2" />
            Export SoA
          </Button>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-[var(--border-color)]">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[var(--green)]">{allControls.filter(c => c.applicable).length}</div>
            <div className="text-xs text-[var(--muted)] mt-1">Applicable Controls</div>
          </CardContent>
        </Card>
        <Card className="border-[var(--border-color)]">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-400">{notApplicableCount}</div>
            <div className="text-xs text-[var(--muted)] mt-1">Not Applicable</div>
          </CardContent>
        </Card>
        <Card className="border-[var(--border-color)]">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[var(--blue)]">{implementedCount}</div>
            <div className="text-xs text-[var(--muted)] mt-1">Implemented</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-[var(--border-color)] bg-[var(--light-blue)]">
        <CardContent className="p-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium text-[var(--navy)]">Implementation Progress</span>
              <span className="text-sm font-bold text-[var(--navy)]">{implementedCount} of {applicableCount}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <span className="text-xs text-[var(--navy)]">{progressPercent}% of applicable controls implemented</span>
          </div>
        </CardContent>
      </Card>

      {user?.role === 'ISMS_Owner' && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            As <strong>ISMS Owner</strong>, use the toggle on each control to mark it as applicable or not applicable to your organisation. Document your justification using the AI Draft button.
          </p>
        </div>
      )}

      <Card className="border-[var(--border-color)]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Annex A Controls</CardTitle>
              <CardDescription>Total of 93 controls from ISO/IEC 27001:2022</CardDescription>
            </div>
            {selectedControls.size > 0 && (
              <Button
                onClick={handleBulkGenerate}
                disabled={aiLoading}
                className="bg-[var(--ai-purple)] hover:bg-[var(--ai-purple)]/90"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Batch AI Generate ({selectedControls.size})
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                onClick={() => {
                  setSelectedCategory('all');
                  setCurrentPage(0);
                }}
                className={selectedCategory === 'all' ? 'bg-[var(--blue)] hover:bg-[var(--blue)]/90' : 'border-[var(--border-color)]'}
              >
                All Categories
              </Button>
              {categories.slice(1).map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  onClick={() => {
                    setSelectedCategory(category);
                    setCurrentPage(0);
                  }}
                  className={selectedCategory === category ? 'bg-[var(--blue)] hover:bg-[var(--blue)]/90' : 'border-[var(--border-color)]'}
                  size="sm"
                >
                  {category}
                </Button>
              ))}
            </div>

            <div className="space-y-3 border-t border-[var(--border-color)] pt-4">
              {paginatedControls.map((control) => {
                const ref = control.annex_a_ref as string;
                const title = (control.control_name as string) || '';
                const implStatus = control.implementation_status as string | undefined;
                const isApplicable = Boolean(control.applicable);
                const isToggling = togglingRefs.has(ref);
                const canToggle = user?.role === 'ISMS_Owner';
                return (
                  <div
                    key={control.soa_id as string}
                    className={`p-4 border rounded-lg transition-colors ${
                      isApplicable
                        ? 'border-[var(--border-color)] hover:bg-gray-50'
                        : 'border-gray-200 bg-gray-50/60 opacity-80'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={selectedControls.has(ref)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedControls);
                          if (checked) {
                            newSelected.add(ref);
                          } else {
                            newSelected.delete(ref);
                          }
                          setSelectedControls(newSelected);
                        }}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 pr-4">
                            <h3 className={`font-semibold ${isApplicable ? 'text-[var(--text-color)]' : 'text-gray-400'}`}>
                              {ref}: {title}
                            </h3>
                            {(control.description as string) ? (
                              <p className="text-sm text-[var(--muted)] mt-1">{control.description as string}</p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {/* Applicability toggle (ISMS_Owner only) */}
                            {canToggle ? (
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-medium ${isApplicable ? 'text-[var(--green)]' : 'text-gray-400'}`}>
                                  {isToggling ? '…' : isApplicable ? 'Applicable' : 'Not Applicable'}
                                </span>
                                <Switch
                                  id={`toggle-${ref}`}
                                  checked={isApplicable}
                                  disabled={isToggling}
                                  onCheckedChange={() => void handleToggleApplicable(ref, isApplicable)}
                                  className="data-[state=checked]:bg-[var(--green)]"
                                />
                              </div>
                            ) : (
                              <Badge className={isApplicable ? 'bg-[var(--green)] text-white' : 'bg-gray-300 text-gray-600'}>
                                {isApplicable ? 'Applicable' : 'Not Applicable'}
                              </Badge>
                            )}
                            {implStatus && isApplicable && (
                              <Badge
                                variant="outline"
                                className={
                                  implStatus === 'Implemented'
                                    ? 'border-[var(--green)] text-[var(--green)]'
                                    : implStatus === 'In Progress'
                                      ? 'border-[var(--blue)] text-[var(--blue)]'
                                      : ''
                                }
                              >
                                {implStatus}
                              </Badge>
                            )}
                          </div>
                        </div>

                        {control.justification && (
                          <div className={`mt-3 p-3 rounded-lg ${isApplicable ? 'bg-[var(--light-blue)]' : 'bg-gray-100'}`}>
                            <div className="text-xs font-semibold text-[var(--navy)] mb-1">
                              {isApplicable ? 'Justification:' : 'Exclusion Reason:'}
                            </div>
                            <p className="text-xs text-[var(--text-color)]">{control.justification}</p>
                          </div>
                        )}

                        {isApplicable && !control.justification && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerateAIDraft(ref)}
                            disabled={aiLoading && selectedControlForDraft === ref}
                            className="mt-3 border-[var(--ai-purple)] text-[var(--ai-purple)]"
                          >
                            {aiLoading && selectedControlForDraft === ref ? (
                              <>
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Drafting...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3 h-3 mr-1" />
                                AI Draft Justification
                              </>
                            )}
                          </Button>
                        )}

                        {!isApplicable && !control.justification && canToggle && (
                          <p className="mt-2 text-xs text-gray-400 italic">
                            Add an exclusion justification using the AI Draft button after enabling then disabling — or edit manually.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[var(--border-color)]">
              <span className="text-sm text-[var(--muted)]">
                Page {currentPage + 1} of {Math.ceil(filteredControls.length / CONTROLS_PER_PAGE)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="border-[var(--border-color)]"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={(currentPage + 1) * CONTROLS_PER_PAGE >= filteredControls.length}
                  className="border-[var(--border-color)]"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showAIDraft} onOpenChange={setShowAIDraft}>
        <DialogContent className="border-[var(--border-color)] max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI-Drafted Justification</DialogTitle>
            <DialogDescription>
              Review and customize the AI-generated justification
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-[var(--light-blue)] rounded-lg">
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--text-color)]">
                {aiDraft || 'Loading draft...'}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Edit Justification</label>
              <Textarea
                value={aiDraft}
                onChange={(e) => setAiDraft(e.target.value)}
                className="border-[var(--border-color)] min-h-24"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowAIDraft(false)}
                disabled={saveDraftLoading}
                className="flex-1 border-[var(--border-color)]"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleAcceptAIDraft()}
                disabled={saveDraftLoading || !aiDraft.trim()}
                className="flex-1 bg-[var(--blue)] hover:bg-[var(--blue)]/90"
              >
                {saveDraftLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving…
                  </>
                ) : (
                  'Accept & Save'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
