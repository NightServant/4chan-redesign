import { Link } from '@inertiajs/react';
import { useId } from 'react';
import { MachineValue } from '@/components/clover/machine-value';
import { PatternField } from '@/components/clover/pattern-field';
import { SectionLabel } from '@/components/clover/section-label';
import { Wordmark } from '@/components/clover/wordmark';
import { CONTACT_EMAIL } from '@/content/information';
import { communities, faq, privacy, rules, terms } from '@/routes';

/**
 * Five destinations and one address, down from twelve destinations.
 *
 * The twelve all resolved, and all but one resolved to a page saying it had
 * not been written. That was honest, and it was still the wrong answer: a
 * footer is a map of the product, and this one advertised a janitor queue, a
 * report flow, a contribution guide, a status page, a DMCA process and a
 * contact label for a read-only mirror that had none of those things. Being
 * upfront that a page is empty does not help when the page should not exist.
 *
 * What is left is what Clover can actually answer for: what the boards are,
 * how the site behaves, what it does with an account, and what it does not
 * collect. Those get written rather than stubbed. The address is the one
 * thing added back, because there is now an inbox behind it; it is shown as
 * the address, not a label, and what happens to a message is on the Privacy
 * page.
 */
type LinkGroup = {
    heading: string;
    items: readonly { label: string; href: string }[];
};

const LINK_GROUPS: readonly LinkGroup[] = [
    {
        heading: 'Product',
        items: [
            { label: 'Boards', href: communities().url },
            { label: 'Rules', href: rules().url },
            { label: 'FAQ', href: faq().url },
        ],
    },
    {
        heading: 'Legal',
        items: [
            { label: 'Terms', href: terms().url },
            { label: 'Privacy', href: privacy().url },
            { label: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` },
        ],
    },
];

const LINK_CLASS =
    'text-body-sm text-muted-foreground transition-colors duration-[var(--duration-hover)] ease-standard hover:text-foreground';

function FooterLinkGroup({ heading, items }: LinkGroup) {
    const headingId = useId();

    return (
        <nav aria-labelledby={headingId} className="flex flex-col gap-3">
            <SectionLabel id={headingId}>{heading}</SectionLabel>
            <ul className="flex flex-col gap-2">
                {items.map((item) => (
                    <li key={item.label}>
                        {/* `mailto:` is not a page: `Link` would try to visit
                            it over XHR, so it gets a plain anchor. */}
                        {item.href.startsWith('mailto:') ? (
                            <a
                                href={item.href}
                                className={`${LINK_CLASS} break-all`}
                            >
                                {item.label}
                            </a>
                        ) : (
                            <Link href={item.href} className={LINK_CLASS}>
                                {item.label}
                            </Link>
                        )}
                    </li>
                ))}
            </ul>
        </nav>
    );
}

function SiteFooter() {
    return (
        <footer className="border-t border-border bg-surface">
            <PatternField depth={30} feather={false}>
                <div
                    className="mx-auto grid max-w-(--measure-page) gap-7 border-x border-border px-6 py-9"
                    style={{
                        /* `min(180px, 100%)`, not a bare 180px minimum — see
                           board-directory.tsx for the overflow a bare pixel
                           minimum produces at a 320px viewport. */
                        gridTemplateColumns:
                            'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
                    }}
                >
                    <div className="flex flex-col gap-2">
                        <Wordmark />
                        {/* The year is read, not written in.
                       
                        It said 2024, which was wrong the moment 2025 arrived
                        and would be wrong again every January. A hardcoded
                        year is a bug with a scheduled start date. */}
                        <MachineValue>
                            &copy; {new Date().getFullYear()} Clover. Anonymous
                            discussion.
                        </MachineValue>
                    </div>

                    {LINK_GROUPS.map((group) => (
                        <FooterLinkGroup key={group.heading} {...group} />
                    ))}
                </div>
            </PatternField>
        </footer>
    );
}

export { SiteFooter };
