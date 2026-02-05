'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Search, SortAsc, SortDesc, Eye, X, FileSpreadsheet } from 'lucide-react';

interface ProcessedFile {
  id: string;
  filename: string;
  created_at: string;
  size?: number;
  status: string;
  metadata?: Record<string, unknown>;
}

type SortField = 'filename' | 'created_at';
type SortDir = 'asc' | 'desc';

function formatBytes(bytes?: number): string {
  if (!bytes) return '--';
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ExcelMasterPage() {
  const router = useRouter();

  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [selected, setSelected] = useState<ProcessedFile | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/processed-files', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to load files');
        const data = await res.json();
        setFiles(data.jobs ?? data.files ?? []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = files;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) => f.filename.toLowerCase().includes(q));
    }
    list = [...list].sort((a, b) => {
      const valA = sortField === 'filename' ? a.filename.toLowerCase() : a.created_at;
      const valB = sortField === 'filename' ? b.filename.toLowerCase() : b.created_at;
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [files, search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const handleDownload = async (file: ProcessedFile) => {
    try {
      const res = await fetch(`/api/export?format=xlsx&jobId=${file.id}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${file.filename.replace(/\.[^/.]+$/, '')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert('Error downloading file. Please try again.');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field
      ? sortDir === 'asc' ? <SortAsc className="inline h-4 w-4 ml-1" /> : <SortDesc className="inline h-4 w-4 ml-1" />
      : null;

  return (
    <div className="min-h-screen bg-[#f0f4f8] dark:bg-gray-900 text-[#1e293b] dark:text-gray-100 transition-colors">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur border-b border-[#cbd5e1] dark:border-gray-700">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/')}
              className="p-2 rounded-lg hover:bg-[#cbd5e1]/40 dark:hover:bg-gray-700 transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <FileSpreadsheet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            <h1 className="text-xl font-semibold">Excel Master</h1>
          </div>

          {/* Search */}
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 rounded-lg border border-[#cbd5e1] dark:border-gray-600 bg-white dark:bg-gray-700 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading && (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <FileSpreadsheet className="mx-auto h-12 w-12 mb-3 opacity-40" />
            <p>{search ? 'No files match your search.' : 'No processed files yet.'}</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-[#cbd5e1] dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#cbd5e1] dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60">
                  <th
                    className="text-left px-5 py-3 font-medium cursor-pointer select-none hover:text-emerald-600 dark:hover:text-emerald-400"
                    onClick={() => toggleSort('filename')}
                  >
                    Filename
                    <SortIcon field="filename" />
                  </th>
                  <th
                    className="text-left px-5 py-3 font-medium cursor-pointer select-none hover:text-emerald-600 dark:hover:text-emerald-400"
                    onClick={() => toggleSort('created_at')}
                  >
                    Date
                    <SortIcon field="created_at" />
                  </th>
                  <th className="text-left px-5 py-3 font-medium">Size</th>
                  <th className="text-right px-5 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#cbd5e1] dark:divide-gray-700">
                {filtered.map((file) => (
                  <tr
                    key={file.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                  >
                    <td className="px-5 py-3 font-medium truncate max-w-xs">
                      {file.filename}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                      {formatDate(file.created_at)}
                    </td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">
                      {formatBytes(file.size)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelected(file)}
                          className="p-2 rounded-lg hover:bg-[#cbd5e1]/40 dark:hover:bg-gray-600 transition-colors"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-2 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 transition-colors"
                          title="Download Excel"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative w-full max-w-lg mx-4 rounded-xl bg-white dark:bg-gray-800 border border-[#cbd5e1] dark:border-gray-700 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#cbd5e1] dark:border-gray-700">
              <h2 className="text-lg font-semibold truncate pr-4">{selected.filename}</h2>
              <button
                onClick={() => setSelected(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">File ID</span>
                <span className="font-mono text-xs">{selected.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Date</span>
                <span>{formatDate(selected.created_at)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Size</span>
                <span>{formatBytes(selected.size)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className="capitalize">{selected.status}</span>
              </div>
              {selected.metadata && Object.keys(selected.metadata).length > 0 && (
                <div>
                  <span className="text-gray-500 dark:text-gray-400 block mb-1">Metadata</span>
                  <pre className="text-xs bg-gray-50 dark:bg-gray-900 rounded-lg p-3 overflow-auto max-h-40 border border-[#cbd5e1] dark:border-gray-700">
                    {JSON.stringify(selected.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-[#cbd5e1] dark:border-gray-700 flex justify-end">
              <button
                onClick={() => handleDownload(selected)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
              >
                <Download className="h-4 w-4" />
                Download Excel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
