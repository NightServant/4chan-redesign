import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Panel } from '@/components/clover/panel';

describe('Panel', () => {
    it('renders its title through SectionLabel', () => {
        render(<Panel title="Trending">Content</Panel>);

        const label = screen.getByText('Trending');

        expect(label).toHaveClass('uppercase');
    });

    it('renders its children', () => {
        render(
            <Panel title="Trending">
                <p>Wallpaper thread hit 900 blessings.</p>
            </Panel>,
        );

        expect(
            screen.getByText('Wallpaper thread hit 900 blessings.'),
        ).toBeInTheDocument();
    });

    it('renders an action alongside the title when given one', () => {
        render(
            <Panel
                title="Notifications"
                action={<button type="button">See all</button>}
            >
                Content
            </Panel>,
        );

        expect(
            screen.getByRole('button', { name: 'See all' }),
        ).toBeInTheDocument();
    });

    it('is a real section landmark named by its title', () => {
        render(<Panel title="Recent activity">Content</Panel>);

        expect(
            screen.getByRole('region', { name: 'Recent activity' }),
        ).toBeInTheDocument();
    });

    it('renders the region as an actual section element, not a div standing in for one', () => {
        render(<Panel title="Recent activity">Content</Panel>);

        const region = screen.getByRole('region', { name: 'Recent activity' });

        expect(region.tagName).toBe('SECTION');
    });

    it('forwards standard section props such as id', () => {
        render(
            <Panel title="Recent activity" id="activity-panel">
                Content
            </Panel>,
        );

        expect(
            screen.getByRole('region', { name: 'Recent activity' }),
        ).toHaveAttribute('id', 'activity-panel');
    });
});
