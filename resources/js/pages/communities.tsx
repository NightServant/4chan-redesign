import { PageMeta } from '@/components/clover/page-meta';
import { BoardDirectory } from '@/components/communities/board-directory';
import type { BoardDirectoryEntry } from '@/types/clover';

/**
 * The board directory. Public, like the boards it lists: an anon deciding
 * whether the site is worth an account has to be able to see what is on it.
 *
 * The mature-boards filter used to run here, on a full list the page had
 * already been handed. That is not a boundary — data the browser holds is data
 * the anon has, whatever the interface chooses to draw — so it moved into the
 * query. An anon who has not opted in is simply never sent those boards, and
 * this page renders whatever it is given.
 *
 * That also means `showsMatureBoards` is no longer read here. It still exists
 * as a shared prop for the settings toggle that sets it.
 */
type CommunitiesProps = {
    /** Already filtered and ordered by category, server-side. */
    boards: BoardDirectoryEntry[];
    /** How many boards the anon's content settings are holding back. */
    hiddenCount: number;
};

export default function Communities({ boards, hiddenCount }: CommunitiesProps) {
    return (
        <>
            <PageMeta
                title="Communities"
                description="Every board Clover mirrors, with the number of threads on each. Reading needs no account."
            />

            <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-6 py-8">
                <BoardDirectory boards={boards} hiddenCount={hiddenCount} />
            </div>
        </>
    );
}
