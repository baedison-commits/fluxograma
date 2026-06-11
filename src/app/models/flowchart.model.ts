import { FlowNode, Connection, Viewport } from '../types';

export class FlowchartModel {
  id: string;
  name: string;
  nodes: FlowNode[];
  connections: Connection[];
  createdAt: Date;
  updatedAt: Date;
  viewport: Viewport;

  constructor(name: string = 'Novo Fluxograma') {
    this.id = crypto.randomUUID();
    this.name = name;
    this.nodes = [];
    this.connections = [];
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.viewport = { offsetX: 0, offsetY: 0, zoom: 1 };
  }

  addNode(node: FlowNode): void {
    this.nodes.push(node);
    this.touch();
  }

  removeNode(id: string): void {
    this.nodes = this.nodes.filter(n => n.id !== id);
    this.connections = this.connections.filter(
      c => c.sourceId !== id && c.targetId !== id
    );
    this.touch();
  }

  updateNode(id: string, updates: Partial<FlowNode>): void {
    const index = this.nodes.findIndex(n => n.id === id);
    if (index !== -1) {
      this.nodes[index] = { ...this.nodes[index], ...updates };
      this.touch();
    }
  }

  addConnection(conn: Connection): void {
    this.connections.push(conn);
    this.touch();
  }

  removeConnection(id: string): void {
    this.connections = this.connections.filter(c => c.id !== id);
    this.touch();
  }

  updateConnection(id: string, updates: Partial<Connection>): void {
    const index = this.connections.findIndex(c => c.id === id);
    if (index !== -1) {
      this.connections[index] = { ...this.connections[index], ...updates };
      this.touch();
    }
  }

  getNode(id: string): FlowNode | undefined {
    return this.nodes.find(n => n.id === id);
  }

  getConnectionsForNode(nodeId: string): Connection[] {
    return this.connections.filter(
      c => c.sourceId === nodeId || c.targetId === nodeId
    );
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  toJSON(): string {
    return JSON.stringify({
      id: this.id,
      name: this.name,
      nodes: this.nodes,
      connections: this.connections,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
      viewport: this.viewport
    });
  }

  static fromJSON(json: string): FlowchartModel {
    const data = JSON.parse(json);
    const model = new FlowchartModel(data.name);
    model.id = data.id;
    model.nodes = data.nodes;
    model.connections = data.connections;
    model.createdAt = new Date(data.createdAt);
    model.updatedAt = new Date(data.updatedAt);
    model.viewport = data.viewport || { offsetX: 0, offsetY: 0, zoom: 1 };
    return model;
  }
}