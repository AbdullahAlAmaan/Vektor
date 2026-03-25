'use client';

import { useState, useEffect, useRef } from 'react';
import { X, GitFork, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ingestRepo, getIngestionStatus, IngestionJob } from '@/lib/api';

interface AddRepoModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const STEP_LABELS: Record<string, string> = {
  fetching: 'Fetching repository metadata…',
  contributors: 'Ingesting contributors…',
  commits: 'Ingesting commits…',
  issues: 'Ingesting issues…',
  prs: 'Ingesting pull requests…',
  complexity: 'Computing complexity hints…',
  embeddings: 'Generating embeddings…',
  done: 'Complete!',
};

export function AddRepoModal({ onClose, onSuccess }: AddRepoModalProps) {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'polling' | 'done' | 'error'>('idle');
  const [job, setJob] = useState<IngestionJob | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) clearTimeout(pollRef.current); };
  }, []);

  async function poll(id: string) {
    try {
      const status = await getIngestionStatus(id);
      setJob(status);
      if (status.status === 'done') {
        setState('done');
        onSuccess();
      } else if (status.status === 'error') {
        setState('error');
        setErrorMsg(status.error ?? 'Ingestion failed');
      } else {
        pollRef.current = setTimeout(() => poll(id), 2000);
      }
    } catch {
      pollRef.current = setTimeout(() => poll(id), 3000);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setState('loading');
    setErrorMsg('');
    try {
      const result = await ingestRepo(url.trim());
      setJobId(result.jobId);
      setState('polling');
      pollRef.current = setTimeout(() => poll(result.jobId), 1000);
    } catch (err) {
      setState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to start ingestion');
    }
  }

  const progress = job?.step
    ? Object.keys(STEP_LABELS).indexOf(job.step) / (Object.keys(STEP_LABELS).length - 1)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="rounded-lg bg-zinc-800 p-2">
            <GitFork className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Add Repository</h2>
            <p className="text-xs text-zinc-500">Ingest any public GitHub repo</p>
          </div>
        </div>

        {state === 'idle' || state === 'loading' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                GitHub Repository URL
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3 py-2 text-sm text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-colors"
                disabled={state === 'loading'}
              />
            </div>
            <button
              type="submit"
              disabled={state === 'loading' || !url.trim()}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-medium text-white transition-colors"
            >
              {state === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Starting…
                </>
              ) : (
                'Start Ingestion'
              )}
            </button>
          </form>
        ) : state === 'polling' ? (
          <div className="space-y-5">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-white">
                {job?.owner}/{job?.name ?? '…'}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                {job?.step ? STEP_LABELS[job.step] ?? job.step : 'Initialising…'}
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-zinc-600">
                <span>Progress</span>
                <span>{Math.round(progress * 100)}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
            {job && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {job.contributors != null && (
                  <div className="rounded-lg bg-zinc-800/60 px-3 py-2">
                    <p className="text-zinc-500">Contributors</p>
                    <p className="font-semibold text-zinc-200 mt-0.5">{job.contributors}</p>
                  </div>
                )}
                {job.commits != null && (
                  <div className="rounded-lg bg-zinc-800/60 px-3 py-2">
                    <p className="text-zinc-500">Commits</p>
                    <p className="font-semibold text-zinc-200 mt-0.5">{job.commits}</p>
                  </div>
                )}
                {job.issues != null && (
                  <div className="rounded-lg bg-zinc-800/60 px-3 py-2">
                    <p className="text-zinc-500">Issues</p>
                    <p className="font-semibold text-zinc-200 mt-0.5">{job.issues}</p>
                  </div>
                )}
                {job.prs != null && (
                  <div className="rounded-lg bg-zinc-800/60 px-3 py-2">
                    <p className="text-zinc-500">PRs</p>
                    <p className="font-semibold text-zinc-200 mt-0.5">{job.prs}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : state === 'done' ? (
          <div className="text-center space-y-4">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-white">Ingestion complete!</p>
              <p className="text-xs text-zinc-500 mt-1">
                {job?.owner}/{job?.name} is now available
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 text-sm font-medium text-white transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <AlertCircle className="h-10 w-10 text-red-400 mx-auto" />
            <div>
              <p className="text-sm font-semibold text-white">Ingestion failed</p>
              <p className="text-xs text-zinc-500 mt-1">{errorMsg}</p>
            </div>
            <button
              onClick={() => { setState('idle'); setErrorMsg(''); setJob(null); setJobId(null); }}
              className="w-full rounded-lg bg-zinc-800 hover:bg-zinc-700 px-4 py-2.5 text-sm font-medium text-white transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
