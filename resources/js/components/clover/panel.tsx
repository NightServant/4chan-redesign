import type { ComponentProps, ReactNode } from 'react';
import { SectionLabel } from '@/components/clover/section-label';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * A titled region of a page: a SectionLabel header with an optional action,
 * then content. Composes `Card` and `SectionLabel` unmodified rather than
 * restyling either.
 *
 * The label names the region, so the region is a real `section` landmark
 * rather than a div standing in for one: a screen reader can jump straight to
 * "Trending" or "Recent activity" instead of reading past it.
 */
type PanelProps = ComponentProps<'section'> & {
    title: string;
    /** Trailing control in the header, e.g. a "See all" link. */
    action?: ReactNode;
    children: ReactNode;
};

function Panel({ title, action, children, className, ...props }: PanelProps) {
    return (
        <section
            aria-label={title}
            data-slot="panel"
            className={cn(className)}
            {...props}
        >
            <Card>
                <CardHeader>
                    <SectionLabel action={action}>{title}</SectionLabel>
                </CardHeader>
                <CardContent>{children}</CardContent>
            </Card>
        </section>
    );
}

export { Panel };
export type { PanelProps };
