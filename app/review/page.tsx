'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  ChevronRight,
  ClipboardCheck,
} from 'lucide-react';

interface ProcessedFile {
  id: string;
  filename: string;
  status: 'pending' | 'completed' | 'error';
  created_at: string;
}

type StatusFilter = 'all' | 'pending' | 'completed';
type SortField = 'filename' | 'created_at';
type SortDir = 'asc' | 'desc';

export default function ReviewPage() {
  const router = useRouter();
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const res = await fetch('/api/processed-files', {
          credentials: 'include',
        });
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setFiles(data.files ?? data ?? []);
      } catch {
        setFiles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, [router]);

  const filtered = useMemo(() => {
    let list = [...files];

    if (statusFilter !== 'all') {
      list = list.filter((f) => f.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) => f.filename.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      const valA = sortField === 'filename' ? a.filename.toLowerCase() : a.created_at;
      const valB = sortField === 'filename' ? b.filename.toLowerCase() : b.created_at;
      if (valA < valB) return sortDir === 'asc' ? -1 : 1;
      if (valA > valB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [files, statusFilter, search, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = sortDir === 'asc' ? SortAsc : SortDesc;

  const statusBadge = (status: string) => {
    const base = 'px-2 py-0.5 rounded-full text-xs font-medium';
    switch (status) {
      case 'completed':
        return `${base} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case 'pending':
        return `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
      case 'error':
        return `${base} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
      default:
        return `${base} bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300`;
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] dark:bg-gray-900 text-[#1e293b] dark:text-gray-100 transition-colors">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => router.push('/')}
            className="p-2 rounded-lg border border-[#cbd5e1] dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={18} />
          </button>
          <ClipboardCheck size={24} className="text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold">Review List</h1>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by filename..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[#cbd5e1] dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            {(['all', 'pending', 'completed'] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-[#cbd5e1] dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800'
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-[#cbd5e1] dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_140px_100px_32px] gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-[#cbd5e1] dark:border-gray-700 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            <button onClick={() => toggleSort('filename')} className="flex items-center gap-1 text-left">
              Filename
              {sortField === 'filename' && <SortIcon size={14} />}
            </button>
            <button onClick={() => toggleSort('created_at')} className="flex items-center gap-1 text-left">
              Date
              {sortField === 'created_at' && <SortIcon size={14} />}
            </button>
            <span>Status</span>
            <span />
          </div>

          {/* Body */}
          {loading ? (
            <div className="px-4 py-12 text-center text-sm text-gray-400">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-400">No files found.</div>
          ) : (
            filtered.map((file) => (
              <div
                key={file.id}
                onClick={() => router.push(`/results?jobId=${file.id}`)}
                className="grid grid-cols-[1fr_140px_100px_32px] gap-2 px-4 py-3 items-center border-b last:border-b-0 border-[#cbd5e1] dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <span className="truncate text-sm font-medium">{file.filename}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(file.created_at).toLocaleDateString()}
                </span>
                <span>
                  <span className={statusBadge(file.status)}>{file.status}</span>
                </span>
                <ChevronRight size={16} className="text-gray-400" />
              </div>
            ))
          )}
        </div>

        {/* Footer count */}
        {!loading && (
          <p className="mt-4 text-xs text-gray-400 text-right">
            {filtered.length} of {files.length} file{files.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
