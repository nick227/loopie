import { PILLAR_GROUPS, type Pillar, type PillarGroup } from '../data/pillars'

function PillarCell({ pillar }: { pillar: Pillar }) {
  return (
    <div>
      <h4 className="text-base font-medium text-foreground">{pillar.name}</h4>
      <p className="mt-1 text-sm text-muted-foreground">{pillar.copy}</p>
    </div>
  )
}

function PillarGroupSection({ group }: { group: PillarGroup }) {
  return (
    <div className="grid grid-cols-1 gap-8 py-14 first:pt-0 sm:py-16 lg:grid-cols-[30%_70%] lg:gap-12">
      <div>
        <h3 className="text-xl font-semibold tracking-tight text-foreground">{group.name}</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{group.description}</p>
      </div>

      <div className="grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2">
        {group.pillars.map((pillar) => (
          <PillarCell key={pillar.id} pillar={pillar} />
        ))}
      </div>
    </div>
  )
}

/**
 * The product's pillar index — entirely typographic, by design: Hero and River already carry
 * the page's visual content, so this section's job is to be exactly repeatable and scannable,
 * not visually distinctive per group. Every row is the same shape: a left column (30%) with the
 * group's heading and one sentence, and a right column (70%) with its capabilities in a plain
 * 2-column grid — same title size, same description size, same gaps, in every group, regardless
 * of how many capabilities it has. See docs/strategy/public-marketing-homepage-proposal.md.
 */
export function PillarIndex() {
  return (
    <section id="pillars" className="border-t border-border pt-16 sm:pt-24">
      <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
        What LOOPIE does
      </h2>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
        Run customer acquisition, follow-up, sales, operations, and partner growth from one place.
      </p>

      <div className="mt-8 divide-y divide-border">
        {PILLAR_GROUPS.map((group) => (
          <PillarGroupSection key={group.id} group={group} />
        ))}
      </div>
    </section>
  )
}
