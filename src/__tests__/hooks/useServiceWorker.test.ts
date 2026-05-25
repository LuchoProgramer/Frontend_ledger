/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import { useServiceWorker } from '../../hooks/useServiceWorker';

const mockRegister = jest.fn();
const mockPostMessage = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  // navigator.serviceWorker does not exist in jsdom — define it manually
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      register: mockRegister,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      controller: { state: 'activated' },
    },
    configurable: true,
    writable: true,
  });
});

describe('useServiceWorker', () => {
  it('registra /sw.js al montar', async () => {
    mockRegister.mockResolvedValue({ addEventListener: jest.fn() });

    renderHook(() => useServiceWorker());
    await act(async () => {});

    expect(mockRegister).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('updateSW llama postMessage SKIP_WAITING en el SW en waiting', async () => {
    const mockRegistration = {
      addEventListener: jest.fn(),
      waiting: { postMessage: mockPostMessage },
    };
    mockRegister.mockResolvedValue(mockRegistration);

    const { result } = renderHook(() => useServiceWorker());
    await act(async () => {});

    act(() => {
      result.current.updateSW();
    });

    expect(mockPostMessage).toHaveBeenCalledWith({ type: 'SKIP_WAITING' });
  });

  it('needsRefresh arranca en false', async () => {
    mockRegister.mockResolvedValue({ addEventListener: jest.fn() });

    const { result } = renderHook(() => useServiceWorker());
    await act(async () => {});

    expect(result.current.needsRefresh).toBe(false);
  });
});
