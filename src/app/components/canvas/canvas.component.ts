import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlowchartService } from '../../services/flowchart.service';
import { CanvasRendererService } from '../../services/canvas-renderer.service';
import { FlowNode, Connection, Position, Viewport, ToolType } from '../../types';
import { Subscription } from 'rxjs';
import { SymbolPaletteService } from '../../services/symbol-palette.service';

export type ResizeHandle = 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

const HANDLE_SIZE = 8;

@Component({
  selector: 'app-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      #container
      class="canvas-wrapper"
      (mousedown)="onMouseDown($event)"
      (mousemove)="onMouseMove($event)"
      (mouseup)="onMouseUp($event)"
      (mouseleave)="onMouseUp($event)"
      (wheel)="onWheel($event)"
      (contextmenu)="onContextMenu($event)"
      (dblclick)="onDblClick($event)"
      (dragover)="onDragOver($event)"
      (dragenter)="onDragEnter($event)"
      (dragleave)="onDragLeave($event)"
      (drop)="onDrop($event)"
    >
      <canvas
        #canvasEl
        [style.width.px]="canvasWidth"
        [style.height.px]="canvasHeight"
        [width]="canvasWidth * getDpr()"
        [height]="canvasHeight * getDpr()"
      ></canvas>
    </div>
  `,
  styles: [`
    .canvas-wrapper {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      background: #1e1e30;
      background-image:
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 30px 30px;
      cursor: grab;
    }
    .canvas-wrapper:active { cursor: grabbing; }
    canvas {
      position: absolute;
      top: 0;
      left: 0;
    }
  `]
})
export class CanvasComponent implements OnInit, OnDestroy {
  @ViewChild('canvasEl') canvasEl!: ElementRef<HTMLCanvasElement>;
  @ViewChild('container') containerEl!: ElementRef<HTMLDivElement>;

  canvasWidth = 5000;
  canvasHeight = 5000;
  private subs: Subscription[] = [];
  private ctx!: CanvasRenderingContext2D;
  private nodes: FlowNode[] = [];
  private connections: Connection[] = [];
  private viewport: Viewport = { offsetX: 0, offsetY: 0, zoom: 1 };
  private selectedNodeId: string | null = null;
  private selectedConnId: string | null = null;
  private isDragging = false;
  private dragStart: Position = { x: 0, y: 0 };
  private dragOffset: Position = { x: 0, y: 0 };
  private dragNodeStart: Position = { x: 0, y: 0 };
  private isPanning = false;
  private panStart: Position = { x: 0, y: 0 };
  private panOffsetStart: { offsetX: number; offsetY: number; zoom: number } = { offsetX: 0, offsetY: 0, zoom: 1 };
  private isArrowDrawing = false;
  private arrowSourceId: string | null = null;
  private mousePos: Position = { x: 0, y: 0 };
  private snapEnabled = true;
  private snapSize = 20;

  // Resize state
  private isResizing = false;
  private activeResizeHandle: ResizeHandle | null = null;
  private resizeNodeStart: { position: Position; size: { width: number; height: number } } = { position: { x: 0, y: 0 }, size: { width: 0, height: 0 } };
  private resizeMouseStart: Position = { x: 0, y: 0 };

  constructor(
    private service: FlowchartService,
    private renderer: CanvasRendererService,
    private symbolPalette: SymbolPaletteService,
    private zone: NgZone
  ) {}

  getDpr(): number {
    return window.devicePixelRatio || 1;
  }

  ngOnInit(): void {
    this.subs.push(
      this.service.nodes$.subscribe(nodes => { this.nodes = nodes; this.requestRender(); }),
      this.service.connections$.subscribe(conns => { this.connections = conns; this.requestRender(); }),
      this.service.viewport$.subscribe(vp => { this.viewport = vp; this.requestRender(); }),
      this.service.selectedNodeId$.subscribe(id => { this.selectedNodeId = id; this.requestRender(); }),
      this.service.selectedConnectionId$.subscribe(id => { this.selectedConnId = id; this.requestRender(); }),
      this.service.isDrawingArrow$.subscribe(drawing => { this.isArrowDrawing = drawing; }),
      this.service.arrowSourceId$.subscribe(id => { this.arrowSourceId = id; })
    );
  }

  ngAfterViewInit(): void {
    const canvas = this.canvasEl.nativeElement;
    this.ctx = canvas.getContext('2d')!;
    this.requestRender();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private requestRender(): void {
    requestAnimationFrame(() => this.render());
  }

  private render(): void {
    const ctx = this.ctx;
    const canvas = this.canvasEl.nativeElement;
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    ctx.save();
    ctx.translate(this.viewport.offsetX, this.viewport.offsetY);
    ctx.scale(this.viewport.zoom, this.viewport.zoom);

    this.renderer.drawGrid(ctx, this.viewport, this.canvasWidth, this.canvasHeight);

    this.connections.forEach(conn =>
      this.renderer.drawConnection(ctx, conn, this.nodes, this.selectedConnId)
    );

    this.nodes.forEach(node => {
      this.renderer.drawNode(ctx, node, node.id === this.selectedNodeId);
    });

    this.nodes.forEach(node => {
      if (node.type === 'image' && node.imageData) {
        this.renderer.drawImageOnNode(ctx, node);
      }
      this.renderer.drawNodeText(ctx, node);
    });

    // Draw resize handles on selected node
    if (this.selectedNodeId) {
      const selected = this.nodes.find(n => n.id === this.selectedNodeId);
      if (selected) {
        this.drawResizeHandles(ctx, selected);
      }
    }

    ctx.restore();
  }

  private drawResizeHandles(ctx: CanvasRenderingContext2D, node: FlowNode): void {
    const { x, y } = node.position;
    const { width, height } = node.size;
    const hs = HANDLE_SIZE / this.viewport.zoom;
    const half = hs / 2;

    ctx.save();
    ctx.fillStyle = '#e94560';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5 / this.viewport.zoom;

    const handles: { pos: Position; cursor: string }[] = [
      // Corners
      { pos: { x: x - half, y: y - half }, cursor: 'nw-resize' },
      { pos: { x: x + width - half, y: y - half }, cursor: 'ne-resize' },
      { pos: { x: x - half, y: y + height - half }, cursor: 'sw-resize' },
      { pos: { x: x + width - half, y: y + height - half }, cursor: 'se-resize' },
      // Edges
      { pos: { x: x + width / 2 - half, y: y - half }, cursor: 'n-resize' },
      { pos: { x: x + width / 2 - half, y: y + height - half }, cursor: 's-resize' },
      { pos: { x: x - half, y: y + height / 2 - half }, cursor: 'w-resize' },
      { pos: { x: x + width - half, y: y + height / 2 - half }, cursor: 'e-resize' },
    ];

    handles.forEach(h => {
      ctx.fillRect(h.pos.x, h.pos.y, hs, hs);
      ctx.strokeRect(h.pos.x, h.pos.y, hs, hs);
    });

    ctx.restore();
  }

  private getResizeHandleAt(worldPos: Position): ResizeHandle | null {
    if (!this.selectedNodeId) return null;
    const node = this.nodes.find(n => n.id === this.selectedNodeId);
    if (!node) return null;

    const { x, y } = node.position;
    const { width, height } = node.size;
    const hs = HANDLE_SIZE / this.viewport.zoom;
    const tolerance = hs + 4 / this.viewport.zoom;

    const handles: { handle: ResizeHandle; cx: number; cy: number }[] = [
      { handle: 'top-left', cx: x, cy: y },
      { handle: 'top-center', cx: x + width / 2, cy: y },
      { handle: 'top-right', cx: x + width, cy: y },
      { handle: 'middle-left', cx: x, cy: y + height / 2 },
      { handle: 'middle-right', cx: x + width, cy: y + height / 2 },
      { handle: 'bottom-left', cx: x, cy: y + height },
      { handle: 'bottom-center', cx: x + width / 2, cy: y + height },
      { handle: 'bottom-right', cx: x + width, cy: y + height },
    ];

    for (const h of handles) {
      const dx = Math.abs(worldPos.x - h.cx);
      const dy = Math.abs(worldPos.y - h.cy);
      if (dx <= tolerance && dy <= tolerance) {
        return h.handle;
      }
    }

    return null;
  }

  getNodeAt(pos: Position): { node: FlowNode | null; handle: ResizeHandle | null } {
    const worldPos = this.screenToWorld(pos);

    // First check resize handles on selected node
    if (this.selectedNodeId) {
      const handle = this.getResizeHandleAt(worldPos);
      if (handle) return { node: this.nodes.find(n => n.id === this.selectedNodeId) || null, handle };
    }

    // Then check nodes
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      const { x, y } = node.position;
      const { width, height } = node.size;
      if (worldPos.x >= x && worldPos.x <= x + width &&
          worldPos.y >= y && worldPos.y <= y + height) {
        return { node, handle: null };
      }
    }
    return { node: null, handle: null };
  }

  private screenToWorld(screen: Position): Position {
    return {
      x: (screen.x - this.viewport.offsetX) / this.viewport.zoom,
      y: (screen.y - this.viewport.offsetY) / this.viewport.zoom
    };
  }

  onMouseDown(event: MouseEvent): void {
    const pos = { x: event.offsetX, y: event.offsetY };
    this.mousePos = pos;
    const tool = this.service.getActiveTool();

    if (event.button === 1 || (event.button === 0 && tool === 'move')) {
      this.isPanning = true;
      this.panStart = pos;
      this.panOffsetStart = { ...this.viewport };
      return;
    }

    const { node, handle } = this.getNodeAt(pos);

    if (tool === 'arrow') {
      if (node) this.service.startArrowDraw(node.id);
      return;
    }

    // Check if starting a resize
    if (node && handle) {
      this.service.selectNode(node.id);
      this.isResizing = true;
      this.activeResizeHandle = handle;
      this.resizeNodeStart = {
        position: { ...node.position },
        size: { ...node.size }
      };
      this.resizeMouseStart = this.screenToWorld(pos);
      return;
    }

    if (node) {
      if (tool === 'select' || tool === 'node' || tool === 'image') {
        this.service.selectNode(node.id);
        this.isDragging = true;
        this.dragStart = pos;
        this.dragOffset = {
          x: pos.x - this.viewport.offsetX - node.position.x * this.viewport.zoom,
          y: pos.y - this.viewport.offsetY - node.position.y * this.viewport.zoom
        };
        this.dragNodeStart = { ...node.position };
      }
    } else {
      if (tool === 'node') {
        this.createNode(this.screenToWorld(pos));
      } else if (tool === 'image') {
        // handled by ImageDialog
      } else {
        this.service.clearSelection();
      }
    }
  }

  onMouseMove(event: MouseEvent): void {
    const pos = { x: event.offsetX, y: event.offsetY };
    this.mousePos = pos;

    if (this.isResizing && this.selectedNodeId && this.activeResizeHandle) {
      this.handleResize(pos);
      return;
    }

    if (this.isPanning) {
      const dx = pos.x - this.panStart.x;
      const dy = pos.y - this.panStart.y;
      this.service.updateViewport({
        offsetX: this.panOffsetStart.offsetX + dx,
        offsetY: this.panOffsetStart.offsetY + dy,
        zoom: this.panOffsetStart.zoom
      });
      return;
    }

    if (this.isDragging && this.selectedNodeId) {
      const worldPos = this.screenToWorld({
        x: pos.x - this.dragOffset.x,
        y: pos.y - this.dragOffset.y
      });

      let newX = worldPos.x;
      let newY = worldPos.y;

      if (this.snapEnabled) {
        newX = Math.round(newX / this.snapSize) * this.snapSize;
        newY = Math.round(newY / this.snapSize) * this.snapSize;
      }

      this.service.updateNode(this.selectedNodeId, {
        position: { x: newX, y: newY }
      });
    }
  }

  private handleResize(mouseScreen: Position): void {
    if (!this.selectedNodeId || !this.activeResizeHandle) return;

    const mouseWorld = this.screenToWorld(mouseScreen);
    const dx = mouseWorld.x - this.resizeMouseStart.x;
    const dy = mouseWorld.y - this.resizeMouseStart.y;

    const start = this.resizeNodeStart;
    let newX = start.position.x;
    let newY = start.position.y;
    let newW = start.size.width;
    let newH = start.size.height;

    const handle = this.activeResizeHandle;

    // Horizontal
    if (handle.includes('left')) {
      newX = start.position.x + dx;
      newW = start.size.width - dx;
    } else if (handle.includes('right')) {
      newW = start.size.width + dx;
    }

    // Vertical
    if (handle.includes('top')) {
      newY = start.position.y + dy;
      newH = start.size.height - dy;
    } else if (handle.includes('bottom')) {
      newH = start.size.height + dy;
    }

    // Minimum size
    const minSize = 40;
    if (newW < minSize) {
      if (handle.includes('left')) {
        newX = start.position.x + start.size.width - minSize;
      }
      newW = minSize;
    }
    if (newH < minSize) {
      if (handle.includes('top')) {
        newY = start.position.y + start.size.height - minSize;
      }
      newH = minSize;
    }

    // Snap
    if (this.snapEnabled) {
      newX = Math.round(newX / this.snapSize) * this.snapSize;
      newY = Math.round(newY / this.snapSize) * this.snapSize;
      newW = Math.max(minSize, Math.round(newW / this.snapSize) * this.snapSize);
      newH = Math.max(minSize, Math.round(newH / this.snapSize) * this.snapSize);
    }

    this.service.updateNode(this.selectedNodeId, {
      position: { x: newX, y: newY },
      size: { width: newW, height: newH }
    });
  }

  onMouseUp(event: MouseEvent): void {
    if (this.isResizing) {
      this.isResizing = false;
      this.activeResizeHandle = null;
      return;
    }
    if (this.isPanning) { this.isPanning = false; return; }
    if (this.isDragging) { this.isDragging = false; return; }

    if (this.isArrowDrawing) {
      const pos = { x: event.offsetX, y: event.offsetY };
      const { node } = this.getNodeAt(pos);
      if (node) this.service.completeArrowDraw(node.id);
      else this.service.cancelArrowDraw();
    }
  }

  onWheel(event: WheelEvent): void {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    const newZoom = Math.max(0.1, Math.min(5, this.viewport.zoom + delta));

    const mouseX = event.offsetX;
    const mouseY = event.offsetY;

    const newOffsetX = mouseX - (mouseX - this.viewport.offsetX) * (newZoom / this.viewport.zoom);
    const newOffsetY = mouseY - (mouseY - this.viewport.offsetY) * (newZoom / this.viewport.zoom);

    this.service.updateViewport({
      offsetX: newOffsetX,
      offsetY: newOffsetY,
      zoom: newZoom
    });
  }

  onContextMenu(event: MouseEvent): void { event.preventDefault(); }

  onDblClick(event: MouseEvent): void {
    const pos = { x: event.offsetX, y: event.offsetY };
    const { node } = this.getNodeAt(pos);
    if (node) {
      this.service.selectNode(node.id);
      window.dispatchEvent(new CustomEvent('edit-node-text', { detail: node }));
    }
  }

  private createNode(pos: Position): void {
    this.service.addNode({
      id: crypto.randomUUID(),
      type: 'node',
      position: pos,
      size: { width: 160, height: 80 },
      text: 'Novo Nó',
      color: '#4A90D9',
      shape: 'rounded',
      fontSize: 14,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: '#ffffff33',
      textColor: '#ffffff',
      opacity: 1
    });
  }

  // Drag over highlight
  private dragCounter = 0;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
  }

  onDragEnter(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter++;
    const el = this.containerEl?.nativeElement;
    if (el && this.dragCounter === 1) {
      el.style.boxShadow = 'inset 0 0 40px rgba(233,69,96,0.15)';
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter--;
    if (this.dragCounter <= 0) {
      this.dragCounter = 0;
      const el = this.containerEl?.nativeElement;
      if (el) el.style.boxShadow = 'none';
    }
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragCounter = 0;
    const el = this.containerEl?.nativeElement;
    if (el) el.style.boxShadow = 'none';

    const symbolId = event.dataTransfer?.getData('application/symbol-id');
    if (!symbolId) return;

    const symbol = this.symbolPalette.getSymbols().find(s => s.id === symbolId);
    if (!symbol) return;

    // Calculate position relative to canvas
    const rect = this.containerEl.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const worldPos = this.screenToWorld({ x: mouseX, y: mouseY });
    const snappedX = Math.round((worldPos.x - symbol.defaultWidth / 2) / 20) * 20;
    const snappedY = Math.round((worldPos.y - symbol.defaultHeight / 2) / 20) * 20;

    const node = this.symbolPalette.createNodeFromSymbol(symbol, {
      x: snappedX,
      y: snappedY
    });

    this.service.addNode(node);
  }

  @HostListener('window:resize')
  onResize(): void { this.requestRender(); }
}