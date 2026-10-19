import QRCode from 'qrcode';

export type OutputFormat = 'png' | 'svg';

export interface QrOptions {
  width: number; // rendered pixel size
  margin?: number; // quiet zone, default 2
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'; // default 'M'
}

export interface ValidationResult {
  valid: boolean;
  message?: string; // shown to the user when invalid
}

const INVALID_URL_MESSAGE =
  'Enter a valid URL (including http:// or https://), or turn on free-form text.';

// http/https only; uses the URL constructor.
export function isValidUrl(text: string): boolean {
  try {
    const url = new URL(text);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// allowFreeform=false (default mode): require a valid URL.
// allowFreeform=true: any non-empty text is valid.
// Empty/whitespace-only input: { valid: false } with NO message.
export function validateInput(
  text: string,
  allowFreeform: boolean,
): ValidationResult {
  const trimmed = text.trim();
  if (trimmed === '') {
    return { valid: false };
  }
  if (allowFreeform) {
    return { valid: true };
  }
  if (isValidUrl(trimmed)) {
    return { valid: true };
  }
  return { valid: false, message: INVALID_URL_MESSAGE };
}

export function generateSvg(text: string, opts: QrOptions): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    width: opts.width,
    margin: opts.margin ?? 2,
    errorCorrectionLevel: opts.errorCorrectionLevel ?? 'M',
  });
}

export function generatePngDataUrl(
  text: string,
  opts: QrOptions,
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: opts.width,
    margin: opts.margin ?? 2,
    errorCorrectionLevel: opts.errorCorrectionLevel ?? 'M',
  });
}

// 'qrcode.png' or 'qrcode.svg'
export function buildFilename(format: OutputFormat): string {
  return `qrcode.${format}`;
}
