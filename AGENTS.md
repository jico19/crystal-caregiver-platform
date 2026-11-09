# Repository Guidelines

## Project Structure & Module Organization

- `frontend/` contains the React 19, Vite, and Tailwind CSS application. Role-specific screens live in `src/features/`; reusable hooks, layouts, services, and components live in `src/shared/`. UI primitives are in `src/components/ui/`, and routing is in `src/routes/`.
- `frontend/public/` holds static assets, including state-specific PDF packets; production output goes to `frontend/dist/`.
- `backend/` contains Django and Django REST Framework. Domain modules live in `apps/`, settings in `config/settings/`, and migrations inside each app.
- `docs/` contains the project scope. Backend tests generally sit alongside their app code in `tests.py`.

## Build, Test, and Development Commands

Run frontend commands from `frontend/`:

- `npm ci`: install dependencies from the lockfile.
- `npm run dev`: start Vite on port 5173; API and media requests proxy to port 8000.
- `npm run build`: generate the production bundle.
- `npm run lint`: run Oxlint.
- `npm run preview`: serve the production bundle locally.

Run backend commands from `backend/`, with a Python virtual environment activated:

- `python -m pip install -r requirements.txt`: install backend dependencies.
- `python manage.py migrate`: apply database migrations.
- `python manage.py runserver`: start the development API.
- `python -m pytest`: run backend tests.

## Coding Style & Naming Conventions

Use four-space indentation and `snake_case` for Python functions and modules. Use two-space indentation in JavaScript/JSX, `PascalCase` for React components, and `useCamelCase` for hooks. Match surrounding quote and semicolon conventions. Keep business logic in backend services and frontend API calls in shared services. Oxlint configuration is in `frontend/.oxlintrc.json`.

## Testing Guidelines

Backend testing uses pytest and pytest-django. Name tests `tests.py`, `test_*.py`, or `*_tests.py`. Run focused checks with `python -m pytest apps/caregivers/tests.py`. Add regression coverage for changed permissions, validation, and workflows. No numeric coverage threshold or frontend test script is configured; validate UI changes with lint, build, and relevant browser flows.

## Commit & Pull Request Guidelines

History mixes imperative summaries and occasional prefixes such as `docs:`. Prefer concise, descriptive subjects such as `Fix caregiver application validation`. Keep commits focused. PRs should explain behavior changes, list validation performed, link relevant issues, and include screenshots for UI changes. Include migrations when models change.

## Security & Configuration

Use each application's `.env.example` to configure local environments. Keep credentials and personal documents out of commits. SQLite is the local default; PostgreSQL and S3 settings are environment-driven. Use synthetic data for testing.
