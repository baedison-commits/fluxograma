import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FlowchartService } from '../../services/flowchart.service';
import { FlowNode, Connection, Viewport } from '../../types';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-minimap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="minimap" [class.visible]="visible">
      <div class="minimap-header">
        <i class="fas fa-map"></i> Mini-Mapa
        <button class="toggle-btn" (click)="visible = !visible">&times;</button>
      </div>
      <canvas #miniCanvas width="240" height="150"></canvas>
    </div>
  `,
  styles: [`
    .minimap {
      position: absolute;
      bottom: 12px;
      right: 12px;
      background: rgba(22,33,62,0.95);
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 8px;
      padding: 8px;
      z-index: 60;
      display: none;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    }
    .minimap.visible { display: block; }
    .minimap-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: #888;
      font-size: 11px;
      margin-bottom: 6px;
      gap: 8px;
    }
    .minimap-header i { color: #e94560; }
    .toggle-btn {
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      font-size: 16px;
    }
    .toggle-btn:hover { color: #fff; }
    canvas {
      border-radius: 4px;
      width: 240px;
      height: 150px;
      display: block;
    }
  `]
})
export class MinimapComponent implements OnInit, OnDestroy {
  @ViewChild('miniCanvas') miniCanvasEl!: ElementRef<HTMLCanvasElement>;

  visible = true;
  private subs: Subscription[] = [];
  private nodes: FlowNode[] = [];
  private connections: Connection[] = [];
  private viewport: Viewport = { offsetX: 0, offsetY: 0, zoom: 1 };

  constructor(private service: FlowchartService) {}

  ngOnInit(): void {
    this.subs.push(
      this.service.nodes$.subscribe(n => { this.nodes = n; this.renderMini(); }),
      this.service.connections$.subscribe(c => { this.connections = c; this.renderMini(); }),
      this.service.viewport$.subscribe(v => { this.viewport = v; this.renderMini(); })
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  ngAfterViewInit(): void {
    this.renderMini();
  }

  private renderMini(): void {
    const canvas = this.miniCanvasEl?.nativeElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, 240, 150);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 240, 150);

    if (this.nodes.length === 0) return;

    const minX = Math.min(...this.nodes.map(n => n.position.x));
    const minY = Math.min(...this.nodes.map(n => n.position.y));
    const maxX = Math.max(...this.nodes.map(n => n.position.x + n.size.width));
    const maxY = Math.max(...this.nodes.map(n => n.position.y + n.size.height));

    const scaleX = 200 / (maxX - minX + 100);
    const scaleY = 110 / (maxY - minY + 100);
    const scale = Math.min(scaleX, scaleY, 0.5);
    const offsetX = (240 - (maxX - minX + 100) * scale) / 2 - minX * scale;
    const offsetY = (150 - (maxY - minY + 100) * scale) / 2 - minY * scale;

    // Draw connections
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    this.connections.forEach(conn => {
      const source = this.nodes.find(n => n.id === conn.sourceId);
      const target = this.nodes.find(n => n.id === conn.targetId);
      if (source && target) {
        ctx.beginPath();
        ctx.moveTo(
          source.position.x * scale + offsetX + source.size.width * scale / 2,
          source.position.y * scale + offsetY + source.size.height * scale / 2
        );
        ctx.lineTo(
          target.position.x * scale + offsetX + target.size.width * scale / 2,
          target.position.y * scale + offsetY + target.size.height * scale / 2
        );
        ctx.stroke();
      }
    });

    // Draw nodes
    this.nodes.forEach(node => {
      ctx.fillStyle = node.color || '#4A90D9';
      ctx.fillRect(
        node.position.x * scale + offsetX,
        node.position.y * scale + offsetY,
        Math.max(node.size.width * scale, 4),
        Math.max(node.size.height * scale, 4)
      );
    });

    // Draw viewport rect
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 1.5;
    const vx = (-this.viewport.offsetX / this.viewport.zoom) * scale + offsetX;
    const vy = (-this.viewport.offsetY / this.viewport.zoom) * scale + offsetY;
    const vw = (window.innerWidth / this.viewport.zoom) * scale;
    const vh = (window.innerHeight / this.viewport.zoom) * scale;
    ctx.strokeRect(vx, vy, vw, vh);
  }
}
