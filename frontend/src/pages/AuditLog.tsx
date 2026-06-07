import { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api';
import {
  ScrollText,
  Search,
  Download,
  Filter,
  User,
  Shield,
  CheckCircle,
  AlertCircle,
  Settings,
  LogIn,
  LogOut,
  FileText,
  Trash2,
  Edit3,
  UserPlus,
  UserMinus,
  Lock,
  Unlock,
  Eye,
  TriangleAlert as AlertTriangle,
} from 'lucide-react';

type AuditAction =
  | 'LOGIN'
  | 'LOGOUT'
  | 'STEP_COMPLETE'
  | 'RISK_CREATED'
  | 'RISK_UPDATED'
  | 'RISK_DELETED'
  | 'SOA_APPROVED'
  | 'SOA_UPDATED'
  | 'ROLE_CHANGE'
  | 'USER_INVITED'
  | 'USER_DEACTIVATED'
  | 'DOCUMENT_EXPORTED'
  | 'ACCESS_DENIED'
  | 'STEP_DRAFT_SAVED'
  | 'APPROVAL_GRANTED';

interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  actor: string;
  actorRole: string;
  description: string;
  metadata?: Record<string, string>;
  severity: 'info' | 'warning' | 'success' | 'danger';
}

const KNOWN_ACTIONS: AuditAction[] = [
  'LOGIN',
  'LOGOUT',
  'STEP_COMPLETE',
  'RISK_CREATED',
  'RISK_UPDATED',
  'RISK_DELETED',
  'SOA_APPROVED',
  'SOA_UPDATED',
  'ROLE_CHANGE',
  'USER_INVITED',
  'USER_DEACTIVATED',
  'DOCUMENT_EXPORTED',
  'ACCESS_DENIED',
  'STEP_DRAFT_SAVED',
  'APPROVAL_GRANTED',
];

function isAuditAction(value: string): value is AuditAction {
  return KNOWN_ACTIONS.includes(value as AuditAction);
}


const actionIcons: Record<AuditAction, React.ElementType> = {
  LOGIN: LogIn,
  LOGOUT: LogOut,
  STEP_COMPLETE: CheckCircle,
  RISK_CREATED: Shield,
  RISK_UPDATED: Edit3,
  RISK_DELETED: Trash2,
  SOA_APPROVED: CheckCircle,
  SOA_UPDATED: FileText,
  ROLE_CHANGE: User,
  USER_INVITED: UserPlus,
  USER_DEACTIVATED: UserMinus,
  DOCUMENT_EXPORTED: Download,
  ACCESS_DENIED: Lock,
  STEP_DRAFT_SAVED: Edit3,
  APPROVAL_GRANTED: Unlock,
};

const actionLabels: Record<AuditAction, string> = {
  LOGIN: 'Login',
  LOGOUT: 'Logout',
  STEP_COMPLETE: 'Step Completed',
  RISK_CREATED: 'Risk Created',
  RISK_UPDATED: 'Risk Updated',
  RISK_DELETED: 'Risk Deleted',
  SOA_APPROVED: 'SoA Approved',
  SOA_UPDATED: 'SoA Updated',
  ROLE_CHANGE: 'Role Changed',
  USER_INVITED: 'User Invited',
  USER_DEACTIVATED: 'User Deactivated',
  DOCUMENT_EXPORTED: 'Document Exported',
  ACCESS_DENIED: 'Access Denied',
  STEP_DRAFT_SAVED: 'Draft Saved',
  APPROVAL_GRANTED: 'Approval Granted',
};

const severityConfig = {
  info: { bg: 'bg-blue-50', icon: 'text-[#2E75B6]', border: 'border-l-[#2E75B6]' },
  success: { bg: 'bg-green-50', icon: 'text-[#2C6E49]', border: 'border-l-[#2C6E49]' },
  warning: { bg: 'bg-orange-50', icon: 'text-orange-600', border: 'border-l-orange-500' },
  danger: { bg: 'bg-red-50', icon: 'text-red-700', border: 'border-l-red-600' },
};

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
  };
}

// Map backend log entry to the AuditEntry shape used in the UI
function mapLogEntry(raw: Record<string, unknown>): AuditEntry {
  const rawAction = (raw.action as string) || 'LOGIN';
  const action: AuditAction = isAuditAction(rawAction) ? rawAction : 'LOGIN';
  const severityMap: Record<string, AuditEntry['severity']> = {
    RISK_DELETED: 'danger', ACCESS_DENIED: 'danger',
    RISK_CREATED: 'warning', RISK_UPDATED: 'warning', USER_DEACTIVATED: 'warning',
    SOA_APPROVED: 'success', STEP_COMPLETE: 'success', APPROVAL_GRANTED: 'success',
  };
  return {
    id: (raw.log_id as string) || String(Math.random()),
    timestamp: (raw.timestamp as string) || new Date().toISOString(),
    action,
    actor: (raw.user_name as string) || 'System',
    actorRole: (raw.user_role as string) || '',
    description: (raw.description as string) || '',
    metadata: raw.ip_address ? { ip: raw.ip_address as string } : undefined,
    severity: severityMap[action] || 'info',
  };
}

