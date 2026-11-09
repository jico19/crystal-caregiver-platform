import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../api/client'
import type { Application, Page, Person, Role, Session } from '../../api/types'
import { Field, Failure, Loading } from '../../components/Forms'
import { useSession } from '../auth/session'

const titles: Record<Role, string> = {
  'super-admin': 'Agency overview',
  'state-admin': 'State administration',
  caregiver: 'Caregiver portal',
  client: 'Client portal',
}
const invitationSchema = z.object({
  email: z.email(),
  branch: z.uuid(),
  role: z.enum(['client', 'administrator']),
})
type Invitation = z.infer<typeof invitationSchema>

function InvitationForm({ session }: { session: Session }) {
  const form = useForm<Invitation>({
    resolver: zodResolver(invitationSchema),
    defaultValues: {
      email: '',
      branch: session.branches[0]?.public_id ?? '',
      role: 'client',
    },
  })
  const send = useMutation({
    mutationFn: (data: Invitation) => api.post('auth/invitations/', data),
    onSuccess: () => form.resetField('email'),
  })

  return (
    <div className="panel">
      <h2>Invite a portal user</h2>
      <p>
        Invitations are recorded in the local demo email transport. No external email
        is sent.
      </p>
      <form onSubmit={form.handleSubmit(data => send.mutate(data))}>
        <Field label="Synthetic email" error={form.formState.errors.email}>
          <input type="email" required {...form.register('email')} />
        </Field>
        <Field label="Branch" error={form.formState.errors.branch}>
          <select {...form.register('branch')}>
            {session.branches.map(branch => (
              <option key={branch.public_id} value={branch.public_id}>
                {branch.display_name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Portal role">
          <select {...form.register('role')}>
            <option value="client">Client</option>
            {session.roles.includes('super-admin') ? (
              <option value="administrator">State administrator</option>
            ) : null}
          </select>
        </Field>
        <Failure error={send.error} />
        {send.isSuccess ? (
          <output>Invitation recorded. Open the link from the backend console.</output>
        ) : null}
        <button disabled={send.isPending}>Create demo invitation</button>
      </form>
    </div>
  )
}

function RecordList({
  endpoint,
  title,
  state,
}: {
  endpoint: string
  title: string
  state: string
}) {
  const [page, setPage] = useState(1)
  const records = useQuery({
    queryKey: ['private', endpoint, state, page],
    queryFn: async () =>
      (
        await api.get<Page<Person>>(endpoint, {
          params: { page, ...(state ? { branch__state_code: state } : {}) },
        })
      ).data,
  })

  return (
    <div className="panel">
      <h2>{title}</h2>
      {records.isPending ? <Loading /> : null}
      <Failure error={records.error} />
      {records.data?.results.map(person => (
        <div className="record-row" key={person.public_id}>
          <span>{person.name}</span>
          <span>{person.state_code}</span>
        </div>
      ))}
      {records.data?.count === 0 ? <p>No accessible records.</p> : null}
      {records.data && records.data.count > 25 ? (
        <nav aria-label={`${title} pages`}>
          <button
            disabled={!records.data.previous}
            onClick={() => setPage(page - 1)}
          >
            Previous page
          </button>
          <span>Page {page}</span>
          <button disabled={!records.data.next} onClick={() => setPage(page + 1)}>
            Next page
          </button>
        </nav>
      ) : null}
    </div>
  )
}

function Applications() {
  const applications = useQuery({
    queryKey: ['private', 'applications'],
    queryFn: async () => (await api.get<Page<Application>>('applications/')).data,
  })

  return (
    <div className="panel">
      <h2>Your applications</h2>
      {applications.isPending ? <Loading /> : null}
      <Failure error={applications.error} />
      {applications.data?.results.map(app => (
        <div className="record-row" key={app.public_id}>
          <span>{app.state_code} application</span>
          <span className="status">{app.status}</span>
        </div>
      ))}
      {applications.data?.count === 0 ? (
        <p>
          You have no submitted applications.{' '}
          <Link to="/states/FL">See caregiver opportunities</Link>.
        </p>
      ) : null}
    </div>
  )
}

export default function PortalPage() {
  const session = useSession()
  const { role } = useParams<{ role: Role }>()
  const [params] = useSearchParams()
  const [state, setState] = useState('')

  if (session.isPending) return <Loading />
  if (session.error) return <Failure error={session.error} />
  if (!session.data) return <Navigate to="/login" replace />

  const user = session.data
  if (!role) {
    if (!user.roles.length) {
      return (
        <section>
          <h1>Access unavailable</h1>
          <p>Your account has no active portal assignment. Contact your demo administrator.</p>
        </section>
      )
    }
    return <Navigate to={`/portal/${user.roles[0]}`} replace />
  }
  if (!user.roles.includes(role)) {
    return (
      <section>
        <h1>Access denied</h1>
        <p>Your account does not have this portal role.</p>
        <Link to="/portal">Open your portal</Link>
      </section>
    )
  }

  const admin = role === 'super-admin' || role === 'state-admin'

  return (
    <section>
      <p className="eyebrow">Your workspace / {user.email}</p>
      <h1>{titles[role]}</h1>
      <nav className="portal-nav" aria-label="Your portals">
        {user.roles.map(item => (
          <Link key={item} to={`/portal/${item}`}>
            {titles[item]}
          </Link>
        ))}
      </nav>
      <p>
        Authorized branches:{' '}
        {user.branches.map(branch => branch.display_name).join(', ') || 'None'}
      </p>
      {params.has('submitted') ? (
        <output className="notice">
          Application submitted. Your portal account is ready. Agency review is a later
          demo phase.
        </output>
      ) : null}
      {role === 'super-admin' ? (
        <label className="field">
          Filter accessible records by state
          <select value={state} onChange={event => setState(event.target.value)}>
            <option value="">All authorized states</option>
            {user.branches.map(branch => (
              <option key={branch.public_id} value={branch.state_code}>
                {branch.display_name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <div className="portal-grid">
        {admin || role === 'caregiver' ? (
          <RecordList
            key={`caregivers-${state}`}
            endpoint="caregivers/"
            title={admin ? 'Caregiver directory' : 'Your caregiver profiles'}
            state={state}
          />
        ) : null}
        {admin || role === 'client' ? (
          <RecordList
            key={`clients-${state}`}
            endpoint="clients/"
            title={admin ? 'Client directory' : 'Your client profiles'}
            state={state}
          />
        ) : null}
        {role === 'caregiver' ? <Applications /> : null}
        {admin ? (
          <InvitationForm session={user} />
        ) : (
          <div className="panel">
            <h2>{role === 'caregiver' ? 'Onboarding' : 'Your care information'}</h2>
            <p>
              {role === 'caregiver'
                ? 'Document submission, agency review, and training are planned for later phases.'
                : 'Intake, authorizations, care plans, and schedules are planned for later phases.'}
            </p>
            <p>No sensitive documents are accepted in this foundation.</p>
          </div>
        )}
      </div>
    </section>
  )
}
