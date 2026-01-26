export const CATEGORIES = {
  all: {
    name: "All Files",
    icon: "Files",
    color: "text-dark-300",
  },
  video: {
    name: "Video",
    icon: "Video",
    color: "text-red-500",
    formats: ["mp4", "webm", "mov", "avi", "mkv", "gif", "wmv", "flv", "mpeg", "3gp", "ogv"],
  },
  audio: {
    name: "Audio",
    icon: "Music",
    color: "text-amber-500",
    formats: ["mp3", "wav", "flac", "aac", "ogg", "wma", "m4a", "aiff", "opus"],
  },
  image: {
    name: "Image",
    icon: "Image",
    color: "text-green-500",
    formats: ["png", "jpg", "jpeg", "webp", "avif", "gif", "bmp", "tiff", "ico", "svg", "heic", "raw", "cr2", "nef", "arw"],
  },
  document: {
    name: "Document",
    icon: "FileText",
    color: "text-blue-500",
    formats: ["pdf", "docx", "doc", "txt", "rtf", "odt", "html", "md", "epub", "mobi"],
  },
  spreadsheet: {
    name: "Spreadsheet",
    icon: "Table",
    color: "text-emerald-500",
    formats: ["xlsx", "xls", "csv", "ods", "tsv"],
  },
  presentation: {
    name: "Presentation",
    icon: "Presentation",
    color: "text-orange-500",
    formats: ["pptx", "ppt", "odp", "pdf"],
  },
  ebook: {
    name: "Ebook",
    icon: "BookOpen",
    color: "text-violet-500",
    formats: ["epub", "mobi", "azw3", "pdf", "fb2"],
  },
  archive: {
    name: "Archive",
    icon: "Archive",
    color: "text-gray-500",
    formats: ["zip", "7z", "rar", "tar", "gz", "bz2", "xz", "tgz", "tbz2"],
  },
  vector: {
    name: "Vector",
    icon: "PenTool",
    color: "text-pink-500",
    formats: ["svg", "eps", "pdf", "ai", "dxf"],
  },
  font: {
    name: "Font",
    icon: "Type",
    color: "text-teal-500",
    formats: ["ttf", "otf", "woff", "woff2", "eot"],
  },
};

