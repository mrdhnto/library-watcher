const iconMap: Record<string, string> = {
  jpg: 'i-lucide-image', jpeg: 'i-lucide-image', png: 'i-lucide-image', gif: 'i-lucide-image',
  webp: 'i-lucide-image', svg: 'i-lucide-image', bmp: 'i-lucide-image', ico: 'i-lucide-image',
  psd: 'i-lucide-palette', ai: 'i-lucide-palette', xcf: 'i-lucide-palette', kra: 'i-lucide-palette',
  pdf: 'i-lucide-file-text', doc: 'i-lucide-file-text', docx: 'i-lucide-file-text',
  txt: 'i-lucide-file-text', rtf: 'i-lucide-file-text', md: 'i-lucide-file-text',
  mp4: 'i-lucide-video', mov: 'i-lucide-video', avi: 'i-lucide-video', mkv: 'i-lucide-video',
  webm: 'i-lucide-video', m4v: 'i-lucide-video',
  mp3: 'i-lucide-music', wav: 'i-lucide-music', flac: 'i-lucide-music',
  aac: 'i-lucide-music', ogg: 'i-lucide-music', m4a: 'i-lucide-music',
  zip: 'i-lucide-archive', rar: 'i-lucide-archive', '7z': 'i-lucide-archive',
  tar: 'i-lucide-archive', gz: 'i-lucide-archive',
  exe: 'i-lucide-terminal', dll: 'i-lucide-terminal', sh: 'i-lucide-terminal',
  bat: 'i-lucide-terminal', ps1: 'i-lucide-terminal',
  js: 'i-lucide-file-code', ts: 'i-lucide-file-code', jsx: 'i-lucide-file-code',
  tsx: 'i-lucide-file-code', py: 'i-lucide-file-code', java: 'i-lucide-file-code',
  c: 'i-lucide-file-code', cpp: 'i-lucide-file-code', cs: 'i-lucide-file-code',
  go: 'i-lucide-file-code', rs: 'i-lucide-file-code', rb: 'i-lucide-file-code',
  php: 'i-lucide-file-code', swift: 'i-lucide-file-code', kt: 'i-lucide-file-code',
  html: 'i-lucide-file-code', css: 'i-lucide-file-code', scss: 'i-lucide-file-code',
  json: 'i-lucide-file-code', xml: 'i-lucide-file-code', yaml: 'i-lucide-file-code',
  yml: 'i-lucide-file-code', toml: 'i-lucide-file-code',
  blend: 'i-lucide-cube-3d', fbx: 'i-lucide-cube-3d', obj: 'i-lucide-cube-3d',
  glb: 'i-lucide-cube-3d', gltf: 'i-lucide-cube-3d', ma: 'i-lucide-cube-3d',
  mb: 'i-lucide-cube-3d', max: 'i-lucide-cube-3d', c4d: 'i-lucide-cube-3d',
  db: 'i-lucide-database', sqlite: 'i-lucide-database', sql: 'i-lucide-database',
  csv: 'i-lucide-table', xls: 'i-lucide-table', xlsx: 'i-lucide-table',
  ppt: 'i-lucide-presentation', pptx: 'i-lucide-presentation',
  iso: 'i-lucide-disc', img: 'i-lucide-disc',
  ttf: 'i-lucide-text-cursor', otf: 'i-lucide-text-cursor', woff: 'i-lucide-text-cursor',
  log: 'i-lucide-scroll-text', tmp: 'i-lucide-clock'
}

export const fileTypeIcon = (filename: string): string => {
  const ext = filename.split('.').pop()?.toLowerCase()
  return (ext && iconMap[ext]) || 'i-lucide-file'
}