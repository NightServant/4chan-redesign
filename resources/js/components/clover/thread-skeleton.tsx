import type { ComponentProps } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * The loading shape of a `ThreadCard`: a byline row, three body lines and a
 * row of two pill-shaped controls, sized to read as the same silhouette
 * without importing the real card.
 */
type ThreadSkeletonProps = ComponentProps<'div'>;

function ThreadSkeleton({ className, ...props }: ThreadSkeletonProps) {
    return (
        <div
            data-slot="thread-skeleton"
            aria-hidden="true"
            className={cn('flex flex-col gap-3 p-4', className)}
            {...props}
        >
            <div className="flex items-center gap-2">
                <Skeleton className="size-6 shrink-0 rounded-full" />
                <Skeleton className="h-[11px] w-[140px]" />
            </div>

            <div className="flex flex-col gap-2">
                <Skeleton className="h-[18px] w-[82%]" />
                <Skeleton className="h-3 w-[96%]" />
                <Skeleton className="h-3 w-[64%]" />
            </div>

            <div className="flex items-center gap-2">
                <Skeleton className="h-[30px] w-[92px] rounded-full" />
                <Skeleton className="h-[30px] w-[68px] rounded-full" />
            </div>
        </div>
    );
}

export { ThreadSkeleton };
export type { ThreadSkeletonProps };
