import * as TabsPrimitive from '@radix-ui/react-tabs';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Clover tabs, built on Radix's roving-tabindex primitive rather than the
 * prototype's `tabs={[]}` array prop, so callers compose it the same way
 * every other Radix-backed primitive in this repo is composed.
 *
 * The active trigger is never colour alone: it carries a filled underline
 * that survives greyscale and colour-blind viewing, on top of the
 * foreground/muted-foreground text shift.
 */

function Tabs({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
    return (
        <TabsPrimitive.Root
            data-slot="tabs"
            className={cn('flex flex-col gap-4', className)}
            {...props}
        />
    );
}

function TabsList({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
    return (
        <TabsPrimitive.List
            data-slot="tabs-list"
            className={cn(
                'inline-flex w-fit items-center gap-1 border-b border-border',
                className,
            )}
            {...props}
        />
    );
}

function TabsTrigger({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
    return (
        <TabsPrimitive.Trigger
            data-slot="tabs-trigger"
            className={cn(
                /* A tab is ~36px tall at `py-2`, under the touch minimum,
                   and the board page's sort tabs are the ones an anon reaches
                   for on a phone. The hit area grows on a coarse pointer; the
                   rule under the active tab does not move. */
                'touch-target-44 -mb-px inline-flex items-center justify-center border-b-2 border-transparent px-3 py-2 text-body-sm font-medium whitespace-nowrap text-muted-foreground',
                'transition-colors duration-[var(--duration-hover)] ease-standard',
                'hover:not-disabled:text-foreground',
                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                'disabled:pointer-events-none disabled:opacity-60',
                'data-[state=active]:border-primary data-[state=active]:text-foreground',
                className,
            )}
            {...props}
        />
    );
}

function TabsContent({
    className,
    ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
    return (
        <TabsPrimitive.Content
            data-slot="tabs-content"
            className={cn(
                'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                className,
            )}
            {...props}
        />
    );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
