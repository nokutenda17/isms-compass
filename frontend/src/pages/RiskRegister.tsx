import { useState, useEffect, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useAIEngine } from '@/hooks/useAIEngine';
import { useToast } from '@/hooks/use-toast';
import { Loader as Loader2, Plus, Sparkles, Download, TriangleAlert as AlertTriangle } from 'lucide-react';

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

function getTreatmentColor(treatment: string) {
  switch (treatment) {
    case 'Mitigate':
      return 'bg-blue-100 text-[var(--blue)]';
    case 'Accept':
      return 'bg-gray-100 text-gray-700';
    case 'Transfer':
      return 'bg-purple-100 text-purple-700';
    case 'Avoid':
      return 'bg-red-100 text-[var(--red)]';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function RiskRegister() {
  const { user } = useAuth();
  const { sendPrompt, isLoading: aiLoading } = useAIEngine();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [treatmentFilter, setTreatmentFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { toast } = useToast();
  // ── Live data from backend ──────────────────────────────────────────────────
  const [risks, setRisks] = useState<Record<string, unknown>[]>([]);
  const [apiLoading, setApiLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchRisks = useCallback(async () => {
    setApiLoading(true);
    setApiError(null);
    try {
      const params = new URLSearchParams();
      if (levelFilter !== 'all') params.set('level', levelFilter);
      if (treatmentFilter !== 'all') params.set('treatment', treatmentFilter);
      if (globalFilter) params.set('search', globalFilter);
      const data = await apiFetch<{ risks: Record<string, unknown>[]; total: number }>(
        `/risks?${params}`
      );
      setRisks(data.risks);
    } catch (e: unknown) {
      setApiError(e instanceof Error ? e.message : 'Failed to load risks');
    } finally {
      setApiLoading(false);
    }
  }, [levelFilter, treatmentFilter, globalFilter]);

  useEffect(() => { fetchRisks(); }, [fetchRisks]);

  const [newRisk, setNewRisk] = useState({
    asset: '',
    threat: '',
    vulnerability: '',
    likelihood: 3,
    impact: 3,
  });

  // Filtering now happens server-side via query params; risks is already filtered
  const filteredRisks = risks;

  const table = useReactTable({
    data: filteredRisks,
    columns: [
      {
        accessorKey: 'risk_id',
        header: 'ID',
        cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
      },
      {
        accessorKey: 'asset',
        header: 'Asset',
        cell: (info) => <span className="font-medium">{info.getValue()}</span>,
      },
      {
        accessorKey: 'threat',
        header: 'Threat',
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
      },
      {
        accessorKey: 'likelihood',
        header: 'Likelihood',
        cell: (info) => {
          const value = info.getValue() as number;
          return <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-[var(--light-blue)] text-[var(--navy)] font-bold text-sm">{value}</span>;
        },
      },
      {
        accessorKey: 'impact',
        header: 'Impact',
        cell: (info) => {
          const value = info.getValue() as number;
          return <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-[var(--mid-blue)] text-[var(--navy)] font-bold text-sm">{value}</span>;
        },
      },
      {
        accessorKey: 'score',
        header: 'Score',
        cell: (info) => <span className="font-bold text-lg">{info.getValue()}</span>,
      },
      {
        accessorKey: 'risk_level',
        header: 'Level',
        cell: (info) => (
          <Badge className={`text-xs ${getRiskLevelColor(info.getValue() as string)}`}>
            {info.getValue()}
          </Badge>
        ),
      },
      {
        accessorKey: 'treatment',
        header: 'Treatment',
        cell: (info) => (
          <Badge variant="outline" className={`text-xs ${getTreatmentColor(info.getValue() as string)}`}>
            {info.getValue()}
          </Badge>
        ),
      },
      {
        accessorKey: 'owner',
        header: 'Owner',
        cell: (info) => <span className="text-sm">{info.getValue()}</span>,
      },
    ],
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
  });

  const handleAddRisk = async () => {
    try {
      await apiFetch('/risks', {
        method: 'POST',
        body: JSON.stringify(newRisk),
      });
      setShowAddDialog(false);
      setNewRisk({ asset: '', threat: '', vulnerability: '', likelihood: 3, impact: 3 });
      fetchRisks();
    } catch (e: unknown) {
      toast({ title: 'Error adding risk', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  const handleAISuggest = async () => {
    const context = {
      organization: user?.orgName,
      sector: user?.orgSector,
      existingRisks: risks.length,
    };

    const prompt = `As an ISO 27001 expert, suggest 3 new risks specific to a ${user?.orgSector} company in Zimbabwe with ${user?.orgSize} employees. Format as JSON array.`;

    await sendPrompt(prompt, context);
  };

  const handleExport = () => {
    const csv = [
      ['ID', 'Asset', 'Threat', 'Vulnerability', 'Likelihood', 'Impact', 'Score', 'Level', 'Treatment', 'Owner', 'Status'],
      ...filteredRisks.map((r: Record<string, unknown>) => [
        r.risk_id, r.asset, r.threat, r.vulnerability, r.likelihood, r.impact, r.score, r.risk_level, r.treatment, r.owner, r.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk-register-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-color)] mb-2">Risk Register</h1>
        <p className="text-[var(--muted)]">Identify, assess, and manage security risks</p>
      </div>

      {apiLoading && <p className="text-center py-8 text-[var(--muted)]">Loading risks…</p>}
      {apiError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-800">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm font-medium">{apiError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchRisks} className="border-red-200 text-red-700 hover:bg-red-100">
            Retry
          </Button>
        </div>
      )}
      {!apiLoading && !apiError && <Card className="border-[var(--border-color)]">
        <CardHeader>
          <CardTitle>Risk Assessment</CardTitle>
          <CardDescription>
            {filteredRisks.length} risk{filteredRisks.length !== 1 ? 's' : ''} identified · {risks.filter((r: Record<string, unknown>) => r.risk_level === 'High').length} high
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search assets, threats, vulnerabilities..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="flex-1 border-[var(--border-color)]"
              />
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-32 border-[var(--border-color)]">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={treatmentFilter} onValueChange={setTreatmentFilter}>
                <SelectTrigger className="w-32 border-[var(--border-color)]">
                  <SelectValue placeholder="Treatment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Treatments</SelectItem>
                  <SelectItem value="Mitigate">Mitigate</SelectItem>
                  <SelectItem value="Accept">Accept</SelectItem>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                  <SelectItem value="Avoid">Avoid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-[var(--blue)] hover:bg-[var(--blue)]/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Risk
              </Button>
              <Button
                onClick={handleAISuggest}
                variant="outline"
                disabled={aiLoading}
                className="border-[var(--ai-purple)] text-[var(--ai-purple)]"
              >
                {aiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Suggesting...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Suggest
                  </>
                )}
              </Button>
              {user?.role === 'ISMS_Owner' && (
                <Button
                  onClick={handleExport}
                  variant="outline"
                  className="border-[var(--border-color)]"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>

          <div className="border border-[var(--border-color)] rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-[var(--light-blue)]">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="hover:bg-transparent">
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="text-[var(--navy)] font-semibold cursor-pointer"
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <div className="flex items-center gap-1">
                          {header.isPlaceholder ? null : (
                            typeof header.column.columnDef.header === 'string'
                              ? header.column.columnDef.header
                              : header.column.id
                          )}
                          {header.column.getIsSorted() && (
                            <span className="text-xs">
                              {header.column.getIsSorted() === 'desc' ? ' 🔽' : ' 🔼'}
                            </span>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50 border-[var(--border-color)]">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="p-3">
                        {cell.column.columnDef.cell
                          ? (cell.column.columnDef.cell as any)(cell.getContext())
                          : (cell.getValue() as any)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--muted)]">
              Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="border-[var(--border-color)]"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="border-[var(--border-color)]"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle>Add New Risk</DialogTitle>
            <DialogDescription>
              Identify and document a new security risk
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Asset</Label>
              <Input
                placeholder="e.g., Customer Database"
                value={newRisk.asset}
                onChange={(e) => setNewRisk({ ...newRisk, asset: e.target.value })}
                className="border-[var(--border-color)]"
              />
            </div>
            <div className="space-y-2">
              <Label>Threat</Label>
              <Textarea
                placeholder="Describe the threat..."
                value={newRisk.threat}
                onChange={(e) => setNewRisk({ ...newRisk, threat: e.target.value })}
                className="border-[var(--border-color)]"
              />
            </div>
            <div className="space-y-2">
              <Label>Vulnerability</Label>
              <Textarea
                placeholder="Describe the vulnerability..."
                value={newRisk.vulnerability}
                onChange={(e) => setNewRisk({ ...newRisk, vulnerability: e.target.value })}
                className="border-[var(--border-color)]"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Likelihood (1-5)</Label>
                <Select value={newRisk.likelihood.toString()} onValueChange={(v) => setNewRisk({ ...newRisk, likelihood: parseInt(v) })}>
                  <SelectTrigger className="border-[var(--border-color)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Remote</SelectItem>
                    <SelectItem value="2">2 - Low</SelectItem>
                    <SelectItem value="3">3 - Medium</SelectItem>
                    <SelectItem value="4">4 - High</SelectItem>
                    <SelectItem value="5">5 - Very High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Impact (1-5)</Label>
                <Select value={newRisk.impact.toString()} onValueChange={(v) => setNewRisk({ ...newRisk, impact: parseInt(v) })}>
                  <SelectTrigger className="border-[var(--border-color)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Minimal</SelectItem>
                    <SelectItem value="2">2 - Low</SelectItem>
                    <SelectItem value="3">3 - Medium</SelectItem>
                    <SelectItem value="4">4 - High</SelectItem>
                    <SelectItem value="5">5 - Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAddRisk} className="w-full bg-[var(--blue)] hover:bg-[var(--blue)]/90">
              Create Risk
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
