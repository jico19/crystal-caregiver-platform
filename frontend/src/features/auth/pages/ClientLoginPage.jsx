import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../../shared/hooks/useAuth';
import { homePathFor } from '../../../shared/lib/roles';
import { validatePassword, validateEmail } from '../../../shared/utils/validation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Alert, AlertDescription } from '../../../components/ui/alert';

export default function ClientLoginPage() {
  const navigate = useNavigate();
  const { login, register, user } = useAuth();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [stateId, setStateId] = useState('1'); // Default Florida (1)

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // If already logged in, redirect to appropriate role portal
  if (user) {
    return <Navigate to={homePathFor(user)} replace />;
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setErrorMsg(emailCheck.error);
      return;
    }
    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      setErrorMsg(pwdCheck.error);
      return;
    }

    setIsLoading(true);

    try {
      const loggedUser = await login(emailCheck.value, password);
      navigate(homePathFor(loggedUser), { replace: true });
    } catch (err) {
      setErrorMsg(err.detail || 'Sign in failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRegisterSubmit(e) {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setErrorMsg(emailCheck.error);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    const pwdCheck = validatePassword(password);
    if (!pwdCheck.valid) {
      setErrorMsg(pwdCheck.error);
      return;
    }

    setIsLoading(true);

    try {
      await register(emailCheck.value, password, 'client', parseInt(stateId, 10));
      // Auto-login after registration
      await login(emailCheck.value, password);
      navigate('/client/dashboard');
    } catch (err) {
      setErrorMsg(err.detail || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-md">
        <Card className="border-slate-200 shadow-sm bg-white">
          <CardHeader className="text-center p-6 pb-4">
            <div className="mx-auto w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base tracking-tight mb-3 shadow-xs">
              CP
            </div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
              Client & Family Portal
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              {mode === 'login'
                ? 'Sign in to access care plans, service schedules, authorizations, and records.'
                : 'Create an account to start your family intake and home care services.'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 pt-0">
            <Tabs
              value={mode}
              onValueChange={(val) => {
                setMode(val);
                setErrorMsg('');
                setSuccessMsg('');
              }}
              className="w-full mb-6"
            >
              <TabsList className="grid w-full grid-cols-2 h-9 p-1 bg-slate-100 rounded-lg">
                <TabsTrigger value="login" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="register" className="text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-xs">
                  Create Account
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {errorMsg && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription className="text-xs">{errorMsg}</AlertDescription>
              </Alert>
            )}

            {successMsg && (
              <Alert className="mb-4 border-emerald-200 bg-emerald-50 text-emerald-900">
                <AlertDescription className="text-xs">{successMsg}</AlertDescription>
              </Alert>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="client-email" className="text-xs font-semibold text-slate-700">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="client-email"
                    type="email"
                    required
                    className="h-9 text-xs bg-white border-slate-200"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="client-password" className="text-xs font-semibold text-slate-700">
                      Password <span className="text-red-500">*</span>
                    </label>
                  </div>
                  <Input
                    id="client-password"
                    type="password"
                    required
                    className="h-9 text-xs bg-white border-slate-200"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  size="sm"
                  className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs mt-2"
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="client-reg-state" className="text-xs font-semibold text-slate-700">
                    State of Care
                  </label>
                  <Select value={stateId} onValueChange={setStateId}>
                    <SelectTrigger id="client-reg-state" className="w-full h-9 text-xs bg-white border-slate-200">
                      <SelectValue placeholder="Select state of care" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1" className="text-xs">Florida (FL)</SelectItem>
                      <SelectItem value="2" className="text-xs">Indiana (IN)</SelectItem>
                      <SelectItem value="3" className="text-xs">Georgia (GA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="client-reg-email" className="text-xs font-semibold text-slate-700">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="client-reg-email"
                    type="email"
                    required
                    className="h-9 text-xs bg-white border-slate-200"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="client@example.com"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="client-reg-password" className="text-xs font-semibold text-slate-700">
                    Create Password <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="client-reg-password"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    className="h-9 text-xs bg-white border-slate-200"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="client-reg-confirm" className="text-xs font-semibold text-slate-700">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="client-reg-confirm"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    className="h-9 text-xs bg-white border-slate-200"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  size="sm"
                  className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs mt-2"
                >
                  {isLoading ? 'Creating Account...' : 'Register Client Account'}
                </Button>
              </form>
            )}

            <div className="text-center text-xs mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
              <Link to="/florida" className="text-slate-500 hover:text-slate-900 hover:underline">
                ← Public Website
              </Link>
              <Link to="/caregiver/login" className="text-emerald-700 hover:text-emerald-800 font-medium hover:underline">
                Caregiver Login →
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}