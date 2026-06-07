import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CircleAlert as AlertCircle } from 'lucide-react';
import { AIChatPanel } from '@/components/AIChatPanel';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isOnline } = useOnlineStatus();
  const [showAIChat, setShowAIChat] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--page-bg)]">
      <Sidebar />
      <TopBar />

      <main className="ml-60 pt-16 min-h-screen">
        {!isOnline && (
          <Alert className="m-6 border-[var(--amber)] bg-amber-50">
            <AlertCircle className="h-4 w-4 text-[var(--amber)]" />
            <AlertDescription className="text-[var(--amber)]">
              You are offline. Previously loaded data is still available.
            </AlertDescription>
          </Alert>
        )}

        <div className="p-6">
          {children}
        </div>
      </main>

      <Button
        onClick={() => setShowAIChat(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-[var(--ai-purple)] hover:bg-[var(--ai-purple)]/90 shadow-lg z-50"
        size="icon"
      >
        <Sparkles className="w-6 h-6 text-white" />
      </Button>

      {showAIChat && <AIChatPanel onClose={() => setShowAIChat(false)} />}
    </div>
  );
}
