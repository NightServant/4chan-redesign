import { Head } from '@inertiajs/react';
import { FileTextIcon } from 'lucide-react';
import { EmptyState } from '@/components/clover/empty-state';
import AppLayout from '@/layouts/app-layout';

/**
 * The utility pages the footers link to: rules, terms, status and the rest.
 *
 * None are written yet. They resolve here rather than 404ing, because a link
 * in live chrome that returns 404 is indistinguishable from a bug, and a
 * footer full of dead or disabled links reads as a broken product rather than
 * an unfinished one.
 *
 * The copy states the fact and stops. It does not promise a date.
 */
export default function Information({ title }: { title: string }) {
    return (
        <AppLayout>
            <Head title={title} />
            <EmptyState
                icon={<FileTextIcon />}
                title={title}
                body="This page has not been written yet. The link is here because the page belongs in the product, not because it is ready."
            />
        </AppLayout>
    );
}
