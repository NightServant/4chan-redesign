import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

function renderTooltip() {
    render(
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger>Pin thread</TooltipTrigger>
                <TooltipContent>
                    Keeps this thread at the top of the board
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>,
    );

    return screen.getByRole('button', { name: 'Pin thread' });
}

describe('Tooltip', () => {
    it('opens when the trigger receives keyboard focus, not only on hover', async () => {
        const user = userEvent.setup();
        renderTooltip();

        await user.tab();

        await waitFor(() => {
            expect(screen.getByRole('tooltip')).toBeInTheDocument();
        });
    });

    it('also opens on hover', async () => {
        const user = userEvent.setup();
        const trigger = renderTooltip();

        await user.hover(trigger);

        await waitFor(() => {
            expect(screen.getByRole('tooltip')).toBeInTheDocument();
        });
    });

    it('closes on Escape', async () => {
        const user = userEvent.setup();
        renderTooltip();

        await user.tab();
        await waitFor(() => {
            expect(screen.getByRole('tooltip')).toBeInTheDocument();
        });

        await user.keyboard('{Escape}');

        await waitFor(() => {
            expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
        });
    });

    it('styles the visible content on Clover tokens', async () => {
        const user = userEvent.setup();
        const trigger = renderTooltip();

        await user.hover(trigger);
        await waitFor(() => {
            expect(screen.getByRole('tooltip')).toBeInTheDocument();
        });

        const content = document.querySelector('[data-slot="tooltip-content"]');

        expect(content).toHaveClass(
            'bg-surface-elevated',
            'border-border-strong',
            'rounded-sm',
            'px-2.5',
            'py-1.5',
            'text-caption',
            'text-foreground',
            'shadow-lift',
        );
    });

    it('enters over the hover duration token, not a bare duration-hover class', async () => {
        const user = userEvent.setup();
        const trigger = renderTooltip();

        await user.hover(trigger);
        await waitFor(() => {
            expect(screen.getByRole('tooltip')).toBeInTheDocument();
        });

        const content = document.querySelector('[data-slot="tooltip-content"]');

        expect(content?.className).toMatch(
            /duration-\[var\(--duration-hover\)\]/,
        );
        expect(content?.className).not.toMatch(
            /(?<![-\w])duration-hover(?!\w)/,
        );
    });
});
