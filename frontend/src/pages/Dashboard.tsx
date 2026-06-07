import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { apiFetch } from '@/lib/api';
import { CircleCheck as CheckCircle2, Clock, TriangleAlert as AlertTriangle, FileCheck, ChevronRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

function MetricCard({ title, value, icon: Icon, color, trend }: any) {
  return (
    <Card className="border-[var(--border-color)]">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[var(--muted)] mb-1">{title}</p>
            <p className="text-3xl font-bold text-[var(--text-color)]">{value}</p>
            {trend && <p className="text-xs text-[var(--muted)] mt-1">{trend}</p>}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getStepStatusColor(status: string) {
  switch (status) {
    case 'Complete':
      return 'bg-[var(--green)] text-white';
    case 'In Progress':
      return 'bg-[var(--blue)] text-white';
    case 'Locked':
      return 'bg-gray-300 text-gray-600';
    default:
      return 'bg-gray-200 text-gray-600';
  }
}

function getRiskLevelColor(level: string) {
  switch (level) {
    case 'Critical':
      return 'bg-[var(--red)] text-white';
    case 'High':
      return 'bg-[var(--amber)] text-white';
    case 'Medium':
      return 'bg-yellow-500 text-white';
    case 'Low':
      return 'bg-[var(--green)] text-white';
    default:
      return 'bg-gray-400 text-white';
  }
}

/** API / DB use `risk_level`; keep `level` fallback for older mocks. */
function rowRiskLevel(risk: { risk_level?: unknown; level?: unknown }): string {
  const v = risk.risk_level ?? risk.level;
  return typeof v === 'string' ? v : '';
}

export function Dashboard() {
  const { user } = useAuth();
  // ── Live data ──────────────────────────────────────────────────────────────
  const [steps, setSteps] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [correctiveActions, setCorrectiveActions] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoadingData(true);
    setError(null);
    try {
      const [stepsData, risksData, actionsData, metricsData, insightsData] = await Promise.all([
        apiFetch<any[]>('/steps'),
        apiFetch<{ risks: any[] }>('/risks?per_page=100'),
        apiFetch<any[]>('/monitoring/corrective-actions').catch(() => []),
        apiFetch<any>('/dashboard/metrics').catch(() => null),
        apiFetch<any>('/dashboard/ai-insights').catch(() => null),
      ]);
      setSteps(stepsData);
      setRisks(risksData.risks);
      setCorrectiveActions(Array.isArray(actionsData) ? actionsData : []);
      setMetrics(metricsData);
      setAiInsights(insightsData);
    } catch (e) {
      console.error('Dashboard fetch error:', e);
      setError(e instanceof Error ? e.message : 'Failed to load dashboard data. Please check your connection.');
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const navigate = useNavigate();
  const completedSteps = metrics?.stepsComplete ?? steps.filter(s => s.status === 'Complete').length;
  const totalSteps = metrics?.totalSteps ?? (steps.length || 10);
  const completionPercentage = Math.round((completedSteps / totalSteps) * 100) || 0;

  const criticalRisks =
    metrics?.highRisks ??
    risks.filter((r) => ['High', 'Critical'].includes(rowRiskLevel(r))).length;
  const openActions = metrics?.openActions ?? correctiveActions.filter(a => a.status !== 'Closed').length;
  const overdueActions = metrics?.overdueActions ?? correctiveActions.filter(a =>
    a.status !== 'Closed' && new Date(a.dueDate as string) < new Date()
  ).length;
  
  const controlsDefined = metrics?.controlsDefined ?? 0;
  const totalControls = metrics?.totalControls ?? 93;

  const risksByLevel = risks.reduce((acc, risk) => {
    const level = rowRiskLevel(risk);
    if (level) acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-color)] mb-2">Dashboard</h1>
        <p className="text-[var(--muted)]">Welcome back, track your ISO 27001 implementation progress</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-800">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDashboard} className="border-red-200 text-red-700 hover:bg-red-100">
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Implementation Progress"
          value={`${completionPercentage}%`}
          icon={CheckCircle2}
          color="bg-[var(--blue)]"
          trend={`${completedSteps} of ${totalSteps} steps complete`}
        />
        <MetricCard
          title="Critical Risks"
          value={criticalRisks}
          icon={AlertTriangle}
          color="bg-[var(--red)]"
          trend="Requires immediate attention"
        />
        <MetricCard
          title="Open Actions"
          value={openActions}
          icon={Clock}
          color="bg-[var(--amber)]"
          trend={overdueActions > 0 ? `${overdueActions} overdue` : 'All on track'}
        />
        <MetricCard
          title="Controls Defined"
          value={`${controlsDefined}/${totalControls}`}
          icon={FileCheck}
          color="bg-[var(--green)]"
          trend="From Annex A"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-[var(--border-color)]">
            <CardHeader>
              <CardTitle>Implementation Steps</CardTitle>
              <CardDescription>Your progress through the 10-step ISMS framework</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {steps.slice(0, 6).map((step) => (
                <div
                  key={step.stepNumber}
                  className="flex items-center justify-between p-3 rounded-lg border border-[var(--border-color)] hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/steps/${step.stepNumber}`)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-[var(--light-blue)] flex items-center justify-center text-sm font-bold text-[var(--navy)]">
                      {step.stepNumber}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{step.title}</div>
                      {step.status === 'In Progress' && step.progress && (
                        <Progress value={step.progress} className="mt-1 h-1" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getStepStatusColor(step.status)}`}>
                      {step.status}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
                  </div>
                </div>
              ))}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/steps')}
              >
                View All Steps
              </Button>
            </CardContent>
          </Card>

          <Card className="border-[var(--border-color)]">
            <CardHeader>
              <CardTitle>Open Corrective Actions</CardTitle>
              <CardDescription>Actions requiring your attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {correctiveActions.map((action) => (
                  <div
                    key={action.id}
                    className="flex items-start justify-between p-3 rounded-lg border border-[var(--border-color)]"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{action.title}</div>
                      <div className="text-xs text-[var(--muted)] mt-1">
                        Assigned to {action.assignedTo} · Due {new Date(action.dueDate).toLocaleDateString()}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={new Date(action.dueDate) < new Date() ? 'border-[var(--red)] text-[var(--red)]' : ''}
                    >
                      {action.priority}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-[var(--border-color)]">
            <CardHeader>
              <CardTitle>Risk Heatmap</CardTitle>
              <CardDescription>Current risk distribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {['Critical', 'High', 'Medium', 'Low'].map((level) => (
                  <div key={level} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${getRiskLevelColor(level).split(' ')[0]}`} />
                      <span className="text-sm">{level}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {risksByLevel[level] || 0}
                    </Badge>
                  </div>
                ))}
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => navigate('/risks')}
                >
                  View Risk Register
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-[var(--border-color)] bg-gradient-to-br from-purple-50 to-white">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[var(--ai-purple)]" />
                <CardTitle>AI Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Intro sentence — from API or derived from user context */}
              <p className="text-sm text-[var(--text-color)]">
                {aiInsights?.intro
                  ? aiInsights.intro
                  : `Based on ${
                      user?.orgName ?? 'your organisation'
                    }'s${
                      user?.orgSector ? ` ${user.orgSector} operations` : ' operations'
                    }${
                      user?.city ? ` in ${user.city}` : ''
                    }, consider the following priorities:`
                }
              </p>

              {/* Sector-specific tips */}
              <ul className="text-sm space-y-2 text-[var(--text-color)]">
                {(aiInsights?.tips ?? []).map((tip: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[var(--ai-purple)] mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>

              {/* Data-driven observations (low compliance, high risks, overdue actions) */}
              {(aiInsights?.observations ?? []).length > 0 && (
                <div className="border-t border-purple-100 pt-3 space-y-2">
                  {(aiInsights.observations as string[]).map((obs: string, i: number) => (
                    <p key={i} className="text-xs text-[var(--muted)] leading-relaxed">
                      <span className="text-[var(--ai-purple)] font-semibold">⚠ </span>{obs}
                    </p>
                  ))}
                </div>
              )}

              <Button
                variant="outline"
                className="w-full text-[var(--ai-purple)] border-[var(--ai-purple)]"
                size="sm"
                onClick={() => navigate('/risks')}
              >
                View Risk Register
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
