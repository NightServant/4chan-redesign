import { CircleAlert } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import { cloneElement, useId } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * The accessibility wiring FormField hands to whatever control it wraps.
 */
export type FormFieldControl = {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': true | undefined;
};

/**
 * The subset of a control's props FormField reads and writes. Kept
 * permissive so any native or Radix control satisfies it.
 */
type WirableControlProps = {
    id?: string;
    'aria-describedby'?: string;
    'aria-invalid'?: boolean | 'true' | 'false' | 'grammar' | 'spelling';
};

export interface FormFieldProps {
    /** Visible label. Always rendered, never a placeholder substitute. */
    label: ReactNode;
    /**
     * The control. Either an element, which is cloned with the wiring
     * applied, or a render function that receives the wiring directly.
     */
    children:
        | ReactElement<WirableControlProps>
        | ((control: FormFieldControl) => ReactNode);
    /** Standing guidance. Announced through `aria-describedby`. */
    description?: ReactNode;
    /** Validation failure. Marks the control invalid and is announced. */
    error?: ReactNode;
    /** Explicit control id. One is generated when omitted. */
    id?: string;
    className?: string;
    labelClassName?: string;
}

function joinIds(ids: (string | undefined)[]): string | undefined {
    const present = ids.filter((id): id is string => Boolean(id));

    return present.length > 0 ? present.join(' ') : undefined;
}

/**
 * Label, control, description, and error message, wired together.
 *
 * The whole point is the association: the label points at the control, the
 * description and error are announced through `aria-describedby`, and an
 * error marks the control `aria-invalid` and is delivered through an alert
 * region so a screen reader hears it when it appears.
 */
export function FormField({
    label,
    children,
    description,
    error,
    id,
    className,
    labelClassName,
}: FormFieldProps) {
    const generatedId = useId();
    const isRenderFunction = typeof children === 'function';
    const ownId = isRenderFunction ? undefined : children.props.id;
    const controlId = id ?? ownId ?? `${generatedId}field`;

    const ownDescribedBy = isRenderFunction
        ? undefined
        : children.props['aria-describedby'];
    const descriptionId = description ? `${controlId}-description` : undefined;
    const errorId = error ? `${controlId}-error` : undefined;

    const control: FormFieldControl = {
        id: controlId,
        'aria-describedby': joinIds([ownDescribedBy, descriptionId, errorId]),
        'aria-invalid': error ? true : undefined,
    };

    return (
        <div className={cn('flex flex-col gap-1.5', className)}>
            <Label
                htmlFor={controlId}
                className={cn(
                    'text-body-sm font-medium text-foreground',
                    labelClassName,
                )}
            >
                {label}
            </Label>

            {isRenderFunction
                ? children(control)
                : cloneElement(children, control)}

            {description ? (
                <p
                    id={descriptionId}
                    className="text-meta text-muted-foreground"
                >
                    {description}
                </p>
            ) : null}

            {error ? (
                <p
                    id={errorId}
                    role="alert"
                    className="flex items-start gap-1.5 text-meta text-danger"
                >
                    <CircleAlert
                        aria-hidden="true"
                        className="mt-px size-3.5 shrink-0"
                    />
                    {error}
                </p>
            ) : null}
        </div>
    );
}
