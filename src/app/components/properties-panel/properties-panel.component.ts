import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlowchartService } from '../../services/flowchart.service';
import { FlowNode, Connection, NodeShape } from '../../types';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-properties-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="panel" [class.visible]="isVisible">
      <div class="panel-header">
        <h3><i class="fas fa-sliders-h"></i> Propriedades</h3>
        <button class="close-btn" (click)="close()">&times;</button>
      </div>

      <div class="panel-body">
        <!-- Node Properties -->
        <ng-container *ngIf="selectedNode">
          <div class="section-title">
            <i class="fas fa-cube"></i> Nó
          </div>

          <div class="prop-row">
            <label>Texto</label>
            <textarea [(ngModel)]="selectedNode.text" (change)="updateNode()" rows="3"></textarea>
          </div>

          <div class="prop-row">
            <label>Cor</label>
            <input type="color" [(ngModel)]="selectedNode.color" (change)="updateNode()" />
          </div>

          <div class="prop-row">
            <label>Forma</label>
            <select [(ngModel)]="selectedNode.shape" (change)="updateNode()">
              <option value="rectangle">Retângulo</option>
              <option value="rounded">Arredondado</option>
              <option value="circle">Círculo</option>
              <option value="diamond">Losango</option>
              <option value="parallelogram">Paralelogramo</option>
              <option value="document">Documento</option>
              <option value="hexagon">Hexágono</option>
            </select>
          </div>

          <div class="prop-row">
            <label>Fonte</label>
            <input type="number" [(ngModel)]="selectedNode.fontSize" (change)="updateNode()" min="8" max="48" />
          </div>

          <div class="prop-row">
            <label>Opacidade</label>
            <input type="range" [(ngModel)]="selectedNode.opacity" (change)="updateNode()" min="0.1" max="1" step="0.1" />
            <span class="val">{{ selectedNode.opacity | number:'1.0-1' }}</span>
          </div>

          <div class="prop-row">
            <label>Borda</label>
            <input type="color" [(ngModel)]="selectedNode.borderColor" (change)="updateNode()" />
            <input type="number" [(ngModel)]="selectedNode.borderWidth" (change)="updateNode()" min="0" max="10" style="width:50px" />
          </div>

          <div class="prop-row">
            <label>Raio (arred.)</label>
            <input type="number" [(ngModel)]="selectedNode.borderRadius" (change)="updateNode()" min="0" max="50" />
          </div>

          <div class="prop-row">
            <label>Rotação</label>
            <input type="range" [(ngModel)]="selectedNode.rotation" (change)="updateNode()" min="-180" max="180" />
            <span class="val">{{ selectedNode.rotation }}°</span>
          </div>

          <div class="prop-row">
            <label>Posição X</label>
            <input type="number" [(ngModel)]="selectedNode.position.x" (change)="updateNode()" />
          </div>

          <div class="prop-row">
            <label>Posição Y</label>
            <input type="number" [(ngModel)]="selectedNode.position.y" (change)="updateNode()" />
          </div>

          <div class="prop-row">
            <label>Largura</label>
            <input type="number" [(ngModel)]="selectedNode.size.width" (change)="updateNode()" min="50" max="600" />
          </div>

          <div class="prop-row">
            <label>Altura</label>
            <input type="number" [(ngModel)]="selectedNode.size.height" (change)="updateNode()" min="30" max="400" />
          </div>

          <!-- Image specific -->
          <ng-container *ngIf="selectedNode.type === 'image'">
            <div class="section-title">
              <i class="fas fa-image"></i> Imagem
            </div>
            <div class="prop-row">
              <label>URL</label>
              <input type="text" [(ngModel)]="selectedNode.imageUrl" (change)="loadImage()" placeholder="URL da imagem" />
            </div>
          </ng-container>
        </ng-container>

        <!-- Connection Properties -->
        <ng-container *ngIf="selectedConnection">
          <div class="section-title">
            <i class="fas fa-arrow-right"></i> Conexão
          </div>

          <div class="prop-row">
            <label>Rótulo</label>
            <input type="text" [(ngModel)]="selectedConnection.label" (change)="updateConnection()" />
          </div>

          <div class="prop-row">
            <label>Cor</label>
            <input type="color" [(ngModel)]="selectedConnection.color" (change)="updateConnection()" />
          </div>

          <div class="prop-row">
            <label>Espessura</label>
            <input type="number" [(ngModel)]="selectedConnection.strokeWidth" (change)="updateConnection()" min="1" max="10" />
          </div>

          <div class="prop-row">
            <label>Estilo</label>
            <select [(ngModel)]="selectedConnection.style" (change)="updateConnection()">
              <option value="solid">Sólido</option>
              <option value="dashed">Tracejado</option>
              <option value="dotted">Pontilhado</option>
            </select>
          </div>

          <div class="prop-row">
            <label>
              <input type="checkbox" [(ngModel)]="selectedConnection.startArrow" (change)="updateConnection()" />
              Seta início
            </label>
          </div>

          <div class="prop-row">
            <label>
              <input type="checkbox" [(ngModel)]="selectedConnection.endArrow" (change)="updateConnection()" />
              Seta fim
            </label>
          </div>
        </ng-container>

        <!-- No selection -->
        <ng-container *ngIf="!selectedNode && !selectedConnection">
          <p class="hint">
            <i class="fas fa-info-circle"></i>
            Selecione um elemento no canvas para editar suas propriedades.
          </p>
        </ng-container>
      </div>
    </div>
  `,
  styles: [`
    .panel {
      position: absolute;
      right: 0;
      top: 0;
      bottom: 0;
      width: 270px;
      background: linear-gradient(180deg, #1a1a3e 0%, #16213e 100%);
      border-left: 2px solid rgba(255,255,255,0.1);
      padding: 12px;
      overflow-y: auto;
      z-index: 50;
      display: none;
    }
    .panel.visible { display: block; }
    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .panel-header h3 {
      color: #e94560;
      font-size: 14px;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .close-btn {
      background: none;
      border: none;
      color: #888;
      font-size: 20px;
      cursor: pointer;
    }
    .close-btn:hover { color: #fff; }
    .section-title {
      color: #888;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 12px 0 8px;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    .prop-row {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
      font-size: 12px;
    }
    .prop-row label {
      min-width: 55px;
      color: #aaa;
      font-size: 11px;
    }
    .prop-row input,
    .prop-row select,
    .prop-row textarea {
      flex: 1;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      color: #eee;
      padding: 4px 6px;
      border-radius: 3px;
      font-size: 11px;
    }
    .prop-row textarea { min-height: 50px; resize: vertical; }
    .prop-row input[type="color"] {
      padding: 1px;
      height: 26px;
      min-width: 35px;
      flex: 0.3;
    }
    .prop-row input[type="range"] {
      padding: 0;
      accent-color: #e94560;
    }
    .prop-row input[type="checkbox"] {
      accent-color: #e94560;
    }
    .val { color: #888; font-size: 11px; min-width: 30px; }
    .hint {
      color: #666;
      text-align: center;
      font-size: 12px;
      padding: 20px 10px;
    }
    .hint i { display: block; font-size: 28px; margin-bottom: 8px; color: #555; }
  `]
})
export class PropertiesPanelComponent implements OnInit, OnDestroy {
  private subs: Subscription[] = [];
  isVisible = false;
  selectedNode: FlowNode | null = null;
  selectedConnection: Connection | null = null;

  constructor(private service: FlowchartService) {}

  ngOnInit(): void {
    this.subs.push(
      this.service.selectedNodeId$.subscribe(id => {
        if (id) {
          const nodes = this.service.getNodes();
          this.selectedNode = nodes.find(n => n.id === id) || null;
          this.selectedConnection = null;
          this.isVisible = true;
        }
      }),
      this.service.selectedConnectionId$.subscribe(id => {
        if (id) {
          const conns = this.service.getConnections();
          this.selectedConnection = conns.find(c => c.id === id) || null;
          this.selectedNode = null;
          this.isVisible = true;
        }
      }),
      this.service.nodes$.subscribe(() => {
        if (this.selectedNode) {
          const id = this.selectedNode.id;
          const nodes = this.service.getNodes();
          this.selectedNode = nodes.find(n => n.id === id) || null;
          if (!this.selectedNode) this.isVisible = false;
        }
      }),
      this.service.connections$.subscribe(() => {
        if (this.selectedConnection) {
          const id = this.selectedConnection.id;
          const conns = this.service.getConnections();
          this.selectedConnection = conns.find(c => c.id === id) || null;
          if (!this.selectedConnection) this.isVisible = false;
        }
      })
    );
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  updateNode(): void {
    if (this.selectedNode) {
      this.service.updateNode(this.selectedNode.id, { ...this.selectedNode });
    }
  }

  updateConnection(): void {
    if (this.selectedConnection) {
      this.service.updateConnection(this.selectedConnection.id, { ...this.selectedConnection });
    }
  }

  close(): void {
    this.isVisible = false;
    this.service.clearSelection();
  }

  loadImage(): void {
    if (this.selectedNode && this.selectedNode.imageUrl) {
      this.selectedNode.imageData = this.selectedNode.imageUrl;
      this.updateNode();
    }
  }
}
