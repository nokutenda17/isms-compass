import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate, useLocation } from 'react-router-dom';
import { CircleCheck as CheckCircle2, Lock, Play, Loader2, TriangleAlert as AlertTriangle } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { Button } from '@/components/ui/button';

interface Step {
  stepNumber: number;
  title: string;
  status: string;
  description?: string;
  progress?: number;
  assignedTo?: string;
}

function getStepStatusIcon(status: string) {
  switch (status) {
    case 'Complete':   return CheckCircle2;
    case 'In Progress': return Play;
    default:           return Lock;
  }
}

function getStepStatusColor(status: string) {
  switch (status) {
    case 'Complete':    return 'bg-[var(--green)] text-white';
    case 'In Progress': return 'bg-[var(--blue)] text-white';
    default:            return 'bg-gray-300 text-gray-600';
  }
}

export function StepOverview() {
  const navigate = useNavigate();
  const location = useLocation();
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSteps = () => {
    setLoading(true);
    setError(null);
    let active = true;
    apiFetch<Step[]>('/steps')
      .then(data => { if (active) { setSteps(data); setLoading(false); } })
      .catch(e => { if (active) { setError(e.message); setLoading(false); } });
    return () => { active = false; };
  };

  useEffect(() => {
    const cleanup = fetchSteps();
    return cleanup;
  }, [location.key]);

  const completedSteps = steps.filter(s => s.status === 'Complete').length;
  const total = steps.length || 10;

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-[var(--blue)]" />
      <span className="ml-3 text-[var(--muted)]">Loading steps…</span>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 max-w-md mx-auto">
      <div className="bg-red-50 border border-red-200 p-6 rounded-xl w-full text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Steps</h2>
        <p className="text-red-600 mb-6">{error}</p>
        <Button onClick={fetchSteps} className="bg-red-600 hover:bg-red-700 text-white">Retry</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-color)] mb-2">Implementation Steps</h1>
        <p className="text-[var(--muted)]">Follow these 10 steps to achieve ISO 27001 certification</p>
      </div>

      <Card className="border-[var(--border-color)] bg-[var(--light-blue)]">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm font-bold">{completedSteps} of {total} complete</span>
          </div>
          <Progress value={(completedSteps / total) * 100} className="h-2" />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {steps.map((step) => {
          const Icon = getStepStatusIcon(step.status);
          const isLocked = step.status === 'Locked' || step.status === 'Not Started';

          return (
            <Card
              key={step.stepNumber}
              className={`border-[var(--border-color)] ${isLocked ? 'opacity-60' : 'hover:shadow-md cursor-pointer'} transition-all`}
              onClick={() => !isLocked && navigate(`/steps/${step.stepNumber}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--light-blue)] flex items-center justify-center text-lg font-bold text-[var(--navy)]">
                      {step.stepNumber}
                    </div>
                    <div>
                      <CardTitle className="text-base text-[var(--text-color)]">{step.title}</CardTitle>
                      {step.description && (
                        <CardDescription className="text-xs mt-1 text-[var(--muted)]">{step.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <Icon className={`w-5 h-5 ${step.status === 'Complete' ? 'text-[var(--green)]' : step.status === 'In Progress' ? 'text-[var(--blue)]' : 'text-gray-400'}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge className={`text-xs ${getStepStatusColor(step.status)}`}>
                    {step.status}
                  </Badge>
                  {step.progress !== undefined && step.status === 'In Progress' && (
                    <span className="text-xs text-[var(--muted)]">{step.progress}% complete</span>
                  )}
                </div>
                {step.progress !== undefined && step.status === 'In Progress' && (
                  <Progress value={step.progress} className="mt-3 h-1" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
