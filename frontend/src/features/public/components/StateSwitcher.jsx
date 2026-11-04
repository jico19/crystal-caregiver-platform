import { useNavigate, useParams } from 'react-router-dom';
import { VALID_STATES } from '../../../shared/contexts/StateContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';

export default function StateSwitcher() {
  const navigate = useNavigate();
  const params = useParams();
  const currentState = params.state || 'florida';

  function handleValueChange(next) {
    if (!next) return;
    const pathSegments = window.location.pathname.split('/');
    const subPath = pathSegments.slice(2).join('/');
    navigate(`/${next}${subPath ? '/' + subPath : ''}`);
  }

  return (
    <div className="w-[110px]">
      <Select value={currentState} onValueChange={handleValueChange}>
        <SelectTrigger className="h-8 text-xs font-semibold uppercase bg-white border-slate-200">
          <SelectValue placeholder="State" />
        </SelectTrigger>
        <SelectContent>
          {VALID_STATES.map((s) => (
            <SelectItem key={s} value={s} className="text-xs uppercase font-medium">
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
