import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormField } from '@/components/clover/form-field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

describe('FormField', () => {
    it('associates the label with the control it wraps', () => {
        render(
            <FormField label="Email address">
                <Input type="email" />
            </FormField>,
        );

        const control = screen.getByLabelText('Email address');

        expect(control).toHaveAttribute('type', 'email');
        expect(control.id).not.toBe('');
    });

    it('generates a unique id per field when none is supplied', () => {
        render(
            <>
                <FormField label="Subject">
                    <Input />
                </FormField>
                <FormField label="Comment">
                    <Textarea />
                </FormField>
            </>,
        );

        const subject = screen.getByLabelText('Subject');
        const comment = screen.getByLabelText('Comment');

        expect(subject.id).not.toBe('');
        expect(comment.id).not.toBe('');
        expect(subject.id).not.toBe(comment.id);
    });

    it('honours an explicit id', () => {
        render(
            <FormField id="board-slug" label="Board slug">
                <Input />
            </FormField>,
        );

        const control = screen.getByLabelText('Board slug');

        expect(control).toHaveAttribute('id', 'board-slug');
    });

    it('does not overwrite an id the control already carries', () => {
        render(
            <FormField label="Board slug">
                <Input id="own-id" />
            </FormField>,
        );

        const control = screen.getByLabelText('Board slug');

        expect(control).toHaveAttribute('id', 'own-id');
    });

    it('links a description to the control via aria-describedby', () => {
        render(
            <FormField
                label="Board slug"
                description="Lowercase letters only, between one and four characters."
            >
                <Input />
            </FormField>,
        );

        const control = screen.getByLabelText('Board slug');
        const describedBy = control.getAttribute('aria-describedby');

        expect(describedBy).not.toBeNull();

        const description = document.getElementById(describedBy as string);

        expect(description).toHaveTextContent(
            'Lowercase letters only, between one and four characters.',
        );
    });

    it('marks the control invalid and announces the error when one is present', () => {
        render(
            <FormField label="Board slug" error="That slug is already taken.">
                <Input />
            </FormField>,
        );

        const control = screen.getByLabelText('Board slug');

        expect(control).toHaveAttribute('aria-invalid', 'true');

        const alert = screen.getByRole('alert');

        expect(alert).toHaveTextContent('That slug is already taken.');
        expect(control.getAttribute('aria-describedby')).toContain(alert.id);
    });

    it('describes the control by both the description and the error', () => {
        render(
            <FormField
                label="Board slug"
                description="Lowercase letters only."
                error="That slug is already taken."
            >
                <Input />
            </FormField>,
        );

        const control = screen.getByLabelText('Board slug');
        const ids = (control.getAttribute('aria-describedby') ?? '').split(' ');

        expect(ids).toHaveLength(2);

        const texts = ids.map(
            (id) => document.getElementById(id)?.textContent ?? '',
        );

        expect(texts).toContain('Lowercase letters only.');
        expect(texts).toContain('That slug is already taken.');
    });

    it('leaves the control valid and undescribed when there is nothing to say', () => {
        render(
            <FormField label="Board slug">
                <Input />
            </FormField>,
        );

        const control = screen.getByLabelText('Board slug');

        expect(control).not.toHaveAttribute('aria-invalid');
        expect(control).not.toHaveAttribute('aria-describedby');
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('preserves an aria-describedby the control already carries', () => {
        render(
            <FormField label="Board slug" error="That slug is already taken.">
                <Input aria-describedby="external-hint" />
            </FormField>,
        );

        const control = screen.getByLabelText('Board slug');
        const ids = (control.getAttribute('aria-describedby') ?? '').split(' ');

        expect(ids).toContain('external-hint');
        expect(ids).toContain(screen.getByRole('alert').id);
    });

    it('hands the wiring to a render function when given one', () => {
        render(
            <FormField
                label="Comment"
                description="Markdown is not supported."
                error="Comment is required."
            >
                {(control) => <textarea {...control} />}
            </FormField>,
        );

        const control = screen.getByLabelText('Comment');

        expect(control.tagName).toBe('TEXTAREA');
        expect(control).toHaveAttribute('aria-invalid', 'true');
        expect(control.getAttribute('aria-describedby')).toContain(
            screen.getByRole('alert').id,
        );
    });

    it('renders the error in the danger token and the description in muted text', () => {
        render(
            <FormField
                label="Board slug"
                description="Lowercase letters only."
                error="That slug is already taken."
            >
                <Input />
            </FormField>,
        );

        expect(screen.getByRole('alert')).toHaveClass('text-danger');
        expect(screen.getByText('Lowercase letters only.')).toHaveClass(
            'text-muted-foreground',
        );
    });
});
