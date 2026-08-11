import { Head } from '@inertiajs/react';
import AppearanceTabs from '@/components/appearance-tabs';
import { Panel } from '@/components/clover/panel';

/**
 * The settings layout supplies this screen's h1, so nothing here renders a
 * heading of its own.
 */
export default function Appearance() {
    return (
        <>
            <Head title="Appearance settings" />

            <Panel title="Theme">
                <div className="flex flex-col gap-4">
                    <p className="text-body-sm text-muted-foreground">
                        Clover is dark by default. System follows whatever your
                        operating system is set to.
                    </p>

                    <AppearanceTabs />
                </div>
            </Panel>
        </>
    );
}
