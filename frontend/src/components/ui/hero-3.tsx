import { cn } from "@/lib/utils";
import { ArrowRightIcon, GitBranch } from "lucide-react";
import Link from "next/link";

interface HeroSectionProps {
  repoName?: string;
  contributorCount?: number;
  issueCount?: number;
}

export function HeroSection({ repoName, contributorCount, issueCount }: HeroSectionProps) {
  return (
    <section className="mx-auto w-full max-w-5xl overflow-hidden pt-8 pb-0">
      {/* Radial shade */}
      <div aria-hidden="true" className="absolute inset-0 size-full overflow-hidden pointer-events-none">
        <div
          className={cn(
            "absolute inset-0 isolate -z-10",
            "bg-[radial-gradient(20%_80%_at_20%_0%,rgba(99,102,241,0.08),transparent)]"
          )}
        />
      </div>

      <div className="relative z-10 flex max-w-2xl flex-col gap-5 px-4">
        {/* "NOW" badge */}
        <div
          className={cn(
            "group flex w-fit items-center gap-3 rounded-sm border border-zinc-700 bg-zinc-900 p-1 shadow-xs",
            "animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards duration-500 delay-500"
          )}
        >
          <div className="rounded-xs border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 shadow-sm">
            <p className="font-mono text-xs text-zinc-400">LIVE</p>
          </div>
          <span className="text-xs text-zinc-400">
            {repoName ? `tracking ${repoName}` : "connect a repository to start"}
          </span>
          <span className="block h-5 border-l border-zinc-700" />
          <div className="pr-1">
            <GitBranch className="size-3 text-zinc-500" />
          </div>
        </div>

        <h1
          className={cn(
            "font-medium text-4xl text-white leading-tight md:text-5xl",
            "animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards duration-500 delay-100"
          )}
        >
          Surface the right issues<br />
          <span className="text-zinc-400">for the right people.</span>
        </h1>

        <p
          className={cn(
            "text-zinc-500 text-sm tracking-wide sm:text-base",
            "animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards duration-500 delay-200"
          )}
        >
          Vektor ranks open issues by contributor expertise — domain history, label affinity, and recency.
        </p>

        <div
          className={cn(
            "flex w-fit items-center gap-3 pt-2",
            "animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards duration-500 delay-300"
          )}
        >
          <Link
            href="/contributors"
            className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-800/60 px-4 h-10 text-sm text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors"
          >
            <GitBranch className="size-4" />
            {contributorCount !== undefined ? `${contributorCount} Contributors` : 'View Contributors'}
          </Link>
          <Link
            href="/evaluation"
            className="inline-flex items-center gap-2 rounded-md bg-indigo-600 hover:bg-indigo-500 px-4 h-10 text-sm text-white font-medium transition-colors"
          >
            Evaluation
            <ArrowRightIcon className="size-4" />
          </Link>
        </div>
      </div>

      {/* App screenshot */}
      <div className="relative mt-10 md:mt-14">
        <div
          className={cn(
            "absolute -inset-x-20 inset-y-0 -translate-y-1/3 rounded-full",
            "bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.08),transparent,transparent)]",
            "blur-[50px]"
          )}
        />
        <div
          className={cn(
            "mask-fade-bottom relative -mr-56 overflow-hidden px-2 sm:mr-0",
            "animate-in fade-in slide-in-from-bottom-4 fill-mode-backwards duration-1000 delay-100"
          )}
        >
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900 p-2 shadow-xl ring-1 ring-zinc-800">
            <img
              alt="Vektor dashboard"
              className="aspect-video rounded-lg border border-zinc-800 object-cover"
              height="1080"
              width="1920"
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1920&q=80"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
