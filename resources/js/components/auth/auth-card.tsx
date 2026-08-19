import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Wordmark } from '@/components/clover/wordmark';
import { cn } from '@/lib/utils';
import { home } from '@/routes';

/**
 * The right half of the auth screen: the wordmark, the page's heading, and
 * whichever form the page supplies.
 *
 * The heading is an `h1` rather than the design's `h2`. Below `lg` the brand
 * panel is hidden outright, so this is the only heading the document has, and
 * a page whose sole heading is level 2 reads to a screen reader as if a level
 * above it was missed.
 *
 * The wordmark links home for the same reason: with the panel gone there is
 * otherwise no way off an auth screen except the browser's back button.
 */
type AuthCardProps = {
    /** The page's heading. Comes from the page's `layout` export. */
    title?: ReactNode;
    /** One dry line under the heading. Optional; several pages have none. */
    description?: ReactNode;
    children: ReactNode;
    className?: string;
};

function AuthCard({ title, description, children, className }: AuthCardProps) {
    const { auth } = usePage().props;
    const signedIn = Boolean(auth?.user);

    return (
        <div
            data-slot="auth-card"
            className={cn(
                /* `p-5` below `sm`. The form side around this already steps
                   its own padding down there, and a card still at `p-8` would
                   take the saving straight back: 128px of chrome on a 320px
                   viewport is what left "Confirm password" nowhere to set. */
                'flex w-full max-w-[480px] flex-col gap-6 p-5 sm:p-8',
                className,
            )}
        >
            <div className="flex flex-col gap-2">
                {/* A link out to the marketing homepage, but only for someone
                    who has not signed in yet.

                    Two of the screens this card renders -- Confirm password
                    and Verify email -- are reached while signed in, and from
                    those the link took an anon out of the product and back to
                    the pitch for it. That is the exact case `AppSidebar`'s
                    wordmark stopped being a link for; the same trap was left
                    standing here. Signed in, the mark stays as a mark. */}
                {signedIn ? (
                    <div className="mb-2 w-fit">
                        <Wordmark size={24} />
                    </div>
                ) : (
                    <Link
                        href={home()}
                        aria-label="Clover home"
                        className="mb-2 w-fit rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                        <Wordmark size={24} />
                    </Link>
                )}

                <h1 className="font-display text-h1 font-bold text-balance text-foreground">
                    {title}
                </h1>

                {description ? (
                    <p
                        data-slot="auth-card-description"
                        className="text-body-sm text-pretty text-muted-foreground"
                    >
                        {description}
                    </p>
                ) : null}
            </div>

            {children}
        </div>
    );
}

export { AuthCard };
export type { AuthCardProps };
