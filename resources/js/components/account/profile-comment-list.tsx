import { MachineValue } from '@/components/clover/machine-value';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ProfileComment } from '@/types/clover';

type ProfileCommentListProps = {
    comments: readonly ProfileComment[];
};

/**
 * The replies this anon wrote, as listed on their own profile.
 *
 * `quoted` is stored without its leading chevron, so the chevron is added
 * here rather than in the fixture: it is the greentext marker, which is
 * presentation, and baking it into the data would mean a reply could arrive
 * already carrying one and end up with two.
 */
function ProfileCommentList({ comments }: ProfileCommentListProps) {
    return (
        <Card className="gap-0 py-0">
            <ul>
                {comments.map((comment, index) => (
                    <li
                        /* Board and number, not the number alone. Post
                           numbering is per board -- `LocalPostNumbers::BASE`
                           starts every board's local sequence at
                           9,000,000,000, exactly as 4chan numbers per board --
                           so this anon's first reply on /g/ and their first on
                           /co/ are both 9000000000. React was being handed two
                           children with the same key, free to duplicate or
                           drop either, and saying so in `browser.log` on every
                           visit to this screen. */
                        key={`${comment.board}${comment.no}`}
                        className={cn(
                            'flex flex-col gap-1.5 px-[18px] py-4',
                            index < comments.length - 1 &&
                                'border-b border-border',
                        )}
                    >
                        <MachineValue>
                            {`${comment.board} · reply to >>${comment.threadNo} · ${comment.time}`}
                        </MachineValue>

                        <p className="text-body-sm text-pretty text-foreground">
                            {comment.body}
                        </p>

                        {comment.quoted ? (
                            <p className="text-body-sm text-primary italic">
                                {`>${comment.quoted}`}
                            </p>
                        ) : null}
                    </li>
                ))}
            </ul>
        </Card>
    );
}

export { ProfileCommentList };
export type { ProfileCommentListProps };
