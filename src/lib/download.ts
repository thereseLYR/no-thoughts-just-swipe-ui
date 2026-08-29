import type { GeneratedFile } from './engine/generators';

/**
 * Browser-only I/O layer. The engine returns file descriptors; this writes them.
 *
 * JSZip is loaded on demand — it is ~100 kB and only matters at the moment
 * someone actually clicks download.
 */
export async function downloadZip(files: GeneratedFile[], name = 'design-system') {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  for (const f of files) zip.file(f.path, f.contents);
  const blob = await zip.generateAsync({ type: 'blob' });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
