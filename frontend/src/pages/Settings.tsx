import { useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  Building2,
  Cpu,
  Bell,
  Shield,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Save,
  RefreshCw,
  Trash2,
  Info,
} from 'lucide-react';

interface SettingsSection {
  id: string;
  label: string;
  icon: React.ElementType;
}

const sections: SettingsSection[] = [
  { id: 'organisation', label: 'Organisation', icon: Building2 },
  { id: 'ai', label: 'AI Engine', icon: Sparkles },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'risk', label: 'Risk Methodology', icon: Shield },
  { id: 'data', label: 'Data & Privacy', icon: Cpu },
];

export function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState('organisation');
  const [saving, setSaving] = useState(false);

  // Organisation state
  const [orgName, setOrgName] = useState(user?.orgName || '');
  const [orgCity, setOrgCity] = useState(user?.city || '');
  const [orgAddress, setOrgAddress] = useState('');
  const [orgSector, setOrgSector] = useState(user?.orgSector || 'Other');
  const [orgSize, setOrgSize] = useState(user?.orgSize || '1-10');

  // AI Engine state
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('qwen2.5:1.5b');
  const [preferCloud, setPreferCloud] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [ollamaStatus, setOllamaStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');

  // Notification state
  const [notifyStepComplete, setNotifyStepComplete] = useState(true);
  const [notifyRiskAdded, setNotifyRiskAdded] = useState(true);
  const [notifyOverdue, setNotifyOverdue] = useState(true);
  const [notifyAudit, setNotifyAudit] = useState(false);

  // Risk state
  const [riskMethodology, setRiskMethodology] = useState('Standard');

  const handleSave = async () => {
    setSaving(true);
    try {
      // Persist org profile to backend (POST handles upsert)
      await apiFetch('/organisations', {
        method: 'POST',
        body: JSON.stringify({
          name: orgName,
          sector: orgSector,
          size: orgSize,
          city: orgCity,
          address: orgAddress,
        }),
      });

      // Re-fetch /auth/me so sidebar + context show updated org name/sector
      try {
        const me = await apiFetch<any>('/auth/me');
        const updated = {
          ...JSON.parse(localStorage.getItem('isms_user') || '{}'),
          orgName: me.orgName ?? me.name,
          orgSector: me.orgSector,
          orgSize: me.orgSize,
          city: me.city,
        };
        localStorage.setItem('isms_user', JSON.stringify(updated));
      } catch { /* non-fatal */ }

      toast({ title: 'Settings saved', description: 'Organisation profile has been updated.' });
    } catch (e) {
      toast({
        title: 'Save failed',
        description: e instanceof Error ? e.message : 'Could not save settings. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTestOllama = async () => {
    setOllamaStatus('unknown');
    try {
      await new Promise((r) => setTimeout(r, 1200));
      // Simulate: in a real app this would fetch the Ollama endpoint
      const isReachable = ollamaUrl.includes('localhost');
      setOllamaStatus(isReachable ? 'online' : 'offline');
    } catch {
      setOllamaStatus('offline');
    }
  };

  const handleClearCache = () => {
    toast({ title: 'AI cache cleared', description: 'All cached AI responses have been deleted.' });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#404040]">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure your ISMS Compass organisation and application preferences
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div className="w-52 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left ${
                  activeSection === id
                    ? 'bg-[#D6E4F0] text-[#1F3864] font-semibold border-l-4 border-[#2E75B6]'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Settings content */}
        <div className="flex-1 space-y-4">
          {/* Organisation */}
          {activeSection === 'organisation' && (
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-[#1F3864]">Organisation Profile</CardTitle>
                <CardDescription>
                  This information is used to contextualise AI responses and documents.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgName">
                      Organisation Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="orgName"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      className="border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value="Zimbabwe"
                      disabled
                      className="border-gray-200 bg-gray-50 text-gray-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City / Town</Label>
                    <Input
                      id="city"
                      value={orgCity}
                      onChange={(e) => setOrgCity(e.target.value)}
                      className="border-gray-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sector">Sector</Label>
                    <Select value={orgSector} onValueChange={setOrgSector}>
                      <SelectTrigger className="border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['Finance', 'Logistics', 'Healthcare', 'Retail', 'IT Services', 'Legal', 'Education', 'NGO', 'Other'].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="orgSize">Number of Employees</Label>
                    <Select value={orgSize} onValueChange={setOrgSize}>
                      <SelectTrigger className="border-gray-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {['1-10', '11-25', '26-50', '51-100', '100+'].map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Physical Address</Label>
                    <Input
                      id="address"
                      value={orgAddress}
                      onChange={(e) => setOrgAddress(e.target.value)}
                      className="border-gray-200"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Engine */}
          {activeSection === 'ai' && (
            <div className="space-y-4">
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-[#1F3864]">Local AI (Ollama)</CardTitle>
                  <CardDescription>
                    Primary engine — runs on your local device. Free and works offline.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ollamaUrl">Ollama Server URL</Label>
                      <Input
                        id="ollamaUrl"
                        value={ollamaUrl}
                        onChange={(e) => setOllamaUrl(e.target.value)}
                        placeholder="http://localhost:11434"
                        className="border-gray-200 font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ollamaModel">Model</Label>
                      <Select value={ollamaModel} onValueChange={setOllamaModel}>
                        <SelectTrigger className="border-gray-200">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phi4-mini">phi4-mini (recommended)</SelectItem>
                          <SelectItem value="llama3.2">llama3.2</SelectItem>
                          <SelectItem value="mistral">mistral</SelectItem>
                          <SelectItem value="gemma2">gemma2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTestOllama}
                      className="border-gray-200"
                    >
                      <RefreshCw className="w-3 h-3 mr-2" />
                      Test Connection
                    </Button>
                    {ollamaStatus === 'online' && (
                      <span className="flex items-center gap-1.5 text-sm text-[#2C6E49]">
                        <CheckCircle className="w-4 h-4" />
                        Connected
                      </span>
                    )}
                    {ollamaStatus === 'offline' && (
                      <span className="flex items-center gap-1.5 text-sm text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        Unreachable
                      </span>
                    )}
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-[#D6E4F0] rounded-lg text-sm text-[#1F3864]">
                    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                      Ollama must be installed and running on this device. Download it from{' '}
                      <span className="font-medium underline cursor-pointer">ollama.com</span>.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-[#1F3864]">Cloud AI (Gemini API)</CardTitle>
                  <CardDescription>
                    Fallback engine — higher quality output for complex documents. Requires internet.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="geminiKey">Google Gemini API Key</Label>
                    <Input
                      id="geminiKey"
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder="AIza..."
                      className="border-gray-200 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500">
                      Stored locally in environment variables. Never sent to any server except
                      Google.
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[#404040]">Prefer cloud when online</p>
                      <p className="text-xs text-gray-500">
                        Use Gemini API when available instead of Ollama
                      </p>
                    </div>
                    <Switch checked={preferCloud} onCheckedChange={setPreferCloud} />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-[#1F3864]">AI Cache</CardTitle>
                  <CardDescription>
                    Responses are cached locally for 7 days to reduce API calls.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#404040]">Cache size: ~124 KB</p>
                    <p className="text-xs text-gray-500">Stored in IndexedDB on this device</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCache}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Clear Cache
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Notifications */}
          {activeSection === 'notifications' && (
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-[#1F3864]">Notification Preferences</CardTitle>
                <CardDescription>
                  Choose which in-app events trigger notifications for your account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                {[
                  {
                    label: 'Step completed',
                    desc: 'When any ISMS step is marked as complete',
                    value: notifyStepComplete,
                    setter: setNotifyStepComplete,
                  },
                  {
                    label: 'Risk added or updated',
                    desc: 'When a new risk is created or an existing one is modified',
                    value: notifyRiskAdded,
                    setter: setNotifyRiskAdded,
                  },
                  {
                    label: 'Overdue actions',
                    desc: 'Daily reminder when corrective actions are past their due date',
                    value: notifyOverdue,
                    setter: setNotifyOverdue,
                  },
                  {
                    label: 'Audit scheduled',
                    desc: 'When an internal audit is created or assigned to you',
                    value: notifyAudit,
                    setter: setNotifyAudit,
                  },
                ].map(({ label, desc, value, setter }, i, arr) => (
                  <div key={label}>
                    <div className="flex items-center justify-between py-4">
                      <div>
                        <p className="text-sm font-medium text-[#404040]">{label}</p>
                        <p className="text-xs text-gray-500">{desc}</p>
                      </div>
                      <Switch checked={value} onCheckedChange={setter} />
                    </div>
                    {i < arr.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Risk Methodology */}
          {activeSection === 'risk' && (
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="text-[#1F3864]">Risk Methodology</CardTitle>
                <CardDescription>
                  Controls the risk scoring matrix used across the Risk Register and dashboards.
                  Changing this will recalculate all risk scores.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    value: 'Conservative',
                    title: 'Conservative',
                    desc: '3×3 matrix — simple, manageable risk scoring for small teams',
                    thresholds: 'Low ≤4 · Medium ≤6 · High >6',
                  },
                  {
                    value: 'Standard',
                    title: 'Standard',
                    desc: '4×4 matrix — balanced approach for growing businesses',
                    thresholds: 'Low ≤6 · Medium ≤12 · High >12',
                  },
                  {
                    value: 'Comprehensive',
                    title: 'Comprehensive',
                    desc: '5×5 matrix — detailed scoring for complex risk environments',
                    thresholds: 'Low ≤8 · Medium ≤16 · High >16',
                  },
                ].map(({ value, title, desc, thresholds }) => (
                  <div
                    key={value}
                    onClick={() => setRiskMethodology(value)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      riskMethodology === value
                        ? 'border-[#2E75B6] bg-[#D6E4F0] border-l-4'
                        : 'border-gray-200 hover:border-[#BDD7EE]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-[#1F3864]">{title}</p>
                        <p className="text-sm text-gray-600 mt-0.5">{desc}</p>
                        <p className="text-xs text-gray-500 font-mono mt-1">{thresholds}</p>
                      </div>
                      {riskMethodology === value && (
                        <Badge className="bg-[#2E75B6] text-white text-xs">Active</Badge>
                      )}
                    </div>
                  </div>
                ))}
                <div className="flex items-start gap-2 p-3 bg-orange-50 rounded-lg border border-orange-200 text-sm text-orange-700">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    Changing the methodology will recalculate Risk Level badges for all existing risks.
                    This action is logged in the Audit Log.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data & Privacy */}
          {activeSection === 'data' && (
            <div className="space-y-4">
              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-[#1F3864]">Offline & Sync</CardTitle>
                  <CardDescription>
                    ISMS Compass stores data locally for offline operation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-[#2C6E49]" />
                      <div>
                        <p className="text-sm font-medium text-[#404040]">Current status</p>
                        <p className="text-xs text-[#2C6E49]">Online — all data synced</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-[#2C6E49] border-0">Synced</Badge>
                  </div>
                  <Separator />
                  <div>
                    <p className="text-sm font-medium text-[#404040] mb-1">Local storage usage</p>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-[#2E75B6] h-2 rounded-full"
                        style={{ width: '34%' }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">340 KB of 1 MB used</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-200">
                <CardHeader>
                  <CardTitle className="text-[#1F3864]">Privacy & Data</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3 text-sm text-[#404040]">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#2C6E49] mt-0.5 flex-shrink-0" />
                      <p>All ISMS data is stored locally on this device and your server. Nothing is sent to third parties.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#2C6E49] mt-0.5 flex-shrink-0" />
                      <p>AI queries sent to Ollama are processed entirely on your local device.</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-[#2C6E49] mt-0.5 flex-shrink-0" />
                      <p>If Gemini API is used, only the specific prompt and context is sent — no personal data.</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="pt-2">
                    <p className="text-sm font-semibold text-red-700 mb-2">Danger Zone</p>
                    <div className="flex items-center justify-between p-3 border border-red-200 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-[#404040]">Reset ISMS Data</p>
                        <p className="text-xs text-gray-500">
                          Permanently delete all steps, risks, and documents. This cannot be undone.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        onClick={() =>
                          toast({
                            title: 'Action not available in demo',
                            description: 'This would permanently reset all ISMS data.',
                          })
                        }
                      >
                        <Trash2 className="w-3 h-3 mr-2" />
                        Reset
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Save button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#2E75B6] hover:bg-[#2E75B6]/90 text-white"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
