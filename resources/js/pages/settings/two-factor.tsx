import { Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import { PageMeta } from '@/components/clover/page-meta';
import { Panel } from '@/components/clover/panel';
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
import { Button } from '@/components/ui/button';
import { edit as editSettings } from '@/routes/settings';

/**
 * Two-factor authentication, on a page of its own.
 *
 * The account menu links straight here. It used to link at
 * `/settings#two-factor`, which lands an anon in the middle of a page of six
 * panels and asks them to find the thing they pressed a button to reach.
 *
 * The settings layout supplies the h1, so nothing here renders a heading of
 * its own. The way back is explicit, because this is the one settings screen
 * an anon can arrive at without passing through settings.
 */
export default function TwoFactor(props: ManageTwoFactorProps) {
    return (
        <>
            <PageMeta
                title="Two-factor authentication"
                description="Add a second step to signing in, using an authenticator app."
            />

            <Panel title="Two-factor authentication">
                <ManageTwoFactor {...props} />
            </Panel>

            <div>
                <Button variant="ghost" asChild>
                    <Link href={editSettings()}>
                        <ArrowLeft aria-hidden="true" />
                        Back to settings
                    </Link>
                </Button>
            </div>
        </>
    );
}
