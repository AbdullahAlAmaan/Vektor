'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

interface Props {
  data: Record<string, number>;
}

export function ExpertiseChart({ data }: Props) {
  const chartData = Object.entries(data).map(([domain, value]) => ({
    domain: domain.charAt(0).toUpperCase() + domain.slice(1),
    value: Math.round(value * 100) / 100,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={chartData}>
        <PolarGrid stroke="#21262d" />
        <PolarAngleAxis dataKey="domain" tick={{ fill: '#8b949e', fontSize: 12 }} />
        <Radar
          name="Expertise"
          dataKey="value"
          stroke="#58a6ff"
          fill="#58a6ff"
          fillOpacity={0.2}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 6 }}
          labelStyle={{ color: '#e6edf3' }}
          itemStyle={{ color: '#58a6ff' }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}
