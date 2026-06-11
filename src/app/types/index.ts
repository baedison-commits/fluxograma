export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export type ToolType = 'select' | 'move' | 'node' | 'image' | 'arrow' | 'special-card';

export type NodeShape = 'rectangle' | 'rounded' | 'circle' | 'diamond' | 'parallelogram' | 'document' | 'hexagon' | 'special-card';

// --- Rich Text ---
export interface RichTextRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontSize?: number;
}

export interface SpecialCardAreas {
  top: RichTextRun[];
  middle: RichTextRun[];
  bottom: RichTextRun[];
}

export interface SpecialCardData {
  areas: SpecialCardAreas;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
}

export interface FlowNode {
  id: string;
  type: 'node' | 'image' | 'special-card';
  position: Position;
  size: Size;
  text: string;
  color: string;
  shape: NodeShape;
  fontSize: number;
  imageUrl?: string;
  imageData?: string;
  borderRadius?: number;
  rotation?: number;
  opacity?: number;
  borderWidth?: number;
  borderColor?: string;
  textColor?: string;
  specialCardData?: SpecialCardData;
}

export interface Connection {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  color: string;
  strokeWidth: number;
  style: 'solid' | 'dashed' | 'dotted';
  startArrow: boolean;
  endArrow: boolean;
  startOffset?: Position;
  endOffset?: Position;
  controlPoints?: Position[];
}

export interface Flowchart {
  id: string;
  name: string;
  nodes: FlowNode[];
  connections: Connection[];
  createdAt: Date;
  updatedAt: Date;
  viewport?: Viewport;
}

export interface Viewport {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

export interface HistoryEntry {
  nodes: FlowNode[];
  connections: Connection[];
}

export interface SnapGuide {
  position: number;
  orientation: 'horizontal' | 'vertical';
}

export interface ClipboardData {
  nodes: FlowNode[];
  connections: Connection[];
}