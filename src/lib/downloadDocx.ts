import api from './api';

// Triggers a browser download of a Word .doc file from a backend endpoint.
// Used by both invoice and quotation views.
export async function downloadDocx(endpoint: string, filename: string): Promise<void> {
  const res = await api.get(endpoint, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
