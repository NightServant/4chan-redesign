import { MachineValue } from '@/components/clover/machine-value';
import { PageMeta } from '@/components/clover/page-meta';
import { SectionLabel } from '@/components/clover/section-label';

/**
 * What Clover holds, and when it last heard from 4chan.
 *
 * The sidebar footer has linked here since task 4, and the route was removed
 * in 13b along with five other pages describing things this application does
 * not have. This one describes something it really does: it mirrors another
 * site on a schedule, and how fresh that mirror is is worth publishing.
 *
 * Every figure is counted at request time, within this anon's own visibility.
 */
interface StatusProps {
    boards: number;
    threads: number;
    posts: number;
    lastSyncedAt: string | null;
    apiBaseUrl: string;
    rateLimitSeconds: number;
    /** Whether the figures are the whole database or this reader's slice. */
    complete: boolean;
}

function Figure({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-1 border-t border-border py-4">
            <MachineValue className="text-[28px] leading-none text-foreground">
                {value}
            </MachineValue>
            <span className="text-caption text-muted-foreground">{label}</span>
        </div>
    );
}

export default function Status({
    boards,
    threads,
    posts,
    lastSyncedAt,
    apiBaseUrl,
    rateLimitSeconds,
    complete,
}: StatusProps) {
    const format = (value: number): string => value.toLocaleString('en-GB');

    return (
        <>
            <PageMeta
                title="Status"
                description="How much Clover holds, when it last heard from 4chan, and exactly what it does and does not store."
            />

            <article className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-6 py-12">
                <header className="flex flex-col gap-3">
                    <SectionLabel>Clover</SectionLabel>
                    <h1 className="font-display text-[clamp(30px,3.4vw,40px)] leading-[1.1] font-bold tracking-[-0.8px] text-foreground">
                        Status
                    </h1>
                    <p className="text-[17px] leading-[1.55] text-pretty text-muted-foreground">
                        {/* "The rows it currently holds" was wrong for most
                            readers: these are counted within what you can see,
                            and a signed-out visitor sees the worksafe boards
                            only. This is the page somebody checks against a
                            sync run, so it is the last place that should
                            overstate what is here. */}
                        {complete
                            ? 'Clover mirrors 4chan on a schedule. These are the rows it currently holds, counted when this page loaded.'
                            : 'Clover mirrors 4chan on a schedule. These are the rows you can see, counted when this page loaded.'}
                    </p>
                </header>

                <div className="grid grid-cols-2 gap-x-6 sm:grid-cols-3">
                    <Figure label="Boards" value={format(boards)} />
                    <Figure label="Threads" value={format(threads)} />
                    <Figure label="Posts" value={format(posts)} />
                </div>

                <section className="flex flex-col gap-3 border-t border-border pt-6">
                    <h2 className="font-display text-h3 font-semibold text-foreground">
                        Last sync
                    </h2>
                    <p className="text-body leading-[1.6] text-muted-foreground">
                        {lastSyncedAt === null
                            ? 'Nothing has been synced yet. Until it has, the boards and threads above are empty rather than stale.'
                            : `The most recent board was updated ${lastSyncedAt}. Threads are re-read on each sync; a thread that has stopped appearing upstream keeps its rows here rather than being deleted, because a failed request and a deleted thread look identical from this side.`}
                    </p>
                </section>

                <section className="flex flex-col gap-3 border-t border-border pt-6">
                    <h2 className="font-display text-h3 font-semibold text-foreground">
                        Where the data comes from
                    </h2>
                    <p className="text-body leading-[1.6] text-muted-foreground">
                        4chan&rsquo;s read-only JSON API, at{' '}
                        <MachineValue className="text-foreground">
                            {apiBaseUrl}
                        </MachineValue>
                        . It accepts GET, HEAD and OPTIONS only, so nothing
                        written on Clover can reach it and nothing is ever
                        attempted.
                    </p>
                    <p className="text-body leading-[1.6] text-muted-foreground">
                        Its documentation asks for no more than one request a
                        second, and the client honours that as a floor rather
                        than a target: one request every{' '}
                        <MachineValue className="text-foreground">
                            {rateLimitSeconds}s
                        </MachineValue>
                        , with an <MachineValue>If-Modified-Since</MachineValue>{' '}
                        header on every one.
                    </p>
                    <p className="text-body leading-[1.6] text-muted-foreground">
                        Attachments are not stored. Clover keeps the identifier
                        of a file and your browser fetches the image from
                        4chan&rsquo;s own servers, which is the arrangement its
                        documentation describes.
                    </p>
                </section>
            </article>
        </>
    );
}
