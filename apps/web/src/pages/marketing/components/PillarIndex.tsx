import { Link } from 'react-router-dom'
import { CAPABILITIES } from '../data/pillars'

export function PillarIndex() {
  return (
    <section
      id="pillars"
      aria-labelledby="capabilities-title"
      className="scroll-mt-24 border-t border-border py-14 sm:py-20"
    >
      <h2 id="capabilities-title" className="text-3xl font-semibold tracking-tight sm:text-4xl">
        What’s included
      </h2>
      <table className="mt-10 w-full border-collapse text-left sm:mt-12">
        <caption className="sr-only">LOOPIE tools and what you can do with them</caption>
        <thead className="sr-only">
          <tr className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
            <th scope="col" className="pb-4 pr-8 font-medium sm:w-[34%]">
              Tool
            </th>
            <th scope="col" className="pb-4 font-medium">
              What you can do
            </th>
          </tr>
        </thead>
        <tbody>
          {CAPABILITIES.map((item) => (
            <tr key={item.name} className="block border-b border-border py-7 sm:table-row sm:py-0">
              <th
                scope="row"
                className="block sm:w-[34%] text-lg font-medium tracking-tight sm:table-cell sm:py-9 sm:pr-10 sm:align-top"
              >
                {item.name}
              </th>
              <td className="block pt-3 sm:table-cell sm:py-9">
                <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
                  {item.copy}
                </p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Link
        to="/river"
        className="mt-6 inline-block rounded text-sm font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Browse River <span aria-hidden="true">↗</span>
      </Link>
    </section>
  )
}
