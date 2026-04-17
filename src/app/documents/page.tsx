'use client';

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import api from '@/lib/api';
import { formatDate, formatFileSize } from '@/lib/utils';
import { Document, Order } from '@/types';
import {
  Upload, FileText, Download, Trash2, Loader2,
  File, CheckCircle, X, UploadCloud, AlertCircle,
} from 'lucide-react';

const DOC_TYPES = [
  { value: 'invoice', label: 'Invoice' },
  { value: 'bill_of_lading', label: 'Bill of Lading' },
  { value: 'customs', label: 'Customs Declaration' },
  { value: 'proof_of_delivery', label: 'Proof of Delivery' },
  { value: 'other', label: 'Other' },
];

const MIME_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
};

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function DocumentsPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [docType, setDocType] = useState('invoice');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  // Load user's orders for the dropdown
  const { data: ordersData } = useQuery({
    queryKey: ['orders-for-docs'],
    queryFn: () => api.get('/orders?limit=100').then((r) => r.data.data as Order[]),
  });
  const orders: Order[] = ordersData ?? [];

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ['documents'],
    queryFn: () => api.get('/documents').then((r) => r.data.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const onFileChange = (file: File | null) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File is too large. Maximum size is 10MB.');
      return;
    }
    setUploadError('');
    setSelectedFile(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) onFileChange(file);
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setUploadError('Please select a file first.');
      return;
    }
    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', docType);
      if (selectedOrderId) formData.append('orderId', selectedOrderId);

      await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setSelectedOrderId('');
      setUploadSuccess(`"${selectedFile.name}" uploaded successfully.`);
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      setTimeout(() => setUploadSuccess(''), 5000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setUploadError(e.response?.data?.message || 'Upload failed. Please try again.');
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

  const selectedOrder = orders.find((o) => o.id === selectedOrderId);

  return (
    <DashboardLayout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-subtitle">Shipping documents stored on Google Cloud Storage</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Upload panel ── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-semibold text-slate-900 mb-5 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-brand-navy" /> Upload Document
            </h2>

            <form onSubmit={handleUpload} className="space-y-4">

              {uploadSuccess && (
                <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs">
                  <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {uploadSuccess}
                </div>
              )}

              {uploadError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  {uploadError}
                </div>
              )}

              {/* Document type */}
              <div>
                <label className="form-label">Document Type</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className="form-input w-full">
                  {DOC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Link to Order — dropdown showing orderNumber */}
              <div>
                <label className="form-label">
                  Link to Order{' '}
                  <span className="text-slate-400 text-xs font-normal">(optional)</span>
                </label>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="form-input w-full"
                >
                  <option value="">— None (standalone document) —</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} · {o.deliveryCity}, {o.deliveryCountry} · {o.status}
                    </option>
                  ))}
                </select>
                {selectedOrder && (
                  <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500" />
                    Linked to order <span className="font-mono font-semibold">{selectedOrder.orderNumber}</span>
                  </p>
                )}
              </div>

              {/* File drop zone */}
              <div>
                <label className="form-label">File</label>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                    ${selectedFile
                      ? 'border-green-400 bg-green-50'
                      : dragOver
                      ? 'border-brand-navy bg-brand-navy/5 scale-[1.01]'
                      : 'border-slate-300 hover:border-brand-navy/50 hover:bg-slate-50'
                    }
                  `}
                >
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 truncate max-w-[200px]">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">{formatBytes(selectedFile.size)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                        className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 mt-1"
                      >
                        <X className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                        <Upload className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {dragOver ? 'Drop file here' : 'Click or drag & drop'}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">PDF, JPG, PNG, DOC, XLS — max 10MB</p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
                />
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                {uploading ? 'Uploading...' : 'Upload to Google Cloud'}
              </button>

              {!selectedFile && !uploading && (
                <p className="text-xs text-center text-slate-400">Select a file above to enable upload</p>
              )}
            </form>
          </div>
        </div>

        {/* ── Documents list ── */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">My Documents ({documents.length})</h2>
              {documents.length > 0 && (
                <span className="text-xs text-slate-400">{documents.length} file{documents.length !== 1 ? 's' : ''} stored</span>
              )}
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-brand-navy border-t-transparent rounded-full animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <FileText className="w-12 h-12 mb-3 opacity-40" />
                <p className="font-medium text-slate-500">No documents uploaded yet</p>
                <p className="text-xs mt-1">Upload a file using the panel on the left</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                      {MIME_ICONS[doc.mimeType] || '📎'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{doc.originalName}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs bg-brand-navy/10 text-brand-navy px-2 py-0.5 rounded-full font-medium">
                          {DOC_TYPES.find((t) => t.value === doc.type)?.label || doc.type}
                        </span>
                        <span className="text-xs text-slate-400">{formatFileSize(doc.size)}</span>
                        <span className="text-xs text-slate-400">{formatDate(doc.createdAt)}</span>
                        {doc.orderId && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            Order linked
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
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
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
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
