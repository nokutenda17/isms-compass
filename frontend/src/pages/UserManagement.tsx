import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Plus, Mail, Copy, Trash2, ChevronDown, TriangleAlert as AlertTriangle } from 'lucide-react';

function getRoleBadgeColor(role: string) {
  switch (role) {
    case 'ISMS_Owner':
      return 'bg-[var(--navy)] text-white';
    case 'Contributor':
      return 'bg-[var(--blue)] text-white';
    case 'Reviewer':
      return 'bg-[var(--mid-blue)] text-[var(--navy)]';
    case 'Auditor':
      return 'bg-[var(--green)] text-white';
    default:
      return 'bg-gray-500 text-white';
  }
}

function MetricCard({ title, role, allUsers }: { title: string; role: string; allUsers: any[] }) {
  const filtered = allUsers.filter((u) => u.role === role);
  return (
    <Card className="border-[var(--border-color)]">
      <CardContent className="p-6">
        <div className="text-sm text-[var(--muted)] mb-1">{title}</div>
        <p className="text-3xl font-bold text-[var(--text-color)]">{filtered.length}</p>
        <div className="flex gap-1 flex-wrap mt-3">
          {filtered.map((u) => (
            <Badge key={u.user_id as string} variant="outline" className="text-xs">
              {(u.name as string).split(' ')[0]}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
  const [inviteResult, setInviteResult] = useState<{ invite_code: string; message: string } | null>(null);
  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const data = await apiFetch<any[]>('/users');
      setUsers(data);
    } catch (e) {
      console.error('Failed to fetch users:', e);
      setUsersError(e instanceof Error ? e.message : 'Failed to load users.');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [selectedUserForDeactivate, setSelectedUserForDeactivate] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Contributor');
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteCode, setShowInviteCode] = useState(false);

  const handleGenerateInvite = async () => {
    try {
      const data = await apiFetch<{ invite_code: string; message: string }>('/users/invite', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      setInviteResult(data);
      setInviteCode(data.invite_code);
      setShowInviteCode(true);
      fetchUsers();
    } catch (e: unknown) {
      toast({ title: 'Invite Failed', description: e instanceof Error ? e.message : 'Failed to create invite', variant: 'destructive' });
    }
  };

  const handleCopyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
  };

  const handleUpdateRole = (userId: string, newRole: string) => {
    setUsers(users.map(u =>
      u.id === userId ? { ...u, role: newRole as any } : u
    ));
    setEditingUserId(null);
  };

  const handleDeactivate = () => {
    if (selectedUserForDeactivate) {
      setUsers(users.map(u =>
        u.id === selectedUserForDeactivate ? { ...u, status: 'inactive' } : u
      ));
      setShowDeactivateDialog(false);
      setSelectedUserForDeactivate(null);
    }
  };

  const handleSendInvite = () => {
    setShowInviteDialog(false);
    setInviteEmail('');
    setInviteRole('Contributor');
  };

  const activeUsers = users.filter(u => u.status === 'active');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-color)] mb-2">User Management</h1>
          <p className="text-[var(--muted)]">Manage team members and their access roles</p>
        </div>
        <Button
          onClick={() => setShowInviteDialog(true)}
          className="bg-[var(--blue)] hover:bg-[var(--blue)]/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Invite User
        </Button>
      </div>

      {usersError && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-800">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm font-medium">{usersError}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchUsers} className="border-red-200 text-red-700 hover:bg-red-100">
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard title="ISMS Owners" role="ISMS_Owner" allUsers={users} />
        <MetricCard title="Contributors" role="Contributor" allUsers={users} />
        <MetricCard title="Reviewers" role="Reviewer" allUsers={users} />
        <MetricCard title="Auditors" role="Auditor" allUsers={users} />
      </div>

      <Card className="border-[var(--border-color)]">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            {activeUsers.length} active user{activeUsers.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-color)]">
                  <th className="text-left py-3 px-4 font-semibold text-sm text-[var(--text-color)]">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-[var(--text-color)]">Email</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-[var(--text-color)]">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-[var(--text-color)]">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-[var(--text-color)]">Last Login</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm text-[var(--text-color)]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--border-color)] hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[var(--blue)] text-white flex items-center justify-center text-sm font-medium">
                          {user.avatar || user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-sm">{user.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-[var(--muted)]">{user.email}</span>
                    </td>
                    <td className="py-3 px-4">
                      {editingUserId === user.id ? (
                        <Select value={editingRole} onValueChange={(v) => {
                          handleUpdateRole(user.id, v);
                        }}>
                          <SelectTrigger className="w-32 h-8 border-[var(--border-color)]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ISMS_Owner">ISMS Owner</SelectItem>
                            <SelectItem value="Contributor">Contributor</SelectItem>
                            <SelectItem value="Reviewer">Reviewer</SelectItem>
                            <SelectItem value="Auditor">Auditor</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <div
                          className="inline-flex items-center gap-1 cursor-pointer"
                          onClick={() => {
                            setEditingUserId(user.id);
                            setEditingRole(user.role);
                          }}
                        >
                          <Badge className={`text-xs ${getRoleBadgeColor(user.role)}`}>
                            {user.role.replace('_', ' ')}
                          </Badge>
                          <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant="outline"
                        className={user.status === 'active' ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]' : 'bg-gray-100 text-gray-700'}
                      >
                        {user.status === 'active' ? '● Active' : '● Inactive'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-[var(--muted)]">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedUserForDeactivate(user.id);
                          setShowDeactivateDialog(true);
                        }}
                        disabled={user.status === 'inactive'}
                      >
                        <Trash2 className="w-4 h-4 text-[var(--red)]" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="border-[var(--border-color)]">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Add a new user to your ISMS Compass organization
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="colleague@company.co.zw"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="border-[var(--border-color)]"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="border-[var(--border-color)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ISMS_Owner">ISMS Owner</SelectItem>
                  <SelectItem value="Contributor">Contributor</SelectItem>
                  <SelectItem value="Reviewer">Reviewer</SelectItem>
                  <SelectItem value="Auditor">Auditor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showInviteCode ? (
              <div className="space-y-2 p-4 bg-[var(--light-blue)] rounded-lg">
                <div className="text-sm font-medium text-[var(--navy)]">Invite Code Generated</div>
                <div className="font-mono text-lg font-bold text-[var(--navy)] break-all">
                  {inviteCode}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyInviteCode}
                  className="w-full"
                >
                  <Copy className="w-3 h-3 mr-2" />
                  Copy Code
                </Button>
                <p className="text-xs text-[var(--muted)]">
                  Share this code with the user to accept the invitation
                </p>
              </div>
            ) : (
              <>
                <Button
                  onClick={handleGenerateInvite}
                  className="w-full bg-[var(--blue)] hover:bg-[var(--blue)]/90"
                >
                  Generate Invite Code
                </Button>
                <p className="text-xs text-center text-[var(--muted)]">
                  Or send email invite
                </p>
                <Button
                  onClick={handleSendInvite}
                  variant="outline"
                  className="w-full border-[var(--border-color)]"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email Invite
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent className="border-[var(--border-color)]">
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate User</AlertDialogTitle>
            <AlertDialogDescription>
              This user will lose access to ISMS Compass. You can reactivate them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-3">
            <AlertDialogCancel className="border-[var(--border-color)]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-[var(--red)] hover:bg-[var(--red)]/90"
            >
              Deactivate
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
