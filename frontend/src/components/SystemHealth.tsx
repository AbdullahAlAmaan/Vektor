import { cn } from '@/lib/utils';

interface ServiceStatus {
  name: string;
  status: 'ok' | 'degraded' | 'error' | string;
}

interface SystemHealthProps {
  services: ServiceStatus[];
}

function getStatusDot(status: string) {
  if (status === 'ok' || status === 'operational') return 'bg-emerald-500 shadow-[0_0_6px_rgba(52,211,153,0.6)]';
  if (status === 'degraded') return 'bg-yellow-500 shadow-[0_0_6px_rgba(234,179,8,0.6)]';
  return 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]';
}

function getStatusLabel(status: string) {
  if (status === 'ok') return 'Operational';
  if (status === 'degraded') return 'Degraded';
  return 'Down';
}

export function SystemHealth({ services }: SystemHealthProps) {
  const allOk = services.every((s) => s.status === 'ok' || s.status === 'operational');

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white">System Health</h3>
        <span className={cn(
          'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
          allOk ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'
        )}>
          <span className={cn('h-1.5 w-1.5 rounded-full', allOk ? 'bg-emerald-500' : 'bg-yellow-500')} />
          {allOk ? 'All systems operational' : 'Degraded'}
        </span>
      </div>
      <div className="space-y-3">
        {services.map((service) => (
          <div key={service.name} className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={cn('h-2 w-2 rounded-full flex-shrink-0', getStatusDot(service.status))} />
              <span className="text-sm text-zinc-300 capitalize">{service.name}</span>
            </div>
            <span className={cn(
              'text-xs font-medium',
              service.status === 'ok' || service.status === 'operational' ? 'text-emerald-500' :
              service.status === 'degraded' ? 'text-yellow-500' : 'text-red-500'
            )}>
              {getStatusLabel(service.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
