// utils/dropzone.ts — Dropzone.js initializer, extracted from RsvpCard script
// dropzone@6 beta has no bundled types — define the minimal interface we need locally.
interface DropzoneFile extends File {
  status: string;
  accepted: boolean;
  previewElement: HTMLElement;
  xhr?: XMLHttpRequest;
}

export interface DropzoneConfig {
  /** The element ID to attach dropzone to */
  elementId: string;
  /** Upload endpoint URL */
  url: string;
  /** Extra params to include with each upload */
  params?: Record<string, string>;
  /** Called after a file is successfully uploaded */
  onSuccess?: (file: DropzoneFile, response: unknown) => void;
  /** Called after a file is removed */
  onRemoved?: (file: DropzoneFile) => void;
  /** Max file size in MB */
  maxFileSizeMB?: number;
  /** Accepted MIME types */
  acceptedFiles?: string;
}

export function initDropzone(config: DropzoneConfig): unknown {
  const el = document.getElementById(config.elementId);
  if (!el) return null;

  // Dynamically import to keep it out of the critical path
  return new (window as any).Dropzone(el, {
    url:            config.url,
    params:         config.params ?? {},
    maxFilesize:    config.maxFileSizeMB ?? 10,
    acceptedFiles:  config.acceptedFiles ?? 'image/*',
    addRemoveLinks: true,
    dictDefaultMessage: 'Drop photos here or click to upload',
    init() {
      if (config.onSuccess) {
        this.on('success', config.onSuccess);
      }
      if (config.onRemoved) {
        this.on('removedfile', config.onRemoved);
      }
    },
  });
}
