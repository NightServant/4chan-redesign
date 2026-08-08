import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { VoteControl } from '@/components/clover/vote-control';

describe('VoteControl', () => {
    it('renders the count through MachineValue with tabular figures', () => {
        render(<VoteControl count={2412} />);

        const count = screen.getByText('2412');

        expect(count).toHaveClass('tabular-nums');
    });

    it('names the controls with the real vocabulary, never "upvote"', () => {
        render(<VoteControl count={0} />);

        expect(
            screen.getByRole('button', { name: 'Bless this post' }),
        ).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'Curse this post' }),
        ).toBeInTheDocument();
        expect(
            screen.queryByRole('button', { name: /upvote/i }),
        ).not.toBeInTheDocument();
    });

    it('reports unpressed on both buttons when there is no vote', () => {
        render(<VoteControl count={0} state={null} />);

        expect(
            screen.getByRole('button', { name: 'Bless this post' }),
        ).toHaveAttribute('aria-pressed', 'false');
        expect(
            screen.getByRole('button', { name: 'Curse this post' }),
        ).toHaveAttribute('aria-pressed', 'false');
    });

    it('marks the bless button pressed and fills its icon when blessed, without a large fill background', () => {
        render(<VoteControl count={5} state="blessed" />);

        const bless = screen.getByRole('button', { name: 'Bless this post' });
        const curse = screen.getByRole('button', { name: 'Curse this post' });

        expect(bless).toHaveAttribute('aria-pressed', 'true');
        expect(bless).toHaveClass('text-primary');
        expect(bless).not.toHaveClass('bg-primary');
        expect(bless.querySelector('svg')).toHaveClass('fill-current');
        expect(curse).toHaveAttribute('aria-pressed', 'false');
        expect(curse.querySelector('svg')).not.toHaveClass('fill-current');
    });

    it('marks the curse button pressed and fills its icon when cursed, without a large fill background', () => {
        render(<VoteControl count={5} state="cursed" />);

        const bless = screen.getByRole('button', { name: 'Bless this post' });
        const curse = screen.getByRole('button', { name: 'Curse this post' });

        expect(curse).toHaveAttribute('aria-pressed', 'true');
        expect(curse).toHaveClass('text-danger');
        expect(curse).not.toHaveClass('bg-danger');
        expect(curse.querySelector('svg')).toHaveClass('fill-current');
        expect(bless).toHaveAttribute('aria-pressed', 'false');
        expect(bless.querySelector('svg')).not.toHaveClass('fill-current');
    });

    it('calls onBless when the bless button is pressed', async () => {
        const onBless = vi.fn();

        render(<VoteControl count={0} onBless={onBless} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Bless this post' }),
        );

        expect(onBless).toHaveBeenCalledTimes(1);
    });

    it('calls onCurse when the curse button is pressed', async () => {
        const onCurse = vi.fn();

        render(<VoteControl count={0} onCurse={onCurse} />);

        await userEvent.click(
            screen.getByRole('button', { name: 'Curse this post' }),
        );

        expect(onCurse).toHaveBeenCalledTimes(1);
    });

    it('only transitions colour, giving press feedback through transform alone', () => {
        render(<VoteControl count={0} />);

        const bless = screen.getByRole('button', { name: 'Bless this post' });

        expect(bless).toHaveClass('active:scale-[0.98]');
        expect(bless.className).toMatch(/transition-colors/);
    });

    it('shrinks the hit area at the sm size without changing the layout properties animated', () => {
        const { rerender } = render(<VoteControl count={0} size="sm" />);
        const small = screen.getByRole('button', { name: 'Bless this post' });
        const smallClass = small.className;

        rerender(<VoteControl count={0} size="md" />);
        const medium = screen.getByRole('button', { name: 'Bless this post' });

        expect(smallClass).not.toEqual(medium.className);
    });
});
