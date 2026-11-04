import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { ShieldCheck } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';

const chartConfig = {
  used: {
    label: 'Used Hours',
    color: '#0d9488', // teal-600
  },
  remaining: {
    label: 'Remaining Hours',
    color: '#16a34a', // emerald-600
  },
};

export default function ClientAuthorizationChart({ authorizations = [] }) {
  const chartData = useMemo(() => {
    if (!authorizations || authorizations.length === 0) {
      // Default representative Medicaid waiver authorization units for client portal
      return [
        { service: 'Personal Care (T1019)', used: 28, remaining: 52 },
        { service: 'Respite Care (S5150)', used: 12, remaining: 28 },
        { service: 'Homemaker (S5130)', used: 8, remaining: 16 },
      ];
    }

    return authorizations.slice(0, 4).map((auth) => {
      const uTotal = auth.total_units_authorized ?? 0;
      const uUsed = auth.units_used ?? 0;
      const is15Min = (auth.unit_type || '15_min') === '15_min';

      const usedH = auth.hours_used !== undefined ? auth.hours_used : (is15Min ? uUsed * 0.25 : uUsed);
      const totalH = auth.total_hours !== undefined ? auth.total_hours : (is15Min ? uTotal * 0.25 : uTotal);
      const remH = Math.max(0, totalH - usedH);

      const serviceName = auth.service_type || auth.service_code || 'Care Service';

      return {
        service: serviceName.length > 20 ? `${serviceName.slice(0, 18)}…` : serviceName,
        used: Math.round(usedH),
        remaining: Math.round(remH),
      };
    });
  }, [authorizations]);

  const totalAuthorized = chartData.reduce((acc, c) => acc + c.used + c.remaining, 0);
  const totalUsed = chartData.reduce((acc, c) => acc + c.used, 0);
  const percentUsed = totalAuthorized > 0 ? Math.round((totalUsed / totalAuthorized) * 100) : 0;

  return (
    <Card className="border-slate-200">
      <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Medicaid Service Allowance Utilization
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Authorized care hours breakdown ({totalUsed}h used of {totalAuthorized}h authorized)
          </CardDescription>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          {percentUsed}% Utilized
        </span>
      </CardHeader>
      <CardContent className="p-4 pt-4">
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 16, left: 24, bottom: 0 }}
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
              dataKey="service"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-slate-700 text-xs font-medium"
              width={120}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(val) => (
                    <span className="font-semibold text-slate-900">{val} hours</span>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="used" fill="var(--color-used)" stackId="a" radius={[0, 0, 0, 0]} />
            <Bar dataKey="remaining" fill="var(--color-remaining)" stackId="a" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
