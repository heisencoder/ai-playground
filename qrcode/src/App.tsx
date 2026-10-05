import { useEffect, useState } from 'react';
import {
  buildFilename,
  generatePngDataUrl,
  generateSvg,
  validateInput,
  type OutputFormat,
} from './qr';
import './App.css';

const SIZES = [128, 256, 512, 1024] as const;

const GENERATION_ERROR =
  'Could not generate a QR code — the text may be too long.';

function App() {
  const [text, setText] = useState('');
  const [allowFreeform, setAllowFreeform] = useState(false);
  const [format, setFormat] = useState<OutputFormat>('png');
  const [size, setSize] = useState<number>(256);

  // The generated artifact for the current inputs.
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [svgObjectUrl, setSvgObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validation = validateInput(text, allowFreeform);
  // Encode the trimmed value so stray surrounding whitespace (common when
  // pasting a URL) never ends up baked into the QR code.
  const trimmedText = text.trim();
  const isEmpty = trimmedText === '';

  useEffect(() => {
    // Nothing valid to render — clear any previous output/error.
    if (!validation.valid) {
      setPngDataUrl(null);
      setSvgMarkup(null);
      setError(validation.message ?? null);
      return;
    }

    let active = true;
    setError(null);

    const run = async () => {
      try {
        if (format === 'png') {
          const dataUrl = await generatePngDataUrl(trimmedText, { width: size });
          if (!active) return;
          setPngDataUrl(dataUrl);
          setSvgMarkup(null);
        } else {
          const svg = await generateSvg(trimmedText, { width: size });
          if (!active) return;
          setSvgMarkup(svg);
          setPngDataUrl(null);
        }
      } catch {
        if (!active) return;
        setError(GENERATION_ERROR);
        setPngDataUrl(null);
        setSvgMarkup(null);
      }
    };

    void run();

    return () => {
      active = false;
    };
    // trimmedText + validation.valid / .message are all derived from
    // text + allowFreeform.
  }, [
    trimmedText,
    allowFreeform,
    format,
    size,
    validation.valid,
    validation.message,
  ]);

  // Wrap the current SVG markup in an object URL for downloading, and
  // revoke the previous one so we don't leak. Guard against environments
  // (e.g. jsdom in tests) that lack URL.createObjectURL.
  useEffect(() => {
    if (!svgMarkup || typeof URL.createObjectURL !== 'function') {
      setSvgObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(
      new Blob([svgMarkup], { type: 'image/svg+xml' }),
    );
    setSvgObjectUrl(url);
    return () => {
      if (typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(url);
      }
    };
  }, [svgMarkup]);

  const hasQr =
    !error &&
    validation.valid &&
    ((format === 'png' && pngDataUrl) || (format === 'svg' && svgMarkup));

  const downloadHref =
    format === 'png' ? (pngDataUrl ?? undefined) : (svgObjectUrl ?? undefined);

  return (
    <main className="app">
      <header className="app-header">
        <h1>QR Code Generator</h1>
        <p className="lede">
          Turn any URL or text into a QR code as you type, then download it
          as PNG or SVG.
        </p>
      </header>

      <section className="card">
        <div className="field">
          <label htmlFor="qr-text">Text or URL</label>
          <textarea
            id="qr-text"
            className="text-input"
            rows={3}
            placeholder="https://example.com"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
        </div>

        <div className="options">
          <div className="option option-checkbox">
            <input
              id="qr-freeform"
              type="checkbox"
              checked={allowFreeform}
              onChange={(e) => setAllowFreeform(e.target.checked)}
            />
            <label htmlFor="qr-freeform">
              Allow free-form text (don&rsquo;t require a valid URL)
            </label>
          </div>

          <fieldset className="option option-format">
            <legend>Format</legend>
            <label>
              <input
                type="radio"
                name="format"
                value="png"
                checked={format === 'png'}
                onChange={() => setFormat('png')}
              />
              PNG
            </label>
            <label>
              <input
                type="radio"
                name="format"
                value="svg"
                checked={format === 'svg'}
                onChange={() => setFormat('svg')}
              />
              SVG
            </label>
          </fieldset>

          <div className="option option-size">
            <label htmlFor="qr-size">Size</label>
            <select
              id="qr-size"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} px
                </option>
              ))}
            </select>
            <p className="hint">
              The QR version auto-fits the data — the smallest that fits is
              chosen automatically.
            </p>
          </div>
        </div>
      </section>

      <section className="preview" aria-label="QR code preview">
        <div className="status" aria-live="polite">
          {error && <p className="error">{error}</p>}
        </div>

        {isEmpty && !error && (
          <p className="placeholder">Start typing to generate a QR code.</p>
        )}

        {hasQr && format === 'png' && pngDataUrl && (
          <img
            className="qr-image"
            src={pngDataUrl}
            alt="Generated QR code"
            width={size}
            height={size}
            style={{ maxWidth: '100%' }}
          />
        )}

        {hasQr && format === 'svg' && svgMarkup && (
          <div
            className="qr-svg"
            role="img"
            aria-label="Generated QR code"
            style={{ width: size, maxWidth: '100%' }}
            dangerouslySetInnerHTML={{ __html: svgMarkup }}
          />
        )}

        {hasQr && (
          <a
            className="download-btn"
            href={downloadHref}
            download={buildFilename(format)}
          >
            Download {format.toUpperCase()}
          </a>
        )}
      </section>
    </main>
  );
}

export default App;
