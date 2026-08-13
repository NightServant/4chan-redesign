import { Head } from '@inertiajs/react';
import { FileTextIcon } from 'lucide-react';
import { EmptyState } from '@/components/clover/empty-state';
import { SectionLabel } from '@/components/clover/section-label';
import { INFORMATION } from '@/content/information';

/**
 * Clover's standing pages: Rules, FAQ, Terms and Privacy.
 *
 * There were twelve of these, and eleven of them said only that they had not
 * been written. That was honest, and it was still wrong: a footer is a map of
 * the product, and it was advertising a janitor queue, a report flow, a
 * contribution guide, a status page, a DMCA process and a contact address for
 * a read-only mirror that has none of them. The six that described things
 * Clover does not do were removed rather than written.
 *
 * The four that remain describe things it does, so they carry real copy now,
 * kept in `@/content/information` where it can be read as prose.
 *
 * `Search` is the one exception still routed here. It is a real destination
 * with a real feature behind it that has not been built, so it keeps the
 * placeholder until it has one.
 */
export default function Information({ title }: { title: string }) {
    const page = INFORMATION[title];

    if (page === undefined) {
        return (
            <>
                <Head title={title} />
                <EmptyState
                    icon={<FileTextIcon />}
                    title={title}
                    body="This page has not been written yet. The link is here because the page belongs in the product, not because it is ready."
                />
            </>
        );
    }

    return (
        <>
            <Head title={title} />

            <article className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-6 py-12">
                <header className="flex flex-col gap-3">
                    <SectionLabel>Clover</SectionLabel>

                    <h1 className="font-display text-[clamp(30px,3.4vw,40px)] leading-[1.1] font-bold tracking-[-0.8px] text-balance text-foreground">
                        {title}
                    </h1>

                    <p className="text-[17px] leading-[1.55] text-pretty text-muted-foreground">
                        {page.summary}
                    </p>
                </header>

                {/* Hairlines between sections, no boxes. The same rule the
                    homepage bands follow, for the same reason: a stack of
                    bordered panels reads as unrelated slabs. */}
                <div className="flex flex-col gap-8">
                    {page.sections.map((section) => (
                        <section
                            key={section.heading}
                            className="flex flex-col gap-3 border-t border-border pt-6"
                        >
                            <h2 className="font-display text-h3 font-semibold text-balance text-foreground">
                                {section.heading}
                            </h2>

                            {section.body.map((paragraph) => (
                                <p
                                    key={paragraph}
                                    className="text-body leading-[1.6] text-pretty text-muted-foreground"
                                >
                                    {paragraph}
                                </p>
                            ))}
                        </section>
                    ))}
                </div>
            </article>
        </>
    );
}
