import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';

const chartConfig = {
  referrals: {
    label: 'Client Intakes & Referrals',
    color: 'hsl(var(--chart-1))',
  },
  applications: {
    label: 'Caregiver Applications',
    color: 'hsl(var(--chart-2))',
  },
};

// Base multi-state operational trends over 6 months
const TREND_DATA_BY_STATE = {
  all: [
    { month: 'May', referrals: 24, applications: 18 },
    { month: 'Jun', referrals: 31, applications: 25 },
    { month: 'Jul', referrals: 28, applications: 22 },
    { month: 'Aug', referrals: 39, applications: 30 },
    { month: 'Sep', referrals: 45, applications: 38 },
    { month: 'Oct', referrals: 52, applications: 44 },
  ],
  florida: [
    { month: 'May', referrals: 14, applications: 10 },
    { month: 'Jun', referrals: 18, applications: 15 },
    { month: 'Jul', referrals: 16, applications: 12 },
    { month: 'Aug', referrals: 22, applications: 18 },
    { month: 'Sep', referrals: 26, applications: 21 },
    { month: 'Oct', referrals: 30, applications: 24 },
  ],
  indiana: [
    { month: 'May', referrals: 6, applications: 5 },
    { month: 'Jun', referrals: 8, applications: 6 },
    { month: 'Jul', referrals: 7, applications: 6 },
    { month: 'Aug', referrals: 10, applications: 7 },
    { month: 'Sep', referrals: 11, applications: 10 },
    { month: 'Oct', referrals: 13, applications: 12 },
  ],
  georgia: [
    { month: 'May', referrals: 4, applications: 3 },
    { month: 'Jun', referrals: 5, applications: 4 },
    { month: 'Jul', referrals: 5, applications: 4 },
    { month: 'Aug', referrals: 7, applications: 5 },
    { month: 'Sep', referrals: 8, applications: 7 },
    { month: 'Oct', referrals: 9, applications: 8 },
  ],
};

export default function AdminOperationsChart({ selectedState = 'all' }) {
  const chartData = useMemo(() => {
    return TREND_DATA_BY_STATE[selectedState] || TREND_DATA_BY_STATE.all;
  }, [selectedState]);

  return (
    <Card className="border-slate-200">
      <CardHeader className="p-5 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-slate-900">
              Admission & Recruitment Trajectory
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              6-month trend comparing new client admissions against caregiver recruitment
            </CardDescription>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
            {selectedState === 'all' ? 'All States' : selectedState}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-3">
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <AreaChart data={chartData} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="fillReferrals" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-referrals)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-referrals)" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="fillApplications" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-applications)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="var(--color-applications)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-200" />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-slate-500 text-xs"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-slate-500 text-xs"
            />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              type="monotone"
              dataKey="referrals"
              stroke="var(--color-referrals)"
              strokeWidth={2}
              fill="url(#fillReferrals)"
            />
            <Area
              type="monotone"
              dataKey="applications"
              stroke="var(--color-applications)"
              strokeWidth={2}
              fill="url(#fillApplications)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
