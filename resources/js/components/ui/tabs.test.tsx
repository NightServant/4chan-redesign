import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function renderTabs(defaultValue = 'overview') {
    return render(
        <Tabs defaultValue={defaultValue}>
            <TabsList aria-label="Board sections">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="rules">Rules</TabsTrigger>
                <TabsTrigger value="stats" disabled>
                    Stats
                </TabsTrigger>
            </TabsList>
            <TabsContent value="overview">Overview panel</TabsContent>
            <TabsContent value="rules">Rules panel</TabsContent>
            <TabsContent value="stats">Stats panel</TabsContent>
        </Tabs>,
    );
}

describe('Tabs', () => {
    it('exposes the tablist and tab roles with the correct accessible names', () => {
        renderTabs();

        expect(
            screen.getByRole('tablist', { name: 'Board sections' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('tab', { name: 'Overview' }),
        ).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Rules' })).toBeInTheDocument();
    });

    it('shows only the active panel', () => {
        renderTabs();

        expect(screen.getByRole('tabpanel')).toHaveTextContent(
            'Overview panel',
        );
        expect(screen.queryByText('Rules panel')).not.toBeInTheDocument();
    });

    it('marks the active trigger with more than colour: an underline that survives greyscale', () => {
        renderTabs();

        const active = screen.getByRole('tab', { name: 'Overview' });
        const inactive = screen.getByRole('tab', { name: 'Rules' });

        expect(active).toHaveAttribute('aria-selected', 'true');
        expect(active.className).toMatch(
            /data-\[state=active\]:border-primary/,
        );
        expect(active.className).toMatch(
            /data-\[state=active\]:text-foreground/,
        );
        expect(inactive).toHaveAttribute('aria-selected', 'false');
        expect(inactive.className).toMatch(/text-muted-foreground/);
    });

    it('moves focus and activates the next tab on ArrowRight', async () => {
        const user = userEvent.setup();
        renderTabs();

        const overview = screen.getByRole('tab', { name: 'Overview' });
        const rules = screen.getByRole('tab', { name: 'Rules' });

        overview.focus();
        expect(overview).toHaveFocus();

        await user.keyboard('{ArrowRight}');

        expect(rules).toHaveFocus();
        expect(rules).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tabpanel')).toHaveTextContent('Rules panel');
    });

    it('moves focus back to the previous tab on ArrowLeft', async () => {
        const user = userEvent.setup();
        renderTabs();

        const overview = screen.getByRole('tab', { name: 'Overview' });
        overview.focus();

        await user.keyboard('{ArrowLeft}');

        expect(screen.getByRole('tab', { name: 'Rules' })).toHaveFocus();
    });

    it('skips the disabled tab during roving-tabindex navigation', () => {
        renderTabs();

        const stats = screen.getByRole('tab', { name: 'Stats' });

        expect(stats).toBeDisabled();
        expect(stats).toHaveAttribute('tabindex', '-1');
    });

    it('makes the active trigger the tab stop once the tablist receives focus', async () => {
        const user = userEvent.setup();
        renderTabs();

        await user.tab();

        const overview = screen.getByRole('tab', { name: 'Overview' });
        const rules = screen.getByRole('tab', { name: 'Rules' });

        expect(overview).toHaveFocus();
        expect(overview).toHaveAttribute('tabindex', '0');
        expect(rules).toHaveAttribute('tabindex', '-1');
    });
});
