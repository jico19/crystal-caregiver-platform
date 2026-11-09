export type Branch = {
  public_id: string
  state_code: string
  display_name: string
}

export type Role = 'super-admin' | 'state-admin' | 'caregiver' | 'client'

export type Session = {
  email: string
  roles: Role[]
  branches: Branch[]
}

export type Page<T> = {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export type Job = {
  public_id: string
  title: string
  description: string
  state_code: string
}

export type Person = {
  public_id: string
  name: string
  state_code: string
  active: boolean
}

export type Application = {
  public_id: string
  state_code: string
  status: string
  submitted_at: string
}
