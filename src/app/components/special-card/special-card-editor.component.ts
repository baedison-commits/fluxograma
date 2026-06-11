import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlowchartService } from '../../services/flowchart.service';
import { RichTextEditorService } from '../../services/rich-text-editor.service';
import { RichTextRun, SpecialCardData, FlowNode } from '../../types';

type AreaKey = 'top' | 'middle' | 'bottom';

@Component({
  selector: 'app-special-card-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="overlay" [class.visible]="visible" (click)="onOverlayClick($event)">
      <div class="editor-dialog" (click)="$event.stopPropagation()">
        <div class="editor-header">
          <h2>📇 Card Especial — 3 Áreas</h2>
          <p class="subtitle">Cada área (topo, meio, rodapé) tem seu próprio editor de texto rico</p>
        </div>

        <div class="editor-body">

          <!-- Preview ao vivo -->
          <div class="live-preview" [style.background]="data.backgroundColor"
               [style.borderColor]="data.borderColor"
               [style.borderWidth.px]="data.borderWidth"
               [style.borderRadius.px]="data.borderRadius">
            <div class="area area-top">
              <div *ngFor="let run of data.areas.top" class="rich-line"
                   [style.fontWeight]="run.bold ? 'bold' : 'normal'"
                   [style.fontStyle]="run.italic ? 'italic' : 'normal'"
                   [style.textDecoration]="run.underline ? 'underline' : 'none'"
                   [style.color]="run.color || '#fff'"
                   [style.fontSize.px]="run.fontSize || 16"
                   [style.textAlign]="'center'">
                {{ run.text }}
              </div>
            </div>
            <div class="area-divider"></div>
            <div class="area area-middle">
              <div *ngFor="let run of data.areas.middle" class="rich-line"
                   [style.fontWeight]="run.bold ? 'bold' : 'normal'"
                   [style.fontStyle]="run.italic ? 'italic' : 'normal'"
                   [style.textDecoration]="run.underline ? 'underline' : 'none'"
                   [style.color]="run.color || '#fff'"
                   [style.fontSize.px]="run.fontSize || 14">
                {{ run.text }}
              </div>
            </div>
            <div class="area-divider"></div>
            <div class="area area-bottom">
              <div *ngFor="let run of data.areas.bottom" class="rich-line"
                   [style.fontWeight]="run.bold ? 'bold' : 'normal'"
                   [style.fontStyle]="run.italic ? 'italic' : 'normal'"
                   [style.textDecoration]="run.underline ? 'underline' : 'none'"
                   [style.color]="run.color || '#aaa'"
                   [style.fontSize.px]="run.fontSize || 12"
                   [style.textAlign]="'center'">
                {{ run.text }}
              </div>
            </div>
          </div>

          <!-- Seletor de Área -->
          <div class="area-tabs">
            <button class="tab" [class.active]="activeArea === 'top'" (click)="activeArea = 'top'">📌 Topo</button>
            <button class="tab" [class.active]="activeArea === 'middle'" (click)="activeArea = 'middle'">📝 Meio</button>
            <button class="tab" [class.active]="activeArea === 'bottom'" (click)="activeArea = 'bottom'">🔽 Rodapé</button>
            <button class="tab" [class.active]="activeArea === 'style'" (click)="activeArea = 'style'">🎨 Estilo</button>
          </div>

          <!-- Editor da Área selecionada -->
          <div class="area-editor" *ngIf="activeArea !== 'style'">
            <div class="toolbar">
              <button [class.active]="isFormatActive('bold')" (click)="toggleFormat('bold')" title="Negrito"><b>B</b></button>
              <button [class.active]="isFormatActive('italic')" (click)="toggleFormat('italic')" title="Itálico"><i>I</i></button>
              <button [class.active]="isFormatActive('underline')" (click)="toggleFormat('underline')" title="Sublinhado"><u>S</u></button>
              <span class="tb-sep"></span>
              <button (click)="applyBullet()" title="Marcador">• Lista</button>
              <button (click)="applyNumbered()" title="Numerar">1. Lista</button>
              <span class="tb-sep"></span>
              <button (click)="addLine()" title="Nova linha">➕</button>
              <button (click)="removeLine()" [disabled]="getRuns().length <= 1" title="Remover linha">➖</button>
              <span class="tb-sep"></span>
              <input type="color" [(ngModel)]="currentColor" class="color-btn" title="Cor do texto" />
              <select [(ngModel)]="currentFontSize" class="size-select" title="Tamanho da fonte">
                <option [ngValue]="10">10</option>
                <option [ngValue]="12">12</option>
                <option [ngValue]="14">14</option>
                <option [ngValue]="16">16</option>
                <option [ngValue]="18">18</option>
                <option [ngValue]="20">20</option>
                <option [ngValue]="24">24</option>
                <option [ngValue]="28">28</option>
              </select>
            </div>

            <div class="runs-list">
              <div *ngFor="let run of getRuns(); let i = index" class="run-item">
                <div class="run-header">
                  <span class="run-num">{{ i + 1 }}</span>
                  <div class="run-arrows">
                    <button (click)="moveUp(i)" [disabled]="i === 0">↑</button>
                    <button (click)="moveDown(i)" [disabled]="i === getRuns().length - 1">↓</button>
                  </div>
                </div>
                <textarea
                  [(ngModel)]="run.text"
                  (focus)="selectedLine = i"
                  placeholder="Digite o texto..."
                  rows="2"
                  class="run-text"
                  [style.fontWeight]="run.bold ? 'bold' : 'normal'"
                  [style.fontStyle]="run.italic ? 'italic' : 'normal'"
                  [style.textDecoration]="run.underline ? 'underline' : 'none'"
                  [style.color]="run.color || '#eee'"
                  [style.fontSize.px]="run.fontSize || 14"
                ></textarea>
              </div>
            </div>
          </div>

          <!-- Painel: Estilo -->
          <div class="style-panel" *ngIf="activeArea === 'style'">
            <label>Cor de Fundo</label>
            <input type="color" [(ngModel)]="data.backgroundColor" class="cpicker" />

            <label>Cor da Borda</label>
            <input type="color" [(ngModel)]="data.borderColor" class="cpicker" />

            <label>Espessura da Borda</label>
            <input type="range" min="0" max="6" [(ngModel)]="data.borderWidth" class="slider" />
            <span class="slider-val">{{ data.borderWidth }}px</span>

            <label>Arredondamento</label>
            <input type="range" min="0" max="20" [(ngModel)]="data.borderRadius" class="slider" />
            <span class="slider-val">{{ data.borderRadius }}px</span>

            <div class="preset-grid">
              <div class="preset" style="background:#2c3e50" (click)="data.backgroundColor='#2c3e50'">Azul</div>
              <div class="preset" style="background:#34495e" (click)="data.backgroundColor='#34495e'">Cinza</div>
              <div class="preset" style="background:#8e44ad" (click)="data.backgroundColor='#8e44ad'">Roxo</div>
              <div class="preset" style="background:#27ae60" (click)="data.backgroundColor='#27ae60'">Verde</div>
              <div class="preset" style="background:#c0392b" (click)="data.backgroundColor='#c0392b'">Vermelho</div>
              <div class="preset" style="background:#f39c12;color:#333" (click)="data.backgroundColor='#f39c12'">Laranja</div>
              <div class="preset" style="background:#1a1a2e" (click)="data.backgroundColor='#1a1a2e'">Preto</div>
              <div class="preset" style="background:#ecf0f1;color:#333" (click)="data.backgroundColor='#ecf0f1'">Branco</div>
            </div>
          </div>

        </div>

        <div class="editor-footer">
          <button class="btn-secondary" (click)="close()">Cancelar</button>
          <button class="btn-primary" (click)="confirm()">Inserir no Canvas</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7);
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }
    .overlay.visible { display: flex; }

    .editor-dialog {
      background: #16213e;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 12px;
      width: 680px;
      max-width: 90vw;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 16px 48px rgba(0,0,0,0.5);
    }

    .editor-header { padding: 14px 20px 6px; border-bottom: 1px solid rgba(255,255,255,0.08); }
    .editor-header h2 { margin: 0; color: #e94560; font-size: 17px; }
    .subtitle { color: #888; font-size: 12px; margin: 4px 0 0; }

    .editor-body { padding: 10px 20px; overflow-y: auto; flex: 1; }
    .editor-footer { padding: 10px 20px; display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid rgba(255,255,255,0.08); }

    /* Live preview */
    .live-preview {
      border: 2px solid rgba(255,255,255,0.2);
      border-radius: 8px;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      margin-bottom: 10px;
      overflow: hidden;
    }
    .area { padding: 8px 12px; }
    .area-top { border-bottom: 1px solid rgba(255,255,255,0.08); text-align: center; }
    .area-bottom { border-top: 1px solid rgba(255,255,255,0.08); text-align: center; }
    .rich-line { padding: 1px 0; }

    /* Area tabs */
    .area-tabs { display: flex; gap: 2px; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 3px; }
    .tab {
      background: transparent; color: #888; border: none; padding: 5px 12px;
      border-radius: 4px 4px 0 0; cursor: pointer; font-size: 12px; transition: all 0.15s;
    }
    .tab:hover { color: #eee; background: rgba(255,255,255,0.05); }
    .tab.active { color: #e94560; background: rgba(233,69,96,0.1); border-bottom: 2px solid #e94560; }

    /* Toolbar */
    .toolbar {
      display: flex; align-items: center; gap: 3px; padding: 4px 0;
      border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 6px; flex-wrap: wrap;
    }
    .toolbar button {
      padding: 3px 8px; border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.05); color: #ddd; border-radius: 3px;
      cursor: pointer; font-size: 12px; transition: all 0.15s;
    }
    .toolbar button:hover { background: rgba(255,255,255,0.12); }
    .toolbar button.active { background: rgba(233,69,96,0.25); border-color: #e94560; color: #e94560; }
    .toolbar button:disabled { opacity: 0.4; cursor: not-allowed; }
    .tb-sep { width: 1px; height: 18px; background: rgba(255,255,255,0.15); margin: 0 3px; }
    .color-btn { width: 28px; height: 24px; border: 1px solid rgba(255,255,255,0.2); border-radius: 3px; cursor: pointer; background: transparent; padding: 0; }
    .size-select {
      background: rgba(255,255,255,0.08); color: #ddd; border: 1px solid rgba(255,255,255,0.15);
      border-radius: 3px; padding: 2px 4px; font-size: 12px; cursor: pointer;
    }

    /* Runs list */
    .runs-list { max-height: 180px; overflow-y: auto; }
    .run-item {
      background: rgba(255,255,255,0.04); border-radius: 5px; padding: 6px 8px;
      margin-bottom: 5px; border: 1px solid rgba(255,255,255,0.06);
    }
    .run-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 3px; }
    .run-num { font-size: 10px; color: #666; font-weight: bold; }
    .run-arrows button {
      padding: 0 5px; border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05); color: #aaa; border-radius: 3px; cursor: pointer; font-size: 10px;
    }
    .run-arrows button:disabled { opacity: 0.3; cursor: not-allowed; }
    .run-arrows button:hover:not(:disabled) { background: rgba(255,255,255,0.1); }
    .run-text {
      width: 100%; padding: 5px 8px; border: 1px solid rgba(255,255,255,0.1);
      border-radius: 4px; background: rgba(255,255,255,0.06); color: #eee;
      font-size: 13px; resize: vertical; box-sizing: border-box; font-family: inherit;
    }
    .run-text:focus { outline: none; border-color: #e94560; }

    /* Style panel */
    .style-panel { padding: 4px 0; }
    .style-panel label { display: block; color: #aaa; font-size: 12px; margin: 8px 0 3px; }
    .cpicker { width: 50px; height: 30px; border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; cursor: pointer; background: transparent; }
    .slider { width: 150px; vertical-align: middle; cursor: pointer; }
    .slider-val { color: #aaa; font-size: 12px; margin-left: 6px; }
    .preset-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 4px; margin-top: 6px; }
    .preset { padding: 6px 4px; text-align: center; border-radius: 4px; cursor: pointer; font-size: 10px; color: #fff; border: 1px solid rgba(255,255,255,0.1); transition: transform 0.15s; }
    .preset:hover { transform: scale(1.05); }

    /* Buttons */
    .btn-primary { background: #e94560; color: #fff; border: none; padding: 7px 18px; border-radius: 4px; cursor: pointer; font-size: 13px; }
    .btn-primary:hover { background: #d63851; }
    .btn-secondary { background: rgba(255,255,255,0.1); color: #ccc; border: 1px solid rgba(255,255,255,0.2); padding: 7px 18px; border-radius: 4px; cursor: pointer; font-size: 13px; }
    .btn-secondary:hover { background: rgba(255,255,255,0.2); }

    /* Scrollbar */
    .editor-body::-webkit-scrollbar, .runs-list::-webkit-scrollbar { width: 4px; }
    .editor-body::-webkit-scrollbar-track, .runs-list::-webkit-scrollbar-track { background: transparent; }
    .editor-body::-webkit-scrollbar-thumb, .runs-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
  `]
})
export class SpecialCardEditorComponent implements OnInit {
  visible = false;
  activeArea: AreaKey | 'style' = 'top';
  selectedLine = 0;
  currentColor = '#ffffff';
  currentFontSize = 14;

  data!: SpecialCardData;

  constructor(
    private editorService: RichTextEditorService,
    private flowchartService: FlowchartService
  ) {
    this.data = this.editorService.createDefaultCardData();
  }

  ngOnInit(): void {
    window.addEventListener('open-special-card-editor', () => this.open());
  }

  open(): void {
    this.data = this.editorService.createDefaultCardData();
    this.visible = true;
    this.activeArea = 'top';
    this.selectedLine = 0;
    this.currentColor = '#ffffff';
    this.currentFontSize = 14;
  }

  close(): void {
    this.visible = false;
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('overlay')) {
      this.close();
    }
  }

  getRuns(): RichTextRun[] {
    if (this.activeArea === 'style') return [];
    return this.data.areas[this.activeArea as AreaKey];
  }

  isFormatActive(format: 'bold' | 'italic' | 'underline'): boolean {
    const runs = this.getRuns();
    if (!runs.length || this.selectedLine >= runs.length) return false;
    return !!runs[this.selectedLine][format];
  }

  toggleFormat(format: 'bold' | 'italic' | 'underline'): void {
    const runs = this.getRuns();
    if (!runs.length || this.selectedLine >= runs.length) return;

    let result: { runs: RichTextRun[]; cursorPos: number };
    if (format === 'bold') result = this.editorService.insertBold(runs, this.selectedLine);
    else if (format === 'italic') result = this.editorService.insertItalic(runs, this.selectedLine);
    else result = this.editorService.insertUnderline(runs, this.selectedLine);

    const key = this.activeArea as AreaKey;
    this.data.areas[key] = result.runs;
  }

  applyBullet(): void {
    const runs = this.getRuns();
    if (!runs.length || this.selectedLine >= runs.length) return;
    const result = this.editorService.insertBulletList(runs, this.selectedLine);
    const key = this.activeArea as AreaKey;
    this.data.areas[key] = result.runs;
  }

  applyNumbered(): void {
    const runs = this.getRuns();
    if (!runs.length || this.selectedLine >= runs.length) return;
    const result = this.editorService.insertNumberedList(runs, this.selectedLine);
    const key = this.activeArea as AreaKey;
    this.data.areas[key] = result.runs;
  }

  addLine(): void {
    const key = this.activeArea as AreaKey;
    this.data.areas[key].push({
      text: '',
      bold: false,
      italic: false,
      underline: false,
      color: this.currentColor,
      fontSize: this.currentFontSize
    });
    this.selectedLine = this.data.areas[key].length - 1;
  }

  removeLine(): void {
    const key = this.activeArea as AreaKey;
    const runs = this.data.areas[key];
    if (runs.length <= 1) return;
    runs.splice(this.selectedLine, 1);
    this.selectedLine = Math.min(this.selectedLine, runs.length - 1);
  }

  moveUp(index: number): void {
    if (index <= 0) return;
    const key = this.activeArea as AreaKey;
    const runs = this.data.areas[key];
    [runs[index], runs[index - 1]] = [runs[index - 1], runs[index]];
    this.selectedLine = index - 1;
  }

  moveDown(index: number): void {
    const key = this.activeArea as AreaKey;
    const runs = this.data.areas[key];
    if (index >= runs.length - 1) return;
    [runs[index], runs[index + 1]] = [runs[index + 1], runs[index]];
    this.selectedLine = index + 1;
  }

  confirm(): void {
    const vp = this.flowchartService.getViewport();
    const container = document.querySelector('.canvas-wrapper');
    if (!container) { this.close(); return; }

    const rect = container.getBoundingClientRect();
    const centerX = (rect.width / 2 - vp.offsetX) / vp.zoom - 160;
    const centerY = (rect.height / 2 - vp.offsetY) / vp.zoom - 120;

    const node: FlowNode = {
      id: crypto.randomUUID(),
      type: 'special-card',
      position: {
        x: Math.round(centerX / 20) * 20,
        y: Math.round(centerY / 20) * 20
      },
      size: { width: 320, height: 240 },
      text: '',
      color: this.data.backgroundColor,
      shape: 'special-card',
      fontSize: 14,
      borderRadius: this.data.borderRadius,
      borderWidth: this.data.borderWidth,
      borderColor: this.data.borderColor,
      textColor: '#ffffff',
      opacity: 1,
      specialCardData: {
        areas: {
          top: this.data.areas.top.map(r => ({ ...r })),
          middle: this.data.areas.middle.map(r => ({ ...r })),
          bottom: this.data.areas.bottom.map(r => ({ ...r }))
        },
        backgroundColor: this.data.backgroundColor,
        borderColor: this.data.borderColor,
        borderWidth: this.data.borderWidth,
        borderRadius: this.data.borderRadius
      }
    };

    this.flowchartService.addNode(node);
    this.close();
  }
}