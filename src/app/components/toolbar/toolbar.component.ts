import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlowchartService } from '../../services/flowchart.service';
import { SymbolPaletteService } from '../../services/symbol-palette.service';
import { ToolType, NodeShape, Viewport, FlowNode } from '../../types';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="toolbar">
      <div class="toolbar-group">
        <button
          *ngFor="let tool of tools"
          class="tool-btn"
          [class.active]="activeTool === tool.id"
          [title]="tool.title"
          (click)="selectTool(tool.id)"
        >
          <i [class]="tool.icon"></i>
        </button>
      </div>

      <div class="divider"></div>

      <div class="toolbar-group">
        <button class="tool-btn" title="Salvar (Ctrl+S)" (click)="save()">
          <i class="fas fa-save"></i>
        </button>
        <button class="tool-btn" title="Carregar" (click)="load()">
          <i class="fas fa-folder-open"></i>
        </button>
        <input
          type="file"
          #fileInput
          accept=".flowchart.json,.json"
          style="display:none"
          (change)="onFileSelected($event)"
        />
        <button class="tool-btn" title="Imprimir (Ctrl+P)" (click)="print()">
          <i class="fas fa-print"></i>
        </button>
        <button class="tool-btn" title="Exportar PNG" (click)="exportPng()">
          <i class="fas fa-file-image"></i>
        </button>
        <button class="tool-btn" title="Exportar PDF" (click)="exportPdf()">
          <i class="fas fa-file-pdf"></i>
        </button>
      </div>

      <div class="divider"></div>

      <div class="toolbar-group">
        <button class="tool-btn" title="Desfazer (Ctrl+Z)" (click)="undo()" [class.disabled]="!canUndo">
          <i class="fas fa-undo"></i>
        </button>
        <button class="tool-btn" title="Refazer (Ctrl+Y)" (click)="redo()" [class.disabled]="!canRedo">
          <i class="fas fa-redo"></i>
        </button>
        <button class="tool-btn" title="Deletar (Del)" (click)="delete()">
          <i class="fas fa-trash"></i>
        </button>
        <button class="tool-btn" title="Duplicar (Ctrl+D)" (click)="duplicate()">
          <i class="fas fa-copy"></i>
        </button>
      </div>

      <div class="divider"></div>

      <div class="toolbar-group label-group">
        <label>
          <i class="fas fa-palette"></i>
          <select [(ngModel)]="selectedColor" (change)="onColorChange()">
            <option value="#4A90D9">Azul</option>
            <option value="#27AE60">Verde</option>
            <option value="#E74C3C">Vermelho</option>
            <option value="#F39C12">Laranja</option>
            <option value="#9B59B6">Roxo</option>
            <option value="#1ABC9C">Turquesa</option>
            <option value="#34495E">Cinza</option>
            <option value="#E91E63">Rosa</option>
          </select>
        </label>
        <label>
          <i class="fas fa-shapes"></i>
          <select [(ngModel)]="selectedShape" (change)="onShapeChange()">
            <option value="rectangle">Retângulo</option>
            <option value="rounded">Arredondado</option>
            <option value="circle">Círculo</option>
            <option value="diamond">Losango</option>
            <option value="parallelogram">Paralelogramo</option>
            <option value="document">Documento</option>
            <option value="hexagon">Hexágono</option>
          </select>
        </label>
        <label>
          <i class="fas fa-font"></i>
          <input type="number" [(ngModel)]="fontSize" (change)="onFontSizeChange()" min="8" max="48">
        </label>
      </div>

      <div class="divider"></div>

      <div class="toolbar-group zoom-group">
        <button class="tool-btn" title="Zoom -" (click)="zoomOut()"><i class="fas fa-search-minus"></i></button>
        <span class="zoom-level">{{ zoomPercent }}%</span>
        <button class="tool-btn" title="Zoom +" (click)="zoomIn()"><i class="fas fa-search-plus"></i></button>
        <button class="tool-btn" title="Ajustar" (click)="zoomFit()"><i class="fas fa-expand"></i></button>
      </div>
    </div>
  `,
  styles: [`
    .toolbar {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 12px;
      background: linear-gradient(135deg, #16213e, #0f3460);
      border-bottom: 2px solid #e94560;
      flex-wrap: wrap;
      z-index: 100;
    }
    .toolbar-group { display: flex; align-items: center; gap: 3px; }
    .tool-btn {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      color: #ccc;
      padding: 5px 8px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 13px;
    }
    .tool-btn:hover { background: rgba(255,255,255,0.15); color: #fff; }
    .tool-btn.active { background: #e94560; border-color: #e94560; color: #fff; }
    .tool-btn.disabled { opacity: 0.4; cursor: not-allowed; }
    .divider {
      width: 1px;
      height: 28px;
      background: rgba(255,255,255,0.1);
      margin: 0 4px;
    }
    .label-group label {
      display: flex;
      align-items: center;
      gap: 3px;
      color: #aaa;
      font-size: 11px;
    }
    .label-group select,
    .label-group input {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      color: #eee;
      padding: 3px 5px;
      border-radius: 3px;
      font-size: 11px;
    }
    .label-group select option { background: #16213e; }
    .zoom-level {
      color: #aaa;
      font-size: 11px;
      min-width: 32px;
      text-align: center;
    }
  `]
})
export class ToolbarComponent implements OnInit, OnDestroy {
  @Output() openImage = new EventEmitter<void>();

  private subs: Subscription[] = [];
  activeTool: ToolType = 'select';
  canUndo = false;
  canRedo = false;
  zoomPercent = 100;
  selectedColor = '#4A90D9';
  selectedShape: NodeShape = 'rounded';
  fontSize = 14;

  tools = [
    { id: 'select' as ToolType, icon: 'fas fa-mouse-pointer', title: 'Selecionar (V)' },
    { id: 'move' as ToolType, icon: 'fas fa-arrows-alt', title: 'Mover (M)' },
    { id: 'node' as ToolType, icon: 'fas fa-square', title: 'Adicionar Nó (N)' },
    { id: 'image' as ToolType, icon: 'fas fa-image', title: 'Adicionar Imagem (I)' },
    { id: 'arrow' as ToolType, icon: 'fas fa-arrow-right', title: 'Conectar (A)' },
  ];

  constructor(
    private service: FlowchartService,
    private symbolPaletteService: SymbolPaletteService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.service.activeTool$.subscribe(t => {
        this.activeTool = t;
      }),
      this.service.viewport$.subscribe(vp => {
        this.zoomPercent = Math.round(vp.zoom * 100);
      }),
      this.service.selectedNodeId$.subscribe(id => {
        if (id) {
          const nodes = this.service.getNodes();
          const node = nodes.find(n => n.id === id);
          if (node) {
            this.selectedColor = node.color;
            this.selectedShape = node.shape;
            this.fontSize = node.fontSize;
          }
        }
      })
    );

    setInterval(() => {
      this.canUndo = this.service.canUndo();
      this.canRedo = this.service.canRedo();
    }, 200);
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  selectTool(tool: ToolType): void {
    this.service.setActiveTool(tool);
    if (tool === 'image') {
      this.openImage.emit();
    }
  }

  save(): void { this.service.saveToFile(); }

  load(): void {
    const input = document.querySelector<HTMLInputElement>('input[type="file"]');
    input?.click();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.service.loadFromFile(input.files[0]).then(() => {
        alert('Fluxograma carregado com sucesso!');
      }).catch(err => {
        alert('Erro ao carregar arquivo: ' + err.message);
      });
    }
  }

    print(): void {
      const wasOpen = this.symbolPaletteService.isPaletteOpen();
      if (wasOpen) {
        this.symbolPaletteService.closePalette();
      }
    
      const canvas = document.querySelector('canvas') as HTMLCanvasElement;
      if (!canvas) {
        window.print();
        return;
      }
    
      const nodes = this.service.getNodes();
      if (nodes.length === 0) {
        window.print();
        return;
      }
    
      // Calcula os limites do conteudo
      const padding = 40;
      const minX = Math.min(...nodes.map(n => n.position.x)) - padding;
      const minY = Math.min(...nodes.map(n => n.position.y)) - padding;
      const maxX = Math.max(...nodes.map(n => n.position.x + n.size.width)) + padding;
      const maxY = Math.max(...nodes.map(n => n.position.y + n.size.height)) + padding;
    
      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
    
      // Tamanho de uma pagina A4 em pixels (300 DPI) - paisagem
      const PAGE_WIDTH = 1123;
      const PAGE_HEIGHT = 794;
    
      // Calcula quantas paginas sao necessarias
      const cols = Math.ceil(contentWidth / PAGE_WIDTH);
      const rows = Math.ceil(contentHeight / PAGE_HEIGHT);
      const totalPages = cols * rows;
    
      // Cria um canvas temporario para juntar as paginas
      const imgData = canvas.toDataURL('image/png');
      const img = new Image();
    
      img.onload = () => {
        // Abre nova janela para impressao
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        if (!printWindow) {
          window.print();
          return;
        }
      
        let htmlContent = `
          <html>
          <head>
            <title>Impressao - Fluxograma</title>
            <style>
              @page { margin: 0; size: landscape; }
              body { margin: 0; padding: 0; }
              .page {
                page-break-after: always;
                width: 100vw;
                height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                overflow: hidden;
              }
              .page:last-child { page-break-after: auto; }
              .page img {
                max-width: 100%;
                max-height: 100%;
              }
              @media print {
                @page { margin: 0; size: landscape; }
                body { margin: 0; padding: 0; }
                .page { 
                  width: 100%; 
                  height: 100vh; 
                  page-break-after: always;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                }
                .page:last-child { page-break-after: auto; }
                .page img { max-width: 100%; max-height: 100%; }
              }
            </style>
          </head>
          <body>
        `;
      
        // Gera cada pagina recortando a parte correspondente do canvas
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const srcX = minX + col * PAGE_WIDTH;
            const srcY = minY + row * PAGE_HEIGHT;
          
            // Cria canvas temporario para recortar a pagina
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = PAGE_WIDTH * 2; // 2x qualidade
            pageCanvas.height = PAGE_HEIGHT * 2;
            const pageCtx = pageCanvas.getContext('2d')!;
          
            // Fundo branco
            pageCtx.fillStyle = '#ffffff';
            pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          
            // Desenha o recorte do canvas original
            pageCtx.scale(2, 2);
            pageCtx.drawImage(img, srcX, srcY, PAGE_WIDTH, PAGE_HEIGHT, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);
          
            const pageDataUrl = pageCanvas.toDataURL('image/png');
          
            htmlContent += `<div class="page"><img src="${pageDataUrl}" /></div>`;
          }
        }
      
        htmlContent += `
            <script>
              setTimeout(() => { window.print(); }, 500);
            </script>
          </body>
          </html>
        `;
      
        printWindow.document.write(htmlContent);
        printWindow.document.close();
      };
    
      img.src = imgData;
    
      if (wasOpen) {
        setTimeout(() => {
          this.symbolPaletteService.openPalette();
        }, 100);
      }
    }

  exportPng(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'fluxograma.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  exportPdf(): void {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = (window as any).jspdf;
    const pdf = new jsPDF('landscape', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height / canvas.width) * pdfWidth;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save('fluxograma.pdf');
  }

  undo(): void { this.service.undo(); }
  redo(): void { this.service.redo(); }
  delete(): void { this.service.removeSelected(); }
  duplicate(): void { this.service.duplicateSelected(); }

  onColorChange(): void {
    const id = this.service.getSelectedNodeId();
    if (id) this.service.updateNode(id, { color: this.selectedColor });
  }

  onShapeChange(): void {
    const id = this.service.getSelectedNodeId();
    if (id) this.service.updateNode(id, { shape: this.selectedShape });
  }

  onFontSizeChange(): void {
    const id = this.service.getSelectedNodeId();
    if (id) this.service.updateNode(id, { fontSize: this.fontSize });
  }

  zoomIn(): void {
    const vp = this.service.getViewport();
    this.service.updateViewport({ ...vp, zoom: Math.min(5, vp.zoom + 0.2) });
  }

  zoomOut(): void {
    const vp = this.service.getViewport();
    this.service.updateViewport({ ...vp, zoom: Math.max(0.1, vp.zoom - 0.2) });
  }

  zoomFit(): void {
    const nodes = this.service.getNodes();
    if (nodes.length === 0) {
      this.service.updateViewport({ offsetX: 0, offsetY: 0, zoom: 1 });
      return;
    }
    const minX = Math.min(...nodes.map(n => n.position.x));
    const minY = Math.min(...nodes.map(n => n.position.y));
    const maxX = Math.max(...nodes.map(n => n.position.x + n.size.width));
    const maxY = Math.max(...nodes.map(n => n.position.y + n.size.height));
    const container = document.querySelector('.canvas-wrapper')!;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const zoom = Math.min(cw / (maxX - minX + 100), ch / (maxY - minY + 100), 2);
    const offsetX = (cw - (maxX + minX) * zoom) / 2;
    const offsetY = (ch - (maxY + minY) * zoom) / 2;
    this.service.updateViewport({ offsetX, offsetY, zoom: Math.max(0.1, zoom) });
  }
}
