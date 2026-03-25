'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronDown, GitBranch, Plus } from 'lucide-react';
import { getRepos, Repo } from '@/lib/api';
import { AddRepoModal } from './AddRepoModal';

export function RepoSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentRepoId = searchParams.get('repoId') ?? repos[0]?.id;
  const currentRepo = repos.find((r) => r.id === currentRepoId) ?? repos[0];

  useEffect(() => {
    getRepos().then(setRepos).catch(() => {});
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function selectRepo(repoId: string) {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set('repoId', repoId);
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleSuccess() {
    // Refresh repos list after ingestion completes
    getRepos().then(setRepos).catch(() => {});
  }

  if (repos.length === 0) return null;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800/60 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-600 hover:text-white transition-colors"
        >
          <GitBranch className="h-3 w-3 text-zinc-500" />
          <span className="max-w-32 truncate">
            {currentRepo ? currentRepo.fullName : 'Select repo'}
          </span>
          <ChevronDown className={`h-3 w-3 text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute top-full mt-1.5 right-0 w-64 rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-zinc-800">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide">Repositories</p>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {repos.map((repo) => (
                <button
                  key={repo.id}
                  onClick={() => selectRepo(repo.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-zinc-800 transition-colors ${
                    repo.id === currentRepo?.id ? 'bg-zinc-800/60 text-white' : 'text-zinc-300'
                  }`}
                >
                  <span className="truncate text-left">{repo.fullName}</span>
                  {repo.language && (
                    <span className="text-xs text-zinc-600 flex-shrink-0 ml-2">{repo.language}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="border-t border-zinc-800 p-2">
              <button
                onClick={() => { setOpen(false); setShowModal(true); }}
                className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-blue-400 hover:bg-zinc-800 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Repository
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <AddRepoModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); handleSuccess(); }}
        />
      )}
    </>
  );
}
