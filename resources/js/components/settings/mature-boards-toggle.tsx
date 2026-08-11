import { router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { Switch } from '@/components/clover/switch';
import { update } from '@/routes/board-preference';

/**
 * Whether adult boards appear in the directory.
 *
 * Saves the moment it is flipped rather than sitting behind a Save button.
 * Grouping a content-visibility choice into a form an anon might abandon
 * halfway would leave them wrong about what they had agreed to see, and this
 * is the one setting here where being wrong about that actually matters.
 *
 * The switch holds its own state so the control does not sit dead while the
 * request is in flight, and rolls back if the request fails. Nothing here
 * pretends the write succeeded before the server said so.
 */
export function MatureBoardsToggle() {
    const { showsMatureBoards } = usePage().props;
    const [checked, setChecked] = useState(showsMatureBoards);
    const [saving, setSaving] = useState(false);

    function handleChange(next: boolean): void {
        const previous = checked;

        setChecked(next);
        setSaving(true);

        router.patch(
            update.url(),
            { shows_mature_boards: next },
            {
                preserveScroll: true,
                onError: () => setChecked(previous),
                onFinish: () => setSaving(false),
            },
        );
    }

    return (
        <div className="flex flex-col gap-2">
            <Switch
                checked={checked}
                onCheckedChange={handleChange}
                disabled={saving}
                label="Show adult boards"
            />

            <p className="text-meta text-muted-foreground">
                Boards 4chan marks as not worksafe are hidden until you turn
                this on. It changes what the directory lists, not what is on the
                boards themselves.
            </p>
        </div>
    );
}
