import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Chrome as Home } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-16rem)]">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-[var(--navy)] mb-4">404</h1>
        <p className="text-xl text-[var(--text-color)] mb-2">Page Not Found</p>
        <p className="text-[var(--muted)] mb-6">The page you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/dashboard')} className="bg-[var(--navy)]">
          <Home className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    </div>
  );
}
