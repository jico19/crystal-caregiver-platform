import { useQuery } from "@tanstack/react-query";
import { Link, NavLink, useParams } from "react-router-dom";
import { api } from "../../api/client";
import type { Job, Page } from "../../api/types";
import { Failure } from "../../components/Failure";
import { Loading } from "../../components/Loading";

const states: Record<string, string> = {
  FL: "Florida",
  IN: "Indiana",
  GA: "Georgia",
};

export default function PublicPage() {
  const { state = "FL" } = useParams();
  const jobs = useQuery({
    queryKey: ["jobs", state],
    queryFn: async () =>
      (
        await api.get<Page<Job>>("jobs/", {
          params: { branch__state_code: state },
        })
      ).data,
  });

  if (!states[state]) {
    return (
      <section className="page-section">
        <h1 className="mb-6 font-serif text-display">State not found</h1>
        <Link to="/">Return home</Link>
      </section>
    );
  }

  return (
    <>
      <section className="page-section grid min-h-[calc(100svh-140px)] grid-cols-1 items-center gap-10 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] md:gap-[8vw]">
        <div>
          <p className="mb-6 text-caption text-muted-foreground">Florida · Indiana · Georgia</p>
          <h1 className="mb-6 font-serif text-display">
            Home care,
            <br />
            close to home.
          </h1>
          <p className="mb-6 max-w-[36ch] text-[19px]">
            A unified home-care agency prototype for families, caregivers, and the teams who support
            them.
          </p>
          <nav
            className="my-8 flex flex-wrap items-center gap-6"
            aria-label="Public state selection"
          >
            {Object.entries(states).map(([code, name]) => (
              <NavLink
                className={({ isActive }) =>
                  `border-b pb-1.5 no-underline ${isActive ? "border-b-2 border-primary font-bold" : "border-input"}`
                }
                key={code}
                to={`/states/${code}`}
              >
                {name}
              </NavLink>
            ))}
          </nav>
          <a className="button button-primary" href="#jobs">
            See caregiver opportunities
          </a>
        </div>
        <div className="rounded-md bg-accent p-12 max-md:p-7">
          <p className="mb-6 text-caption text-muted-foreground">Your public branch</p>
          <h2 className="mb-6 font-serif text-section">{states[state]}</h2>
          <p className="mb-6 max-w-[62ch]">
            Illustrative support with daily living, companionship, and care coordination.
          </p>
          <hr className="my-6 border-border" />
          <p className="mb-6 max-w-[62ch]">
            Services, licensing details, and contact information await agency confirmation.
          </p>
          <Link to="/login">Open your portal →</Link>
        </div>
      </section>

      <section className="page-section" id="jobs">
        <div className="flex items-end justify-between gap-8 max-md:block">
          <div>
            <p className="mb-6 text-caption text-muted-foreground">Careers / {states[state]}</p>
            <h2 className="mb-6 font-serif text-section">Caregiver opportunities</h2>
          </div>
          <p className="mb-6 max-w-[62ch]">
            Apply with synthetic details.
            <br />
            Track your submission in your portal.
          </p>
        </div>
        {jobs.isPending ? <Loading /> : null}
        <Failure error={jobs.error} />
        {jobs.data?.results.map((job) => (
          <article
            className="flex items-center justify-between gap-12 border-t border-border py-8 max-md:block"
            key={job.public_id}
          >
            <div>
              <h3 className="mb-3 text-xl font-medium">{job.title}</h3>
              <p className="mb-6 max-w-[62ch]">{job.description}</p>
            </div>
            <Link className="button button-outline shrink-0" to={`/jobs/${job.public_id}`}>
              View job & apply →
            </Link>
          </article>
        ))}
        {jobs.data?.count === 0 ? (
          <p className="mb-6 max-w-[62ch]">No demo postings are published for this branch.</p>
        ) : null}
      </section>
    </>
  );
}
