import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FlowNode, Connection, ToolType, Viewport, NodeShape, HistoryEntry, ClipboardData } from '../types';
import { FlowchartModel } from '../models/flowchart.model';

@Injectable({ providedIn: 'root' })
export class FlowchartService {
  private model: FlowchartModel = new FlowchartModel();
  private selectedNodeId = new BehaviorSubject<string | null>(null);
  private selectedConnectionId = new BehaviorSubject<string | null>(null);
  private activeTool = new BehaviorSubject<ToolType>('select');
  private viewport = new BehaviorSubject<Viewport>({ offsetX: 0, offsetY: 0, zoom: 1 });
  private nodesSubject = new BehaviorSubject<FlowNode[]>([]);
  private connectionsSubject = new BehaviorSubject<Connection[]>([]);
  private history: HistoryEntry[] = [];
  private historyIndex = -1;
  private clipboard: ClipboardData | null = null;
  private isDrawingArrow = new BehaviorSubject<boolean>(false);
  private arrowSourceId = new BehaviorSubject<string | null>(null);

  // Observables
  nodes$: Observable<FlowNode[]> = this.nodesSubject.asObservable();
  connections$: Observable<Connection[]> = this.connectionsSubject.asObservable();
  selectedNodeId$: Observable<string | null> = this.selectedNodeId.asObservable();
  selectedConnectionId$: Observable<string | null> = this.selectedConnectionId.asObservable();
  activeTool$: Observable<ToolType> = this.activeTool.asObservable();
  viewport$: Observable<Viewport> = this.viewport.asObservable();
  isDrawingArrow$: Observable<boolean> = this.isDrawingArrow.asObservable();
  arrowSourceId$: Observable<string | null> = this.arrowSourceId.asObservable();

  getNodes(): FlowNode[] { return this.nodesSubject.value; }
  getConnections(): Connection[] { return this.connectionsSubject.value; }
  getSelectedNodeId(): string | null { return this.selectedNodeId.value; }
  getSelectedConnectionId(): string | null { return this.selectedConnectionId.value; }
  getActiveTool(): ToolType { return this.activeTool.value; }
  getViewport(): Viewport { return this.viewport.value; }
  getModelName(): string { return this.model.name; }

  setModelName(name: string): void {
    this.model.name = name;
  }

  setActiveTool(tool: ToolType): void {
    this.activeTool.next(tool);
    if (tool !== 'arrow') {
      this.isDrawingArrow.next(false);
      this.arrowSourceId.next(null);
    }
  }

  selectNode(id: string | null): void {
    this.selectedNodeId.next(id);
    this.selectedConnectionId.next(null);
  }

  selectConnection(id: string | null): void {
    this.selectedConnectionId.next(id);
    this.selectedNodeId.next(null);
  }

  clearSelection(): void {
    this.selectedNodeId.next(null);
    this.selectedConnectionId.next(null);
  }

  addNode(node: FlowNode): void {
    this.saveHistory();
    this.model.addNode(node);
    this.emitState();
    this.selectNode(node.id);
  }

  requestEditText(nodeId: string): void {
    const node = this.model.getNode(nodeId);
    if (node) {
      window.dispatchEvent(new CustomEvent('edit-node-text', { detail: node }));
    }
  }

  requestEditImage(nodeId: string): void {
    window.dispatchEvent(new CustomEvent('edit-node-image', { detail: { nodeId } }));
  }

  updateNode(id: string, updates: Partial<FlowNode>): void {
    this.saveHistory();
    this.model.updateNode(id, updates);
    this.emitState();
  }

  removeSelected(): void {
    this.saveHistory();
    const nodeId = this.selectedNodeId.value;
    const connId = this.selectedConnectionId.value;
    if (nodeId) {
      this.model.removeNode(nodeId);
      this.clearSelection();
    }
    if (connId) {
      this.model.removeConnection(connId);
      this.clearSelection();
    }
    this.emitState();
  }

  duplicateSelected(): void {
    const nodeId = this.selectedNodeId.value;
    if (!nodeId) return;
    this.saveHistory();
    const original = this.model.getNode(nodeId);
    if (original) {
      const clone: FlowNode = {
        ...JSON.parse(JSON.stringify(original)),
        id: crypto.randomUUID(),
        position: { x: original.position.x + 30, y: original.position.y + 30 },
        text: original.text + ' (cópia)'
      };
      this.model.addNode(clone);
      this.emitState();
      this.selectNode(clone.id);
    }
  }

