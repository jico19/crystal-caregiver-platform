import { ArrowRight, UserPlus, CheckCircle2, Loader2 } from 'lucide-react';
import SignaturePad from '../../../shared/components/common/SignaturePad';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import FormField from '../../../shared/components/common/FormField';

export default function ClientIntakeForm({
  form,
  isIntakeComplete,
  setIsEditing,
}) {
  const {
    register,
    submit,
    stateId,
    setStateId,
    signatureData,
    setSignatureData,
    submitting,
  } = form;
  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="p-4 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-emerald-600" />
              Care Recipient Information
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Please provide legal identification for the person receiving care.
            </CardDescription>
          </div>
          {isIntakeComplete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
              className="h-7 text-xs text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-5">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="First Name"
                htmlFor="client-first-name"
                required
              >
                <Input
                  id="client-first-name"
                  type="text"
                  required
                  {...register('firstName')}
                  placeholder="e.g., Eleanor"
                  className="h-9 text-xs"
                />
              </FormField>

              <FormField label="Last Name" htmlFor="client-last-name" required>
                <Input
                  id="client-last-name"
                  type="text"
                  required
                  {...register('lastName')}
                  placeholder="e.g., Vance"
                  className="h-9 text-xs"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Service State Jurisdiction"
                htmlFor="client-state"
                required
              >
                <Select
                  value={stateId}
                  onValueChange={(val) => setStateId(val)}
                >
                  <SelectTrigger id="client-state" className="h-9 text-xs">
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1" className="text-xs">
                      Florida (FL)
                    </SelectItem>
                    <SelectItem value="2" className="text-xs">
                      Indiana (IN)
                    </SelectItem>
                    <SelectItem value="3" className="text-xs">
                      Georgia (GA)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              <FormField label="Date of Birth" htmlFor="client-dob" required>
                <Input
                  id="client-dob"
                  type="date"
                  required
                  {...register('dateOfBirth')}
                  className="h-9 text-xs"
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Primary Contact Phone" htmlFor="client-phone">
                <Input
                  id="client-phone"
                  type="tel"
                  {...register('phone')}
                  placeholder="(555) 000-0000"
                  className="h-9 text-xs"
                />
              </FormField>

              <FormField
                label="Medicaid ID or Insurance Number"
                htmlFor="client-medicaid"
              >
                <Input
                  id="client-medicaid"
                  type="text"
                  {...register('medicaidNumber')}
                  placeholder="e.g., 9-digit State Medicaid ID"
                  className="h-9 text-xs"
                />
              </FormField>
            </div>

            <FormField
              label="Home Service Address (Street, City, ZIP)"
              htmlFor="client-address"
            >
              <Input
                id="client-address"
                type="text"
                {...register('address')}
                placeholder="e.g., 123 Main St, Orlando, FL 32801"
                className="h-9 text-xs"
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      {/* Electronic Signature Confirmation */}
      <Card className="bg-white border-slate-200 shadow-sm">
        <CardHeader className="p-4 pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Admission Acknowledgement & Signature
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            By signing below, you affirm that the care recipient information
            provided is accurate and request initiation of home care services.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <FormField
              label="Full Legal Name of Signer (typed)"
              htmlFor="client-signed-name"
              required
            >
              <Input
                id="client-signed-name"
                type="text"
                required
                {...register('signedName')}
                placeholder="Enter the signer's full legal name"
                className="h-9 text-xs"
              />
            </FormField>

            <FormField label="Draw Legal Signature" required>
              <div className="border border-slate-200 rounded-md p-1 bg-white">
                <SignaturePad
                  value={signatureData}
                  onChange={setSignatureData}
                  height={160}
                />
              </div>
            </FormField>

            <div className="flex justify-end gap-2 pt-2">
              {isIntakeComplete && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                  className="h-9 text-xs text-slate-600"
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs gap-1.5"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Saving Admission...
                  </>
                ) : (
                  <>
                    Sign & Submit Admission Intake <ArrowRight size={13} />
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
