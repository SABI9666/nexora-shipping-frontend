'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { formatDate, formatFileSize } from '@/lib/utils';
import { Document } from '@/types';
import { Upload, FileText, Download, Trash2, Loader2, File } from 'lucide-react';

const DOC_TYPES = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'bill_of_lading', label: 'Bill of Lading' },
  { value: 'customs', label: 'Customs Declaration' },
  { value: 'proof_of_delivery', label: 'Proof of Delivery' },
  { value: 'other', label: 'Other' },
];

export default function DocumentsPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [docType, setDocType] = useState('invoice');
  const [orderId, setOrderId] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => api.get('/documents').then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileRef.current?.files?.[0]) return;
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', fileRef.current.files[0]);
      formData.append('type', docType);
      if (orderId.trim()) formData.append('orderId', orderId.trim());

      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (fileRef.current) fileRef.current.value = '';
      setOrderId('');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setUploadError(e.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await api.get(`/documents/${doc.id}/signed-url`);
      window.open(response.data.data.signedUrl, '_blank');
    } catch {
      alert('Failed to get download link');
    }
  };

  const MIME_ICONS: Record<string, string> = {
    'application/pdf': '📄',
    'image/jpeg': '🖼️',
    'image/png': '🖼️',
    'application/msword': '📝',
  };

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">Manage shipping documents stored on Google Cloud</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload panel */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload Document
            </h2>
            <form onSubmit={handleUpload} className="space-y-4">
              {uploadError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">{uploadError}</div>
              )}
              <div>
                <label className="form-label">Document Type</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className="form-input">
                  {DOC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Order ID <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Paste order UUID..."
                  className="form-input"
                />
              </div>
              <div>
                <label className="form-label">File</label>
                <div
                  className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center cursor-pointer hover:border-brand-navy/50 hover:bg-slate-50 transition-all"
                  onClick={() => fileRef.current?.click()}
                >
                  <File className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600 font-medium">Click to select file</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG, DOC — max 10MB</p>
                </div>
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" />
              </div>
              <button type="submit" disabled={uploading} className="w-full btn-primary py-2.5 flex items-center justify-center gap-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Uploading...' : 'Upload to Google Cloud'}
              </button>
            </form>
          </div>
        </div>

        {/* Documents list */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">My Documents ({documents.length})</h2>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-brand-navy border-t-transparent rounded-full animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <FileText className="w-12 h-12 mb-3 opacity-50" />
                <p className="font-medium">No documents uploaded yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className="text-2xl flex-shrink-0">
                      {MIME_ICONS[doc.mimeType] || '📎'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{doc.originalName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {DOC_TYPES.find((t) => t.value === doc.type)?.label || doc.type}
                        </span>
                        <span className="text-xs text-slate-400">{formatFileSize(doc.size)}</span>
                        <span className="text-xs text-slate-400">{formatDate(doc.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="p-2 text-slate-400 hover:text-brand-navy hover:bg-slate-100 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(doc.id)}
                        disabled={deleteMutation.isPending}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
