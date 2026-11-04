import FormField from '../../../../shared/components/common/FormField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ApplicationPersonalInfoStep({
  user,
  register,
  errors,
}) {
  return (
    <div id="step-1" className="space-y-4">
      <div className="border-b border-slate-100 pb-2">
        <h2 className="font-semibold text-base text-slate-900 m-0">
          Step 1: Personal & Contact Information
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Your legal name as it appears on your state-issued identification.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="First Name"
          id="first_name"
          required
          error={errors.first_name?.message}
        >
          <Input
            id="first_name"
            type="text"
            required
            autoComplete="given-name"
            className="h-9 text-xs"
            {...register('first_name')}
            placeholder="Jane"
          />
        </FormField>

        <FormField
          label="Last Name"
          id="last_name"
          required
          error={errors.last_name?.message}
        >
          <Input
            id="last_name"
            type="text"
            required
            autoComplete="family-name"
            className="h-9 text-xs"
            {...register('last_name')}
            placeholder="Doe"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Email Address"
          id="email"
          required
          hint={user ? `Signed in as ${user.email}` : undefined}
          error={!user ? errors.email?.message : undefined}
        >
          <Input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            disabled={Boolean(user)}
            className="h-9 text-xs disabled:bg-slate-50 disabled:text-slate-500"
            {...register('email')}
            placeholder="jane.doe@example.com"
          />
        </FormField>

        <FormField
          label="Phone Number"
          id="phone"
          required
          error={errors.phone?.message}
        >
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            className="h-9 text-xs"
            {...register('phone')}
            placeholder="(555) 000-0000"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Licensing State Office"
          id="state_id"
          required
          error={errors.state_id?.message}
        >
          <select
            id="state_id"
            className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
            {...register('state_id')}
          >
            <option value="1">Florida (FL)</option>
            <option value="2">Indiana (IN)</option>
            <option value="3">Georgia (GA)</option>
          </select>
        </FormField>

        <FormField
          label="Residential Address"
          id="address"
        >
          <Input
            id="address"
            type="text"
            autoComplete="street-address"
            className="h-9 text-xs"
            {...register('address')}
            placeholder="123 Main St, City, State, ZIP"
          />
        </FormField>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          label="Date of Birth"
          id="dob"
        >
          <Input
            id="dob"
            type="date"
            inputMode="numeric"
            className="h-9 text-xs"
            {...register('date_of_birth')}
          />
        </FormField>

        <FormField
          label="SSN (Last 4 digits only)"
          id="ssn"
          hint="Used strictly for state nurse registry and background screening lookup."
          error={errors.ssn_last4?.message}
        >
          <Input
            id="ssn"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            className="h-9 text-xs"
            {...register('ssn_last4', {
              onChange: (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
              },
            })}
            placeholder="••••"
          />
        </FormField>
      </div>

      <FormField
        label="Experience, Certifications & Availability"
        id="notes"
      >
        <Textarea
          id="notes"
          rows={3}
          className="text-xs resize-none"
          {...register('notes')}
          placeholder="E.g., CNA licensed, CPR/First Aid current, 3 years home health aide experience, available weekdays and alternate weekends."
        />
      </FormField>
    </div>
  );
}
