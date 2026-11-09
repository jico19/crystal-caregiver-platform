import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from 'recharts';
import { GraduationCap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const chartConfig = {
  completion: {
    label: 'Completion %',
    color: 'hsl(var(--chart-1))',
  },
};

export default function CaregiverTrainingProgressChart({ courses = [], documents = [] }) {
  const chartData = useMemo(() => {
    // 1. Mandatory HIPAA & Safety
    const hipaa = courses.find((c) => c.title?.toLowerCase().includes('hipaa') || c.name?.toLowerCase().includes('hipaa'));
    const infection = courses.find((c) => c.title?.toLowerCase().includes('infection') || c.name?.toLowerCase().includes('infection'));
    const rights = courses.find((c) => c.title?.toLowerCase().includes('rights') || c.name?.toLowerCase().includes('rights'));
    const cpr = documents.find((d) => d.document_type?.toLowerCase().includes('cpr') || d.title?.toLowerCase().includes('cpr'));

    const items = [
      {
        module: 'HIPAA & Privacy',
        score: hipaa?.enrollment_status === 'completed' ? 100 : hipaa?.enrollment_status === 'in_progress' ? 50 : 25,
        status: hipaa?.enrollment_status || 'In Progress',
        fill: '#16a34a',
      },
      {
        module: 'Infection Control',
        score: infection?.enrollment_status === 'completed' ? 100 : infection?.enrollment_status === 'in_progress' ? 60 : 30,
        status: infection?.enrollment_status || 'In Progress',
        fill: '#0d9488',
      },
      {
        module: 'Client Rights',
        score: rights?.enrollment_status === 'completed' ? 100 : rights?.enrollment_status === 'in_progress' ? 40 : 10,
        status: rights?.enrollment_status || 'Pending',
        fill: '#0284c7',
      },
      {
        module: 'CPR & First Aid',
        score: cpr?.status === 'verified' || cpr?.status === 'approved' ? 100 : cpr ? 70 : 40,
        status: cpr?.status || 'Active',
        fill: '#f59e0b',
      },
    ];

    return items;
  }, [courses, documents]);

  return (
    <Card className="border-slate-200">
      <CardHeader className="p-4 pb-2 border-b border-slate-100 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-emerald-600" />
            Compliance & Training Modules
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Mandatory state annual in-service certifications
          </CardDescription>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          State Mandated
        </span>
      </CardHeader>
      <CardContent className="p-4 pt-4">
        <ChartContainer config={chartConfig} className="h-56 w-full">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 20, left: 20, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-slate-200" />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v) => `${v}%`}
              className="text-slate-500 text-xs"
            />
            <YAxis
              type="category"
              dataKey="module"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-slate-700 text-xs font-medium"
              width={100}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="dot"
                  formatter={(val, name, item) => (
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{val}%</span>
                      <span className="text-slate-500 capitalize">({item.payload.status})</span>
                    </div>
                  )}
                />
              }
            />
            <Bar dataKey="score" radius={[0, 4, 4, 0]}>
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