export const FORMAT_CONVERSIONS: Record<string, string[]> = {
  // Video
  mp4: ["webm", "mov", "avi", "mkv", "gif", "wmv", "flv", "mpeg", "3gp", "ogv"],
  webm: ["mp4", "mov", "avi", "mkv", "gif", "wmv", "flv", "mpeg", "3gp", "ogv"],
  mov: ["mp4", "webm", "avi", "mkv", "gif", "wmv", "flv", "mpeg", "3gp", "ogv"],
  avi: ["mp4", "webm", "mov", "mkv", "gif", "wmv", "flv", "mpeg", "3gp", "ogv"],
  mkv: ["mp4", "webm", "mov", "avi", "gif", "wmv", "flv", "mpeg", "3gp", "ogv"],
  wmv: ["mp4", "webm", "mov", "avi", "mkv", "gif", "flv", "mpeg", "3gp", "ogv"],
  flv: ["mp4", "webm", "mov", "avi", "mkv", "gif", "wmv", "mpeg", "3gp", "ogv"],
  mpeg: ["mp4", "webm", "mov", "avi", "mkv", "gif", "wmv", "flv", "3gp", "ogv"],
  "3gp": ["mp4", "webm", "mov", "avi", "mkv", "gif", "wmv", "flv", "mpeg", "ogv"],
  ogv: ["mp4", "webm", "mov", "avi", "mkv", "gif", "wmv", "flv", "mpeg", "3gp"],

  // Audio
  mp3: ["wav", "flac", "aac", "ogg", "wma", "m4a", "aiff", "opus"],
  wav: ["mp3", "flac", "aac", "ogg", "wma", "m4a", "aiff", "opus"],
  flac: ["mp3", "wav", "aac", "ogg", "wma", "m4a", "aiff", "opus"],
  aac: ["mp3", "wav", "flac", "ogg", "wma", "m4a", "aiff", "opus"],
  ogg: ["mp3", "wav", "flac", "aac", "wma", "m4a", "aiff", "opus"],
  wma: ["mp3", "wav", "flac", "aac", "ogg", "m4a", "aiff", "opus"],
  m4a: ["mp3", "wav", "flac", "aac", "ogg", "wma", "aiff", "opus"],
  aiff: ["mp3", "wav", "flac", "aac", "ogg", "wma", "m4a", "opus"],
  opus: ["mp3", "wav", "flac", "aac", "ogg", "wma", "m4a", "aiff"],

  // Image
  png: ["jpg", "jpeg", "webp", "avif", "gif", "bmp", "tiff", "ico", "pdf"],
  jpg: ["png", "webp", "avif", "gif", "bmp", "tiff", "ico", "pdf"],
  jpeg: ["png", "webp", "avif", "gif", "bmp", "tiff", "ico", "pdf"],
  webp: ["png", "jpg", "jpeg", "avif", "gif", "bmp", "tiff", "ico", "pdf"],
  avif: ["png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff", "ico", "pdf"],
  gif: ["png", "jpg", "jpeg", "webp", "avif", "bmp", "tiff", "ico", "pdf", "mp4", "webm"],
  bmp: ["png", "jpg", "jpeg", "webp", "avif", "gif", "tiff", "ico", "pdf"],
  tiff: ["png", "jpg", "jpeg", "webp", "avif", "gif", "bmp", "ico", "pdf"],
  ico: ["png", "jpg", "jpeg", "webp", "avif", "gif", "bmp", "tiff", "pdf"],
  svg: ["png", "jpg", "jpeg", "webp", "pdf"],
  heic: ["png", "jpg", "jpeg", "webp", "avif", "gif", "bmp", "tiff", "pdf"],
  raw: ["png", "jpg", "jpeg", "webp", "tiff"],
  cr2: ["png", "jpg", "jpeg", "webp", "tiff"],
  nef: ["png", "jpg", "jpeg", "webp", "tiff"],
  arw: ["png", "jpg", "jpeg", "webp", "tiff"],

  // Document
  pdf: ["docx", "doc", "txt", "html", "md", "epub", "png", "jpg"],
  docx: ["pdf", "doc", "txt", "rtf", "odt", "html", "md"],
  doc: ["pdf", "docx", "txt", "rtf", "odt", "html", "md"],
  txt: ["pdf", "docx", "doc", "rtf", "odt", "html", "md"],
  rtf: ["pdf", "docx", "doc", "txt", "odt", "html", "md"],
  odt: ["pdf", "docx", "doc", "txt", "rtf", "html", "md"],
  html: ["pdf", "docx", "doc", "txt", "rtf", "odt", "md", "epub"],
  md: ["pdf", "docx", "doc", "txt", "rtf", "odt", "html", "epub"],

  // Spreadsheet
  xlsx: ["xls", "csv", "ods", "tsv", "pdf", "html"],
  xls: ["xlsx", "csv", "ods", "tsv", "pdf", "html"],
  csv: ["xlsx", "xls", "ods", "tsv"],
  ods: ["xlsx", "xls", "csv", "tsv", "pdf", "html"],
  tsv: ["xlsx", "xls", "csv", "ods"],

  // Presentation
  pptx: ["ppt", "odp", "pdf"],
  ppt: ["pptx", "odp", "pdf"],
  odp: ["pptx", "ppt", "pdf"],

  // Ebook
  epub: ["mobi", "azw3", "pdf", "fb2", "html", "txt"],
  mobi: ["epub", "azw3", "pdf", "fb2", "html", "txt"],
  azw3: ["epub", "mobi", "pdf", "fb2", "html", "txt"],
  fb2: ["epub", "mobi", "azw3", "pdf", "html", "txt"],

  // Archive
  zip: ["7z", "tar", "tar.gz", "tar.bz2"],
  "7z": ["zip", "tar", "tar.gz", "tar.bz2"],
  rar: ["zip", "7z", "tar", "tar.gz", "tar.bz2"],
  tar: ["zip", "7z", "tar.gz", "tar.bz2"],
  "tar.gz": ["zip", "7z", "tar", "tar.bz2"],
  "tar.bz2": ["zip", "7z", "tar", "tar.gz"],
  gz: ["zip", "7z", "tar"],
  bz2: ["zip", "7z", "tar"],
  xz: ["zip", "7z", "tar"],
  tgz: ["zip", "7z", "tar", "tar.bz2"],
  tbz2: ["zip", "7z", "tar", "tar.gz"],

  // Vector
  eps: ["svg", "pdf", "png"],
  ai: ["svg", "pdf", "png", "eps"],
  dxf: ["svg", "pdf", "png"],

  // Font
  ttf: ["otf", "woff", "woff2", "eot"],
  otf: ["ttf", "woff", "woff2", "eot"],
  woff: ["ttf", "otf", "woff2", "eot"],
  woff2: ["ttf", "otf", "woff", "eot"],
  eot: ["ttf", "otf", "woff", "woff2"],
};

export function getOutputFormats(inputFormat: string): string[] {
  const format = inputFormat.toLowerCase().replace(".", "");
  return FORMAT_CONVERSIONS[format] || [];
}

export function getCategoryForFormat(format: string): string {
  const ext = format.toLowerCase().replace(".", "");
  
  for (const [category, data] of Object.entries(CATEGORIES)) {
    if ("formats" in data && data.formats?.includes(ext)) {
      return category;
    }
  }
  
  return "other";
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
