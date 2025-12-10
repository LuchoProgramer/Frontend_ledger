
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value);
}

export function classNames(...classes: (string | undefined | null | false)[]) {
    return classes.filter(Boolean).join(' ');
}
