export interface PdfPage {
  pageNumber: number;
  width: number;
  height: number;
  rotation: number;
  thumbnailDataUrl?: string;
  annotations: AnnotationData[];
  textBlocks?: TextBlock[];
  formFields?: FormField[];
}

// PDF Form field (interactive)
export interface FormField {
  name: string;
  type: 'text' | 'checkbox' | 'radio' | 'combobox' | 'listbox' | 'button' | 'signature' | 'unknown';
  value: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isReadOnly: boolean;
  options?: string[]; // For dropdown/listbox
  isChecked?: boolean; // For checkbox/radio
  isEdited?: boolean;
  editedValue?: string;
}

// Extracted text block from PDF
export interface TextBlock {
  id: string;
  pageNumber: number;
  text: string;
  // Position in PDF coordinates (before scaling)
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  // Transform matrix from PDF [scaleX, skewX, skewY, scaleY, x, y]
  transform: number[];
  // Track if user has edited this block
  isEdited: boolean;
  editedText?: string;
}

export interface AnnotationData {
  id: string;
  type: AnnotationType;
  fabricObject: string; // JSON serialized fabric object
  pageNumber: number;
}

export type AnnotationType =
  | "text"
  | "draw"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow"
  | "image"
  | "signature"
  | "highlight"
  | "whiteout"
  | "whiteoutReplace";

export type ToolType =
  | "select"
  | "text"
  | "draw"
  | "rectangle"
  | "circle"
  | "line"
  | "arrow"
  | "image"
  | "signature"
  | "highlight"
  | "whiteout"
  | "whiteoutReplace"
  | "eraser";

export interface ToolOptions {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fontSize: number;
  fontFamily: string;
  opacity: number;
}

export const DEFAULT_TOOL_OPTIONS: ToolOptions = {
  strokeColor: "#000000",
  fillColor: "transparent",
  strokeWidth: 2,
  fontSize: 16,
  fontFamily: "Arial",
  opacity: 1,
};

export interface PdfEditorState {
  isOpen: boolean;
  filePath: string | null;
  fileName: string | null;
  currentPage: number;
  totalPages: number;
  zoom: number;
  activeTool: ToolType;
  toolOptions: ToolOptions;
  pages: PdfPage[];
  hasChanges: boolean;
}

export const initialPdfEditorState: PdfEditorState = {
  isOpen: false,
  filePath: null,
  fileName: null,
  currentPage: 1,
  totalPages: 0,
  zoom: 1,
  activeTool: "select",
  toolOptions: DEFAULT_TOOL_OPTIONS,
  pages: [],
  hasChanges: false,
};
