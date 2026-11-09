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
      <section>
        <h1>State not found</h1>
        <Link to="/">Return home</Link>
      </section>
    );
  }

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Florida · Indiana · Georgia</p>
          <h1>
            Home care,
            <br />
            close to home.
          </h1>
          <p className="lead">
            A unified home-care agency prototype for families, caregivers, and the teams who support
            them.
          </p>
          <nav className="state-nav" aria-label="Public state selection">
            {Object.entries(states).map(([code, name]) => (
              <NavLink key={code} to={`/states/${code}`}>
                {name}
              </NavLink>
            ))}
          </nav>
          <a className="button" href="#jobs">
            See caregiver opportunities
          </a>
        </div>
        <div className="branch-panel">
          <p className="eyebrow">Your public branch</p>
          <h2>{states[state]}</h2>
          <p>Illustrative support with daily living, companionship, and care coordination.</p>
          <hr />
          <p>Services, licensing details, and contact information await agency confirmation.</p>
          <Link to="/login">Open your portal →</Link>
        </div>
      </section>

      <section id="jobs">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Careers / {states[state]}</p>
            <h2>Caregiver opportunities</h2>
          </div>
          <p>
            Apply with synthetic details.
            <br />
            Track your submission in your portal.
          </p>
        </div>
        {jobs.isPending ? <Loading /> : null}
        <Failure error={jobs.error} />
        {jobs.data?.results.map((job) => (
          <article className="job-row" key={job.public_id}>
            <div>
              <h3>{job.title}</h3>
              <p>{job.description}</p>
            </div>
            <Link className="button secondary" to={`/jobs/${job.public_id}`}>
              View job & apply →
            </Link>
          </article>
        ))}
        {jobs.data?.count === 0 ? <p>No demo postings are published for this branch.</p> : null}
      </section>
    </>
  );
}
