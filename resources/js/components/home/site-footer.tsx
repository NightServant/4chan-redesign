import { Link } from '@inertiajs/react';
import { useId } from 'react';
import { MachineValue } from '@/components/clover/machine-value';
import { SectionLabel } from '@/components/clover/section-label';
import { Wordmark } from '@/components/clover/wordmark';
import {
    communities,
    contact,
    contribute,
    dmca,
    faq,
    janitors,
    privacy,
    report,
    rules,
    search,
    status,
    terms,
} from '@/routes';

/**
 * Every destination here resolves to a real page. Most of those pages say only
 * that they have not been written yet, which is the honest state of things.
 *
 * The alternatives were worse. `href="#"` and a preventDefault'd anchor both
 * dress an inert entry as a working link. A `disabled` button is honest about
 * being unavailable, but it is also the wrong semantic (these are
 * destinations, not controls) and the browser drops it from the tab order, so
 * twelve of them would erase the footer's structure for anyone navigating by
 * keyboard or screen reader. A real link to a page that admits it is empty
 * costs one route and lies to nobody.
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
            { label: 'Search', href: search().url },
            { label: 'Janitor queue', href: janitors().url },
            { label: 'Status', href: status().url },
        ],
    },
    {
        heading: 'Community',
        items: [
            { label: 'Rules', href: rules().url },
            { label: 'FAQ', href: faq().url },
            { label: 'Report a post', href: report().url },
            { label: 'Contribute', href: contribute().url },
        ],
    },
    {
        heading: 'Legal',
        items: [
            { label: 'Terms', href: terms().url },
            { label: 'Privacy', href: privacy().url },
            { label: 'DMCA', href: dmca().url },
            { label: 'Contact', href: contact().url },
        ],
    },
];

function FooterLinkGroup({ heading, items }: LinkGroup) {
    const headingId = useId();

    return (
        <nav aria-labelledby={headingId} className="flex flex-col gap-3">
            <SectionLabel id={headingId}>{heading}</SectionLabel>
            <ul className="flex flex-col gap-2">
                {items.map((item) => (
                    <li key={item.label}>
                        <Link
                            href={item.href}
                            className="text-body-sm text-muted-foreground transition-colors duration-[var(--duration-hover)] ease-standard hover:text-foreground"
                        >
                            {item.label}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

function SiteFooter() {
    return (
        <footer className="border-t border-border bg-surface">
            <div
                className="mx-auto grid max-w-[1180px] gap-7 px-6 py-9"
                style={{
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                }}
            >
                <div className="flex flex-col gap-2">
                    <Wordmark />
                    <MachineValue>
                        Anonymous discussion, since 2024.
                    </MachineValue>
                </div>

                {LINK_GROUPS.map((group) => (
                    <FooterLinkGroup key={group.heading} {...group} />
                ))}
            </div>
        </footer>
    );
}

export { SiteFooter };
