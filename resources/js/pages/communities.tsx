import { Head } from '@inertiajs/react';
import { BoardDirectory } from '@/components/communities/board-directory';
import { BOARD_DIRECTORY } from '@/fixtures/clover';

/**
 * The board directory. Public, like the boards it lists: an anon deciding
 * whether the site is worth an account has to be able to see what is on it.
 */
export default function Communities() {
    return (
        <>
            <Head title="Communities" />

            <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 px-6 py-8">
                <BoardDirectory boards={BOARD_DIRECTORY} />
            </div>
        </>
    );
}
