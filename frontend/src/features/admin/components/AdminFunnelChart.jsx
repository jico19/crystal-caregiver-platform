import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from 'recharts';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const chartConfig = {
  count: {
    label: 'Total Volume',
    color: 'hsl(var(--chart-1))',
  },
  clients: {
    label: 'Active Clients',
    color: '#16a34a', // emerald-600
  },
  caregivers: {
    label: 'Active Caregivers',
    color: '#0d9488', // teal-600
  },
  referrals: {
    label: 'New Referrals',
    color: '#0284c7', // sky-600
  },
  applications: {
    label: 'Pending Applications',
    color: '#d97706', // amber-600
  },
  documents: {
    label: 'Pending Documents',
    color: '#e11d48', // rose-600
  },
};

export default function AdminFunnelChart({ metrics = {} }) {
  const chartData = [
    {
      category: 'Clients',
      key: 'clients',
      count: metrics.total_clients || 0,
      fill: '#16a34a',
    },
    {
      category: 'Caregivers',
      key: 'caregivers',
      count: metrics.total_caregivers || 0,
      fill: '#0d9488',
    },
    {
      category: 'Referrals',
      key: 'referrals',
      count: metrics.new_referrals || 0,
      fill: '#0284c7',
    },
    {
      category: 'Pending Apps',
      key: 'applications',
      count: metrics.pending_applications || 0,
      fill: '#d97706',
    },
    {
      category: 'Pending Docs',
      key: 'documents',
      count: metrics.pending_documents || 0,
      fill: '#e11d48',
    },
  ];

  return (
    <Card className="border-slate-200">
      <CardHeader className="p-5 pb-2">
        <CardTitle className="text-base font-bold text-slate-900">
          Operational Pipeline Volume
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">
          Current capacity, pending intakes, and compliance verification load
        </CardDescription>
      </CardHeader>
      <CardContent className="p-5 pt-3">
        <ChartContainer config={chartConfig} className="h-64 w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 16, left: 16, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-slate-200" />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-slate-500 text-xs"
            />
            <YAxis
              type="category"
              dataKey="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-slate-600 text-xs font-medium"
              width={85}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(value) => (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{value}</span>
                      <span className="text-slate-500">units/records</span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
