import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { apiFetch } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Download, Eye, Package, Loader as Loader2, CircleCheck as CheckCircle2, CircleAlert as AlertCircle, TriangleAlert as AlertTriangle } from 'lucide-react';

interface DocumentCardProps {
  document: any;
  onPreview: (doc: any) => void;
  onExport: (doc: any) => void;
}

function DocumentStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'Ready':
      return <CheckCircle2 className="w-5 h-5 text-[var(--green)]" />;
    case 'Needs Update':
      return <AlertCircle className="w-5 h-5 text-[var(--amber)]" />;
    case 'Not Generated':
      return <Loader2 className="w-5 h-5 text-[var(--muted)]" />;
    default:
      return null;
  }
}

function DocumentCard({ document, onPreview, onExport }: DocumentCardProps) {
  return (
    <Card className="border-[var(--border-color)] hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{document.name}</CardTitle>
            <CardDescription className="text-xs mt-1">{document.type}</CardDescription>
          </div>
          <DocumentStatusIcon status={document.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <span>
            {document.status === 'Ready' ? (
              <span className="text-[var(--green)]">● Ready for export</span>
            ) : document.status === 'Needs Update' ? (
              <span className="text-[var(--amber)]">● Needs update before export</span>
            ) : (
              <span>● Not yet generated</span>
            )}
          </span>
          {document.version && <span>v{document.version}</span>}
        </div>

        {document.lastUpdated && (
          <div className="text-xs text-[var(--muted)]">
            Last updated: {new Date(document.lastUpdated).toLocaleDateString()}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onPreview(document)}
            className="flex-1 border-[var(--border-color)]"
            disabled={document.status === 'Not Generated'}
          >
            <Eye className="w-3 h-3 mr-1" />
            Preview
          </Button>
          <Button
            size="sm"
            onClick={() => onExport(document)}
            className="flex-1 bg-[var(--blue)] hover:bg-[var(--blue)]/90"
            disabled={document.status === 'Not Generated'}
          >
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DocumentExport() {
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [exportingDoc, setExportingDoc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchDocuments = useCallback(async () => {
    setDocsLoading(true);
    setError(null);
    try {
      const data = await apiFetch<any[]>('/documents/status');
      setDocuments(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load documents:', e);
      setError(e instanceof Error ? e.message : 'Failed to load documents.');
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleExportDocument = async (doc: any) => {
    const docId = doc.doc_id || doc.id;
    setExportingDoc(docId);
    try {
      const token = localStorage.getItem('isms_access_token');
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const docType = encodeURIComponent(String(doc.type || docId));
      const res = await fetch(`${API_BASE}/export/${docType}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${(doc.name || 'document').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.docx`;
        a.click();
        window.URL.revokeObjectURL(url);
        fetchDocuments(); // refresh status
      } else {
        toast({ title: 'Export failed', description: 'Please try again later.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Export error', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    } finally {
      setExportingDoc(null);
    }
  };

  const handleExportAuditPackage = async () => {
    try {
      const token = localStorage.getItem('isms_access_token');
      const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API_BASE}/export/audit-package`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `isms-audit-package-${new Date().toISOString().split('T')[0]}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        toast({ title: 'Package Export failed', description: 'Could not generate audit package.', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Export error', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-color)] mb-2">Document Export</h1>
          <p className="text-[var(--muted)]">Generate and export ISO 27001 compliance documents</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleExportAuditPackage}
            className="border-[var(--navy)] text-[var(--navy)]"
          >
            <Package className="w-4 h-4 mr-2" />
            Export Audit Package (.zip)
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-800">
            <AlertTriangle className="w-5 h-5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchDocuments} className="border-red-200 text-red-700 hover:bg-red-100">
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {docsLoading ? <p className="col-span-2 text-center py-8 text-[var(--muted)]">Loading documents…</p> : documents.map((doc) => (
          <DocumentCard
            key={doc.doc_id || doc.id}
            document={doc}
            onPreview={(d) => {
              setSelectedDoc(d);
              setShowPreview(true);
            }}
            onExport={handleExportDocument}
          />
        ))}
      </div>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="border-[var(--border-color)] max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedDoc?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-gray-100 p-4">
            <div className="bg-white p-8 shadow-lg max-w-3xl mx-auto">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-[var(--navy)]">{selectedDoc?.name}</h2>
                <div className="border-t border-[var(--border-color)] pt-4">
                  <div className="space-y-3 text-[var(--text-color)]">
                    <p className="text-sm">
                      <span className="font-semibold">Document Type:</span> {selectedDoc?.type}
                    </p>
                    {selectedDoc?.lastUpdated && (
                      <p className="text-sm">
                        <span className="font-semibold">Last Updated:</span> {new Date(selectedDoc.lastUpdated).toLocaleDateString()}
                      </p>
                    )}
                    {selectedDoc?.version && (
                      <p className="text-sm">
                        <span className="font-semibold">Version:</span> {selectedDoc.version}
                      </p>
                    )}
                  </div>
                </div>
                <div className="bg-[var(--light-blue)] p-4 rounded-lg mt-4">
                  <p className="text-sm text-[var(--text-color)]">
                    Document preview content would be displayed here. This is a placeholder showing the document structure and metadata.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 p-4 border-t border-[var(--border-color)]">
            <Button
              variant="outline"
              onClick={() => setShowPreview(false)}
              className="flex-1 border-[var(--border-color)]"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                handleExportDocument(selectedDoc);
                setShowPreview(false);
              }}
              disabled={exportingDoc === selectedDoc?.id}
              className="flex-1 bg-[var(--blue)] hover:bg-[var(--blue)]/90"
            >
              {exportingDoc === selectedDoc?.id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="border-[var(--border-color)] bg-[var(--light-blue)]">
        <CardHeader>
          <CardTitle>Document Export Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-[var(--text-color)]">
          <div>
            <h4 className="font-semibold mb-1">Ready Documents</h4>
            <p className="text-[var(--muted)]">Documents marked as "Ready" have been finalized and are suitable for distribution to auditors.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Needs Update Documents</h4>
            <p className="text-[var(--muted)]">Documents requiring updates should be reviewed and modified before export.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-1">Audit Evidence Package</h4>
            <p className="text-[var(--muted)]">Combines SoA, Risk Register, and Treatment Plans into a comprehensive audit-ready package.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
