/** @jest-environment jsdom */
import React from 'react';
import { render, screen } from '@testing-library/react';
import GlobalError from '@/app/global-error';

describe('GlobalError', () => {
  it('renderiza el fallback con botón Recargar ante un error normal', () => {
    render(<GlobalError error={new Error('boom')} reset={() => {}} />);
    expect(screen.getByRole('button', { name: /recargar/i })).toBeTruthy();
  });
});
