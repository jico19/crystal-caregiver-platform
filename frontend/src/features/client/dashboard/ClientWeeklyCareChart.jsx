import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { weeklyCareHours } from '@/features/client/lib/careMetrics';

const chartConfig = {
  hours: {
    label: 'Care Coverage Hours',
    color: '#16a34a', // emerald-600
  },
};

export default function ClientWeeklyCareChart({ schedule = [] }) {
  const chartData = useMemo(() => weeklyCareHours(schedule || []), [schedule]);

  const totalWeeklyHours = chartData.reduce((acc, c) => acc + c.hours, 0);

  return (
    <Card className="border-slate-200">
      <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-600" />
            Weekly Care Coverage
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Caregiver staffing hours scheduled across this week
          </CardDescription>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          {totalWeeklyHours} hrs / week
        </span>
      </CardHeader>
      <CardContent className="p-4 pt-4">
        {schedule.length === 0 ? <p className="text-xs text-slate-500 py-8 text-center">No care visits have been scheduled.</p> : <ChartContainer config={chartConfig} className="h-56 w-full">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-slate-200" />
            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-slate-500 text-xs font-medium"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-slate-500 text-xs"
              domain={[0, 'auto']}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(val) => (
                    <span className="font-semibold text-slate-900">{val} hours of care</span>
                  )}
                />
              }
            />
            <Bar
              dataKey="hours"
              fill="var(--color-hours)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>}
      </CardContent>
    </Card>
  );
}
