import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';
import type * as React from 'react';

/**
 * A disclosure: a trigger, and the region it opens.
 *
 * Radix's collapsible, wrapped only far enough to carry the `data-slot`
 * attributes every other primitive in this directory carries. It owns
 * `aria-expanded`, `aria-controls`, the id that joins the two, the keyboard
 * handling and the `data-state` the animation hangs off — none of which is
 * worth re-implementing, and all of which is what "hand-rolled disclosure
 * state" gets wrong.
 *
 * `@radix-ui/react-collapsible` was already a dependency of this application
 * and had no other caller, so this adds nothing to the manifest. Radix's
 * *accordion* package is not installed and adding it would be a dependency
 * change; an accordion is a set of these coordinated by which one is open,
 * which the caller supplies as an ordinary controlled prop.
 *
 * The trigger is not given a heading here. Whether a disclosure's trigger
 * belongs inside an `h3` depends on whether the thing it opens is a section of
 * the document, and only the caller knows that — see `home/features.tsx`,
 * where it does and the trigger is wrapped accordingly.
 */
function Collapsible({
    ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
    return <CollapsiblePrimitive.Root data-slot="collapsible" {...props} />;
}

function CollapsibleTrigger({
    ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleTrigger>) {
    return (
        <CollapsiblePrimitive.CollapsibleTrigger
            data-slot="collapsible-trigger"
            {...props}
        />
    );
}

function CollapsibleContent({
    ...props
}: React.ComponentProps<typeof CollapsiblePrimitive.CollapsibleContent>) {
    return (
        <CollapsiblePrimitive.CollapsibleContent
            data-slot="collapsible-content"
            {...props}
        />
    );
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
