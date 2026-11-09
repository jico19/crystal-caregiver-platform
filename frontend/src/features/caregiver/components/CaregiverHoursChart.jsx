import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ReferenceLine } from 'recharts';
import { Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const chartConfig = {
  hours: {
    label: 'Scheduled Shift Hours',
    color: 'hsl(var(--chart-1))',
  },
};

const WEEKLY_HOURS_DATA = [
  { day: 'Mon', hours: 7.5 },
  { day: 'Tue', hours: 8.0 },
  { day: 'Wed', hours: 6.5 },
  { day: 'Thu', hours: 8.0 },
  { day: 'Fri', hours: 7.0 },
  { day: 'Sat', hours: 4.0 },
  { day: 'Sun', hours: 0 },
];

export default function CaregiverHoursChart() {
  const totalWeeklyHours = WEEKLY_HOURS_DATA.reduce((acc, curr) => acc + curr.hours, 0);

  return (
    <Card className="border-slate-200">
      <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-emerald-600" />
            Weekly Care Schedule & Hours
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Confirmed client visits for the current week ({totalWeeklyHours} hrs total)
          </CardDescription>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          Target: 40h/wk
        </span>
      </CardHeader>
      <CardContent className="p-4 pt-4">
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <BarChart data={WEEKLY_HOURS_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              domain={[0, 10]}
            />
            <ReferenceLine y={8} stroke="#ea580c" strokeDasharray="3 3" label={{ value: 'Daily Max (8h)', fill: '#ea580c', fontSize: 10, position: 'insideTopRight' }} />
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
            <Bar
              dataKey="hours"
              fill="var(--color-hours)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