  startArrowDraw(sourceId: string): void {
    this.isDrawingArrow.next(true);
    this.arrowSourceId.next(sourceId);
  }

  completeArrowDraw(targetId: string): void {
    const sourceId = this.arrowSourceId.value;
    if (sourceId && sourceId !== targetId) {
      this.saveHistory();
      const connection: Connection = {
        id: crypto.randomUUID(),
        sourceId,
        targetId,
        label: '',
        color: '#666',
        strokeWidth: 2,
        style: 'solid',
        startArrow: false,
        endArrow: true
      };
      this.model.addConnection(connection);
      this.emitState();
    }
    this.isDrawingArrow.next(false);
    this.arrowSourceId.next(null);
  }

  cancelArrowDraw(): void {
    this.isDrawingArrow.next(false);
    this.arrowSourceId.next(null);
  }

  addConnection(conn: Connection): void {
    this.saveHistory();
    this.model.addConnection(conn);
    this.emitState();
  }

  updateConnection(id: string, updates: Partial<Connection>): void {
    this.saveHistory();
    this.model.updateConnection(id, updates);
    this.emitState();
  }

  updateViewport(viewport: Viewport): void {
    this.viewport.next(viewport);
    this.model.viewport = viewport;
  }

  saveToFile(): void {
    const json = this.model.toJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${this.model.name}.flowchart.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  loadFromFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = e.target?.result as string;
          this.model = FlowchartModel.fromJSON(json);
          this.history = [];
          this.historyIndex = -1;
          this.saveHistory();
          this.emitState();
          this.viewport.next(this.model.viewport);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  undo(): void {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const entry = this.history[this.historyIndex];
      this.model.nodes = JSON.parse(JSON.stringify(entry.nodes));
      this.model.connections = JSON.parse(JSON.stringify(entry.connections));
      this.emitState();
    }
  }

  redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const entry = this.history[this.historyIndex];
      this.model.nodes = JSON.parse(JSON.stringify(entry.nodes));
      this.model.connections = JSON.parse(JSON.stringify(entry.connections));
      this.emitState();
    }
  }

  canUndo(): boolean { return this.historyIndex > 0; }
  canRedo(): boolean { return this.historyIndex < this.history.length - 1; }

  copySelected(): void {
    const nodeId = this.selectedNodeId.value;
    if (!nodeId) return;
    const node = this.model.getNode(nodeId);
    if (node) {
      const relatedConns = this.model.getConnectionsForNode(nodeId);
      this.clipboard = {
        nodes: [JSON.parse(JSON.stringify(node))],
        connections: JSON.parse(JSON.stringify(relatedConns))
      };
    }
  }

  pasteClipboard(): void {
    if (!this.clipboard) return;
    this.saveHistory();
    const idMap = new Map<string, string>();
    const newNodes: FlowNode[] = this.clipboard.nodes.map(n => {
      const newId = crypto.randomUUID();
      idMap.set(n.id, newId);
      return {
        ...n,
        id: newId,
        position: { x: n.position.x + 50, y: n.position.y + 50 },
        text: n.text + ' (colado)'
      };
    });
    const newConns: Connection[] = this.clipboard.connections.map(c => ({
      ...c,
      id: crypto.randomUUID(),
      sourceId: idMap.get(c.sourceId) || c.sourceId,
      targetId: idMap.get(c.targetId) || c.targetId
    }));
    newNodes.forEach(n => this.model.addNode(n));
    newConns.forEach(c => this.model.addConnection(c));
    this.emitState();
    if (newNodes.length > 0) this.selectNode(newNodes[0].id);
  }

  hasClipboard(): boolean { return this.clipboard !== null; }

  private saveHistory(): void {
    // Remove future history on new action
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    const entry: HistoryEntry = {
      nodes: JSON.parse(JSON.stringify(this.model.nodes)),
      connections: JSON.parse(JSON.stringify(this.model.connections))
    };
    this.history.push(entry);
    if (this.history.length > 50) this.history.shift();
    this.historyIndex = this.history.length - 1;
  }

  private emitState(): void {
    this.nodesSubject.next([...this.model.nodes]);
    this.connectionsSubject.next([...this.model.connections]);
  }
}