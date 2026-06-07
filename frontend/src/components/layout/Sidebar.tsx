import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ListChecks,
  ShieldAlert,
  ClipboardCheck,
  FileDown,
  Activity,
  ScrollText,
  Users,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: ListChecks, label: 'Implementation Steps', path: '/steps' },
  { icon: ShieldAlert, label: 'Risk Register', path: '/risks' },
  { icon: ClipboardCheck, label: 'Statement of Applicability', path: '/soa' },
  { icon: FileDown, label: 'Documents', path: '/documents', roles: ['ISMS_Owner'] },
  { icon: Activity, label: 'Monitoring', path: '/monitoring' },
  { icon: ScrollText, label: 'Audit Log', path: '/audit-log', roles: ['ISMS_Owner', 'Auditor'] },
  { icon: Users, label: 'User Management', path: '/users', roles: ['ISMS_Owner'] },
  { icon: Settings, label: 'Settings', path: '/settings', roles: ['ISMS_Owner'] },
];

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

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();

  if (!user) return null;

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[var(--navy)] text-white flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-extrabold">ISMS Compass</h1>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.roles && !item.roles.includes(user.role)) {
            return null;
          }

          const isActive = location.pathname === item.path ||
                          (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span className="text-left leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 space-y-3 border-t border-white/20">
        <div className="px-2">
          <div className="text-xs text-white/60 mb-1">{user.orgName}</div>
          <div className="text-sm font-medium">{user.name}</div>
          <Badge className={`mt-1 text-xs ${getRoleBadgeColor(user.role)}`}>
            {user.role.replace('_', ' ')}
          </Badge>
        </div>
        <div className="flex items-center gap-2 px-2">
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-[var(--green)]' : 'bg-[var(--amber)]'}`} />
          <span className="text-xs text-white/70">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>
    </aside>
  );
}
