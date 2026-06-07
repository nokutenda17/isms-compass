import { Bell, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

export function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="fixed left-60 right-0 top-0 h-16 bg-white border-b border-[var(--border-color)] flex items-center justify-between px-6 z-10">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-[var(--text-color)]">
          {/* Page title will be set dynamically by each page */}
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-[var(--red)] text-white text-xs">
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="p-2">
              <div className="text-sm font-medium mb-2">Notifications</div>
              <div className="space-y-2">
                <div className="p-2 hover:bg-gray-50 rounded text-xs">
                  <div className="font-medium">Corrective Action Overdue</div>
                  <div className="text-gray-500">CA003 - Implement backup rotation schedule</div>
                </div>
                <div className="p-2 hover:bg-gray-50 rounded text-xs">
                  <div className="font-medium">New Security Incident</div>
                  <div className="text-gray-500">Suspicious login attempts detected</div>
                </div>
                <div className="p-2 hover:bg-gray-50 rounded text-xs">
                  <div className="font-medium">Audit Scheduled</div>
                  <div className="text-gray-500">Q1 2024 Internal Audit on March 25</div>
                </div>
              </div>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--blue)] text-white flex items-center justify-center text-sm font-medium">
            {user?.avatar || user?.name.slice(0, 2).toUpperCase()}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
