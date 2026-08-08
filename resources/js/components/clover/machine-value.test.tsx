import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MachineValue } from '@/components/clover/machine-value';

/**
 * The design prototype sets machine values in a monospace face. Clover ships
 * no mono font, so this component carries that role instead: Inter with
 * tabular figures, which keeps digits column-aligned without a third typeface.
 */
describe('MachineValue', () => {
    it('renders its content', () => {
        render(<MachineValue>&gt;&gt;58210441</MachineValue>);

        expect(screen.getByText('>>58210441')).toBeInTheDocument();
    });

    it('locks digit width so counts do not reflow as they change', () => {
        render(<MachineValue>2,412</MachineValue>);

        expect(screen.getByText('2,412')).toHaveClass('tabular-nums');
    });

    it('never falls back to a mono font, which the project does not ship', () => {
        render(<MachineValue>4.1 MB</MachineValue>);

        expect(screen.getByText('4.1 MB').className).not.toMatch(/font-mono/);
    });

    it('merges a caller className over its defaults', () => {
        render(<MachineValue className="text-primary">/g/</MachineValue>);

        expect(screen.getByText('/g/')).toHaveClass('text-primary');
    });
});