export function AuditLog() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [actorFilter, setActorFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetchLog = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '50' });
      if (actionFilter !== 'all') params.set('action', actionFilter);
      const data = await apiFetch<{ logs: Record<string, unknown>[]; total: number }>(
        `/audit-log?${params}`
      );
      setAuditLog((data.logs || []).map(mapLogEntry));
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Audit log fetch error:', e);
      setError(e instanceof Error ? e.message : 'Failed to load audit logs.');
    } finally {
      setIsLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const uniqueActors = useMemo(
    () => [...new Set(auditLog.map((e) => e.actor))].sort(),
    [auditLog]
  );

  const filtered = useMemo(() => {
    return auditLog.filter((entry) => {
      const matchSearch =
        !search ||
        entry.description.toLowerCase().includes(search.toLowerCase()) ||
        entry.actor.toLowerCase().includes(search.toLowerCase());
      const matchActor = actorFilter === 'all' || entry.actor === actorFilter;
      return matchSearch && matchActor;
    });
  }, [auditLog, search, actorFilter]);

  const today = new Date().toDateString();
  const stats = useMemo(() => ({
    total,
    today: auditLog.filter((e) => new Date(e.timestamp).toDateString() === today).length,
    warnings: auditLog.filter((e) => e.severity === 'warning').length,
    denied: auditLog.filter((e) => e.action === 'ACCESS_DENIED').length,
  }), [auditLog, total, today]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#404040]">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">
            Complete audit trail of all ISMS actions and events
          </p>
        </div>
        <Button className="bg-[#1F3864] hover:bg-[#1F3864]/90 text-white">
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-800">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLog} className="border-red-200 text-red-700 hover:bg-red-100">
            Retry
          </Button>
        </div>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: stats.total, icon: ScrollText, color: 'text-[#2E75B6]', bg: 'bg-[#D6E4F0]' },
          { label: 'Events Today', value: stats.today, icon: Eye, color: 'text-[#2C6E49]', bg: 'bg-green-100' },
          { label: 'Warnings', value: stats.warnings, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-100' },
          { label: 'Access Denied', value: stats.denied, icon: Lock, color: 'text-red-700', bg: 'bg-red-100' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-gray-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <div className="text-xl font-bold text-[#404040]">{value}</div>
                <div className="text-xs text-gray-500">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search events, users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 border-gray-200"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-48 border-gray-200">
                <Filter className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {(Object.keys(actionLabels) as AuditAction[]).map((action) => (
                  <SelectItem key={action} value={action}>
                    {actionLabels[action]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={actorFilter} onValueChange={setActorFilter}>
              <SelectTrigger className="w-48 border-gray-200">
                <User className="w-4 h-4 mr-2 text-gray-400" />
                <SelectValue placeholder="All users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {uniqueActors.map((actor) => (
                  <SelectItem key={actor} value={actor}>
                    {actor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(search || actionFilter !== 'all' || actorFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setActionFilter('all');
                  setActorFilter('all');
                }}
                className="text-[#2E75B6]"
              >
                Clear all
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card className="border-gray-200">
        <CardHeader className="pb-3 border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-[#404040]">
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== auditLog.length && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                (filtered from {auditLog.length} loaded)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ScrollText className="w-12 h-12 text-gray-200 mb-3" />
              <p className="font-medium text-gray-400">No audit events found</p>
              <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((entry) => {
                const Icon = actionIcons[entry.action] ?? FileText;
                const sev = severityConfig[entry.severity];
                const { date, time } = formatTimestamp(entry.timestamp);
                const isExpanded = expandedId === entry.id;

                return (
                  <div
                    key={entry.id}
                    className={`border-l-4 ${sev.border} hover:bg-gray-50 transition-colors cursor-pointer`}
                    onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                  >
                    <div className="flex items-start gap-4 p-4">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-full ${sev.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className={`w-4 h-4 ${sev.icon}`} />
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-[#404040]">
                            {entry.description}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs border-gray-200 text-gray-500 font-normal"
                          >
                            {actionLabels[entry.action] ?? entry.action}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                          <span className="font-medium text-[#404040]">{entry.actor}</span>
                          <span>·</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                              entry.actorRole === 'ISMS_Owner'
                                ? 'bg-[#D6E4F0] text-[#1F3864]'
                                : entry.actorRole === 'Contributor'
                                  ? 'bg-blue-100 text-[#2E75B6]'
                                  : entry.actorRole === 'Reviewer'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-green-100 text-[#2C6E49]'
                            }`}
                          >
                            {entry.actorRole}
                          </span>
                          <span>·</span>
                          <span>{date}</span>
                          <span>·</span>
                          <span className="font-mono">{time}</span>
                          <span>·</span>
                          <span className="text-gray-400">#{entry.id}</span>
                        </div>

                        {/* Expanded metadata */}
                        {isExpanded && entry.metadata && Object.keys(entry.metadata).length > 0 && (
                          <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-100">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                              Event Metadata
                            </p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                              {Object.entries(entry.metadata).map(([k, v]) => (
                                <div key={k} className="flex gap-2 text-xs">
                                  <span className="text-gray-400 font-medium min-w-20">{k}:</span>
                                  <span className="font-mono text-[#404040]">{v}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 text-center">
        Audit log entries are immutable and tamper-evident. All timestamps are in UTC.
      </p>
    </div>
  );
}
