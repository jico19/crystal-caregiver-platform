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

// History must be supplied from actual records; never substitute invented months.
export default function AdminOperationsChart({ selectedState = 'all', series = [] }) {
  const chartData = Array.isArray(series) ? series : [];

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
        {chartData.length === 0 ? (
          <p className="text-sm text-slate-600 py-8">Historical admission and recruitment trends are not available. Current totals are shown in the operational pipeline.</p>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
