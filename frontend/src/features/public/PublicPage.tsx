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
      <section className="px-[max(24px,6vw)] py-16 max-md:py-10">
        <h1 className="mb-6 font-serif text-[clamp(36px,5vw,72px)] leading-[1.08] tracking-[-1.8px]">
          State not found
        </h1>
        <Link to="/">Return home</Link>
      </section>
    );
  }

  return (
    <>
      <section className="grid min-h-[calc(100svh-140px)] grid-cols-[1.4fr_1fr] items-center gap-[8vw] max-md:grid-cols-1 max-md:gap-10 max-md:py-12">
        <div>
          <p className="mb-6 text-[13px] text-[#4b6456]">Florida · Indiana · Georgia</p>
          <h1 className="mb-6 font-serif text-[clamp(36px,5vw,72px)] leading-[1.08] tracking-[-1.8px]">
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
                  `border-b pb-1.5 no-underline ${isActive ? "border-b-2 border-[#27543f] font-bold" : "border-[#bdc9bb]"}`
                }
                key={code}
                to={`/states/${code}`}
              >
                {name}
              </NavLink>
            ))}
          </nav>
          <a
            className="inline-flex items-center justify-center gap-2 rounded-[5px] border border-[#27543f] bg-[#27543f] px-[22px] py-3 font-sans font-semibold text-white no-underline transition-[transform,background] duration-150 hover:-translate-y-0.5 hover:bg-[#183f2c] hover:text-white active:translate-y-px"
            href="#jobs"
          >
            See caregiver opportunities
          </a>
        </div>
        <div className="rounded-md bg-[#e7ede2] p-12 max-md:p-7">
          <p className="mb-6 text-[13px] text-[#4b6456]">Your public branch</p>
          <h2 className="mb-6 font-serif text-[clamp(27px,3vw,38px)] leading-[1.2] tracking-[-0.6px]">
            {states[state]}
          </h2>
          <p className="mb-6 max-w-[62ch]">
            Illustrative support with daily living, companionship, and care coordination.
          </p>
          <hr />
          <p className="mb-6 max-w-[62ch]">
            Services, licensing details, and contact information await agency confirmation.
          </p>
          <Link to="/login">Open your portal →</Link>
        </div>
      </section>

      <section className="px-[max(24px,6vw)] py-16 max-md:py-10" id="jobs">
        <div className="flex items-end justify-between gap-8 max-md:block">
          <div>
            <p className="mb-6 text-[13px] text-[#4b6456]">Careers / {states[state]}</p>
            <h2 className="mb-6 font-serif text-[clamp(27px,3vw,38px)] leading-[1.2] tracking-[-0.6px]">
              Caregiver opportunities
            </h2>
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
            className="flex items-center justify-between gap-12 border-t border-[#ccd5c9] py-8 max-md:block"
            key={job.public_id}
          >
            <div>
              <h3 className="mb-3 text-xl font-medium">{job.title}</h3>
              <p className="mb-6 max-w-[62ch]">{job.description}</p>
            </div>
            <Link
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[5px] border border-[#27543f] bg-transparent px-[22px] py-3 font-sans font-semibold text-[#27543f] no-underline transition-[transform,background] duration-150 hover:-translate-y-0.5 hover:bg-[#183f2c] hover:text-white active:translate-y-px"
              to={`/jobs/${job.public_id}`}
            >
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
