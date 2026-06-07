import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Copy, FileText, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAIEngine } from '@/hooks/useAIEngine';
import { useAuth } from '@/contexts/AuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface AIChatPanelProps {
  onClose: () => void;
}

const suggestedPrompts = [
  'Help me draft a risk treatment plan for unauthorized access',
  'What are the key ISO 27001 requirements for access control?',
  'Generate a security incident response checklist',
  'Suggest controls for logistics company data protection',
];

export function AIChatPanel({ onClose }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const { sendPrompt, isLoading, engine, setEngine } = useAIEngine();
  const { user } = useAuth();
  const { isOnline } = useOnlineStatus();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    const aiMessageId = `${Date.now() + 1}`;
    const aiPlaceholder: Message = {
      id: aiMessageId,
      role: 'ai',
      content: '',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiPlaceholder]);

    const context = {
      organization: user?.orgName,
      sector: user?.orgSector,
      size: user?.orgSize,
      userRole: user?.role,
    };

    const response = await sendPrompt(messageText, context, {
      onToken: (_token, fullText) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMessageId ? { ...m, content: fullText } : m))
        );
      },
    });

    setMessages((prev) =>
      prev.map((m) => (m.id === aiMessageId ? { ...m, content: response } : m))
    );
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-end p-4 pointer-events-none">
      <div className="w-[380px] h-[calc(100vh-2rem)] bg-white rounded-lg shadow-2xl border border-[var(--border-color)] pointer-events-auto flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--ai-purple)]" />
            <span className="font-semibold">AI Assistant</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs cursor-pointer"
              onClick={() => setEngine(engine === 'ollama' ? 'gemini' : 'ollama')}
            >
              {engine}
            </Badge>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="px-4 py-2 bg-[var(--light-blue)] border-b border-[var(--border-color)]">
          <div className="text-xs text-[var(--text-color)]">
            <span className="font-medium">Context:</span> {user?.orgName} · {user?.orgSector}
          </div>
        </div>

        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--muted)] mb-3">
                How can I help you with ISO 27001 implementation today?
              </p>
              <div className="space-y-2">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="w-full text-left p-3 text-xs bg-gray-50 hover:bg-gray-100 rounded-lg border border-[var(--border-color)] transition-colors"
                    disabled={isLoading || !isOnline}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-[var(--blue)] text-white'
                      : 'bg-white border border-[var(--ai-purple)]'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  {msg.role === 'ai' && (
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => handleCopy(msg.content)}
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        Copy
                      </Button>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        <FileText className="w-3 h-3 mr-1" />
                        Use in Doc
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[var(--ai-purple)] rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[var(--ai-purple)] rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-[var(--ai-purple)] rounded-full animate-bounce delay-100" />
                    <div className="w-2 h-2 bg-[var(--ai-purple)] rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-[var(--border-color)]">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={isOnline ? "Ask me anything..." : "Offline - browsing cached responses only"}
              className="min-h-[80px] resize-none"
              disabled={isLoading || !isOnline}
            />
            <Button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading || !isOnline}
              className="bg-[var(--ai-purple)] hover:bg-[var(--ai-purple)]/90"
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
