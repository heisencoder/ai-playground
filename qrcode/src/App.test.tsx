import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { generatePngDataUrl } from './qr';

vi.mock('./qr', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./qr')>();
  return {
    ...actual,
    generateSvg: vi.fn(async () => '<svg role="img" aria-label="qr"></svg>'),
    generatePngDataUrl: vi.fn(
      async () => 'data:image/png;base64,iVBORw0KGgo=',
    ),
  };
});

describe('App', () => {
  beforeEach(() => {
    // Keep each test's assertions about generator calls independent.
    vi.clearAllMocks();
  });

  it('renders the heading and the text input', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /qr code generator/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/text or url/i)).toBeInTheDocument();
  });

  it('shows the placeholder hint and no QR when input is empty', () => {
    render(<App />);
    expect(
      screen.getByText(/start typing to generate a qr code/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows a PNG image after typing a valid URL (strict mode)', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/text or url/i), 'https://example.com');

    const img = await screen.findByRole('img');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,iVBORw0KGgo=');
  });

  it('shows a validation error and no QR for an invalid URL in strict mode', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/text or url/i), 'hello world');

    expect(await screen.findByText(/enter a valid url/i)).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('allows free-form text to produce a QR and clears the error', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/text or url/i), 'hello world');
    expect(await screen.findByText(/enter a valid url/i)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/allow free-form text/i));

    expect(await screen.findByRole('img')).toBeInTheDocument();
    expect(screen.queryByText(/enter a valid url/i)).not.toBeInTheDocument();
  });

  it('renders inline SVG when switching the format to SVG', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/text or url/i), 'https://example.com');
    await screen.findByRole('img');

    await user.click(screen.getByRole('radio', { name: /svg/i }));

    // The SVG is rendered inline; wait for the container to receive it.
    const svgContainer = await screen.findByLabelText(/generated qr code/i);
    expect(svgContainer.querySelector('svg')).toBeTruthy();
  });

  it('regenerates with the selected pixel size', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(
      screen.getByLabelText(/text or url/i),
      'https://example.com',
    );
    await screen.findByRole('img');

    await user.selectOptions(screen.getByLabelText(/size/i), '512');

    await waitFor(() =>
      expect(vi.mocked(generatePngDataUrl)).toHaveBeenLastCalledWith(
        'https://example.com',
        expect.objectContaining({ width: 512 }),
      ),
    );
  });

  it('provides a Download control with the PNG filename', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByLabelText(/text or url/i), 'https://example.com');
    await screen.findByRole('img');

    const download = screen.getByRole('link', { name: /download png/i });
    expect(download).toHaveAttribute('download', 'qrcode.png');
  });

  it('provides an SVG download link backed by an object URL', async () => {
    // jsdom has no URL.createObjectURL; stand one in so the SVG download
    // branch can build (and later revoke) a blob URL.
    const original = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
    try {
      const user = userEvent.setup();
      render(<App />);
      await user.type(
        screen.getByLabelText(/text or url/i),
        'https://example.com',
      );
      await user.click(screen.getByRole('radio', { name: /svg/i }));

      const download = await screen.findByRole('link', {
        name: /download svg/i,
      });
      expect(download).toHaveAttribute('download', 'qrcode.svg');
      expect(download).toHaveAttribute('href', 'blob:mock-url');
    } finally {
      URL.createObjectURL = original;
      URL.revokeObjectURL = originalRevoke;
    }
  });
});
