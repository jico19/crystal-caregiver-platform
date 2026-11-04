import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function CaregiverHoursChart() {
  return (
    <Card className="border-slate-200">
      <CardHeader className="p-4 pb-2 border-b border-slate-100">
        <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Clock className="h-4 w-4 text-emerald-600" /> Care Schedule
        </CardTitle>
        <CardDescription className="text-xs text-slate-500">Your assigned client schedules</CardDescription>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <p className="text-xs text-slate-600">A weekly hours summary is not available here. View your assigned clients to check their scheduled care visits.</p>
        <Button variant="outline" size="sm" asChild className="text-xs">
          <Link to="/caregiver/clients">View client schedules</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
