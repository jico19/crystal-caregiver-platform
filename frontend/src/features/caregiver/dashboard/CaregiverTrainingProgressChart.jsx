import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell } from 'recharts';
import { GraduationCap } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const chartConfig = { courses: { label: 'Courses', color: '#16a34a' } };

export default function CaregiverTrainingProgressChart({ courses = [] }) {
  const chartData = [
    { status: 'Not started', value: 'not_started', fill: '#64748b' },
    { status: 'In progress', value: 'in_progress', fill: '#d97706' },
    { status: 'Completed', value: 'completed', fill: '#16a34a' },
  ].map((item) => ({ ...item, courses: courses.filter((course) => course.enrollment_status === item.value).length }));
  const completed = chartData.find((item) => item.value === 'completed').courses;

  return (
    <Card className="border-slate-200">
      <CardHeader className="p-4 pb-2 border-b border-slate-100">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-emerald-600" /> Training Completion
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">{completed} of {courses.length} enrolled courses completed</CardDescription>
      </CardHeader>
      <CardContent className="p-4">
        {courses.length === 0 ? (
          <p className="text-xs text-slate-600">No course enrollments are on file yet.</p>
        ) : (
          <ChartContainer config={chartConfig} className="h-56 w-full">
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-slate-200" />
              <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} className="text-slate-500 text-xs" />
              <YAxis type="category" dataKey="status" width={90} tickLine={false} axisLine={false} className="text-slate-700 text-xs" />
              <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
              <Bar dataKey="courses" radius={[0, 4, 4, 0]}>
                {chartData.map((item) => <Cell key={item.value} fill={item.fill} />)}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
