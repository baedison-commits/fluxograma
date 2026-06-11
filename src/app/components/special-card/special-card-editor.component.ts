import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlowchartService } from '../../services/flowchart.service';
import { RichTextEditorService } from '../../services/rich-text-editor.service';
import { RichTextRun, SpecialCardData, FlowNode } from '../../types';

@Component({
  selector: 'app-special-card-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="overlay" [class.visible]="visible" (click)="onOverlayClick($event)">
      <div class="editor-dialog" (click)="$event.stopPropagation()">
        <div class="editor-header">
          <h2>📇 Editor de Card Especial</h2>
          <p class="subtitle">Personalize cabeçalho, corpo e rodapé com formatação rica</p>
        </div>

        <div class="editor-body">

          <!-- Preview ao vivo -->
          <div class="live-preview" [style.background]="data.backgroundColor">
            <div class="preview-header" [style.color]="data.headerColor" [style.textAlign]="data.headerAlign">
              {{ data.headerText || 'Cabeçalho' }}
            </div>
            <div class="preview-body">
              <div *ngFor="let run of data.bodyRuns; let i = index"
                   [style.fontWeight]="run.bold ? 'bold' : 'normal'"
                   [style.fontStyle]="run.italic ? 'italic' : 'normal'"
                   [style.textDecoration]="run.underline ? 'underline' : 'none'"
                   [style.color]="run.color || '#fff'"
                   [style.fontSize.px]="run.fontSize || 14">
                {{ run.text }}
              </div>
            </div>
            <div class="preview-footer" [style.color]="data.footerColor" [style.textAlign]="data.footerAlign">
              {{ data.footerText || 'Rodapé' }}
            </div>
          </div>

          <!-- Abas de edição -->
          <div class="edit-tabs">
            <button class="tab" [class.active]="activeTab === 'header'" (click)="activeTab = 'header'">Cabeçalho</button>
            <button class="tab" [class.active]="activeTab === 'body'" (click)="activeTab = 'body'">Corpo</button>
            <button class="tab" [class.active]="activeTab === 'footer'" (click)="activeTab = 'footer'">Rodapé</button>
            <button class="tab" [class.active]="activeTab === 'style'" (click)="activeTab = 'style'">Estilo</button>
          </div>

          <!-- Painel: Cabeçalho -->
          <div class="edit-panel" *ngIf="activeTab === 'header'">
            <label>Texto do Cabeçalho</label>
            <input type="text" [(ngModel)]="data.headerText" placeholder="Digite o título..." class="text-input" />

            <label>Alinhamento</label>
            <div class="align-buttons">
              <button [class.active]="data.headerAlign === 'left'" (click)="data.headerAlign = 'left'">⬅️</button>
              <button [class.active]="data.headerAlign === 'center'" (click)="data.headerAlign = 'center'">⬅️➡️</button>
              <button [class.active]="data.headerAlign === 'right'" (click)="data.headerAlign = 'right'">➡️</button>
            </div>

            <label>Cor do Texto</label>
            <input type="color" [(ngModel)]="data.headerColor" class="color-picker" />
          </div>

          <!-- Painel: Corpo (editor rico) -->
          <div class="edit-panel" *ngIf="activeTab === 'body'">
            <div class="toolbar">
              <button [class.active]="isFormatActive('bold', bodyCursor)" (click)="toggleBold()" title="Negrito"><b>B</b></button>
              <button [class.active]="isFormatActive('italic', bodyCursor)" (click)="toggleItalic()" title="Itálico"><i>I</i></button>
              <button [class.active]="isFormatActive('underline', bodyCursor)" (click)="toggleUnderline()" title="Sublinhado"><u>S</u></button>
              <span class="toolbar-sep"></span>
              <button (click)="addBulletList()" title="Lista">• Lista</button>
              <button (click)="addNumberedList()" title="Lista numerada">1. Lista</button>
              <span class="toolbar-sep"></span>
              <button (click)="addRun()" title="Adicionar linha">➕ Linha</button>
              <button (click)="removeRun()" [disabled]="data.bodyRuns.length <= 1" title="Remover linha">➖</button>
            </div>

            <div class="body-editor">
              <div *ngFor="let run of data.bodyRuns; let i = index" class="run-item">
                <div class="run-header">
                  <span class="run-number">{{ i + 1 }}</span>
                  <div class="run-controls">
                    <button (click)="moveRunUp(i)" [disabled]="i === 0" title="Mover para cima">↑</button>
                    <button (click)="moveRunDown(i)" [disabled]="i === data.bodyRuns.length - 1" title="Mover para baixo">↓</button>
                  </div>
                </div>
                <textarea
                  [(ngModel)]="data.bodyRuns[i].text"
                  (focus)="bodyCursor = i"
                  placeholder="Digite o texto..."
                  rows="2"
                  class="run-textarea"
                  [style.fontWeight]="run.bold ? 'bold' : 'normal'"
                  [style.fontStyle]="run.italic ? 'italic' : 'normal'"
                  [style.textDecoration]="run.underline ? 'underline' : 'none'"
                ></textarea>
                <div class="run-format-options">
                  <label class="format-label">
                    <input type="checkbox" [(ngModel)]="data.bodyRuns[i].bold" /> <b>B</b>
                  </label>
                  <label class="format-label">
                    <input type="checkbox" [(ngModel)]="data.bodyRuns[i].italic" /> <i>I</i>
                  </label>
                  <label class="format-label">
                    <input type="checkbox" [(ngModel)]="data.bodyRuns[i].underline" /> <u>S</u>
                  </label>
                  <label class="format-label">
                    Cor: <input type="color" [(ngModel)]="data.bodyRuns[i].color" style="width:30px;height:20px;border:none;cursor:pointer" />
                  </label>
                  <label class="format-label">
                    Tamanho:
                    <select [(ngModel)]="data.bodyRuns[i].fontSize" style="width:60px">
                      <option [ngValue]="10">10</option>
                      <option [ngValue]="12">12</option>
                      <option [ngValue]="14">14</option>
                      <option [ngValue]="16">16</option>
                      <option [ngValue]="18">18</option>
                      <option [ngValue]="20">20</option>
                      <option [ngValue]="24">24</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Painel: Rodapé -->
          <div class="edit-panel" *ngIf="activeTab === 'footer'">
            <label>Texto do Rodapé</label>
            <input type="text" [(ngModel)]="data.footerText" placeholder="Digite o rodapé..." class="text-input" />

            <label>Alinhamento</label>
            <div class="align-buttons">
              <button [class.active]="data.footerAlign === 'left'" (click)="data.footerAlign = 'left'">⬅️</button>
              <button [class.active]="data.footerAlign === 'center'" (click)="data.footerAlign = 'center'">⬅️➡️</button>
              <button [class.active]="data.footerAlign === 'right'" (click)="data.footerAlign = 'right'">➡️</button>
            </div>

            <label>Cor do Texto</label>
            <input type="color" [(ngModel)]="data.footerColor" class="color-picker" />
          </div>

          <!-- Painel: Estilo -->
          <div class="edit-panel" *ngIf="activeTab === 'style'">
            <label>Cor de Fundo do Card</label>
            <input type="color" [(ngModel)]="data.backgroundColor" class="color-picker" />

            <label>Preview do Card no Canvas</label>
            <div class="style-presets">
              <div class="preset" [style.background]="'#2c3e50'" (click)="data.backgroundColor = '#2c3e50'">Azul Escuro</div>
              <div class="preset" [style.background]="'#34495e'" (click)="data.backgroundColor = '#34495e'">Azul Cinza</div>
              <div class="preset" [style.background]="'#8e44ad'" (click)="data.backgroundColor = '#8e44ad'">Roxo</div>
              <div class="preset" [style.background]="'#27ae60'" (click)="data.backgroundColor = '#27ae60'">Verde</div>
              <div class="preset" [style.background]="'#c0392b'" (click)="data.backgroundColor = '#c0392b'">Vermelho</div>
              <div class="preset" [style.background]="'#f39c12'" (click)="data.backgroundColor = '#f39c12'">Laranja</div>
              <div class="preset" [style.background]="'#1a1a2e'" (click)="data.backgroundColor = '#1a1a2e'">Preto</div>
              <div class="preset" [style.background]="'#ecf0f1'" [style.color]="'#333'" (click)="data.backgroundColor = '#ecf0f1'">Branco</div>
            </div>
          </div>

        </div>

        <div class="editor-footer">
          <button class="btn-secondary" (click)="cancel()">Cancelar</button>
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

    .editor-header {
      padding: 16px 20px 8px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .editor-header h2 { margin: 0; color: #e94560; font-size: 18px; }
    .subtitle { color: #888; font-size: 12px; margin: 4px 0 0; }

    .editor-body {
      padding: 12px 20px;
      overflow-y: auto;
      flex: 1;
    }

    .editor-footer {
      padding: 12px 20px;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      border-top: 1px solid rgba(255,255,255,0.08);
    }

    /* Live preview */
    .live-preview {
      border-radius: 8px;
      padding: 0;
      margin-bottom: 12px;
      min-height: 100px;
      display: flex;
      flex-direction: column;
      border: 2px solid rgba(255,255,255,0.2);
      overflow: hidden;
    }
    .preview-header {
      padding: 8px 12px;
      font-weight: bold;
      font-size: 15px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .preview-body {
      padding: 12px;
      flex: 1;
    }
    .preview-footer {
      padding: 6px 12px;
      font-size: 12px;
      border-top: 1px solid rgba(255,255,255,0.1);
      font-style: italic;
    }

    /* Tabs */
    .edit-tabs {
      display: flex;
      gap: 4px;
      margin-bottom: 8px;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      padding-bottom: 4px;
    }
    .tab {
      background: transparent;
      color: #888;
      border: none;
      padding: 6px 14px;
      border-radius: 4px 4px 0 0;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.2s;
    }
    .tab:hover { color: #eee; background: rgba(255,255,255,0.05); }
    .tab.active { color: #e94560; background: rgba(233,69,96,0.1); border-bottom: 2px solid #e94560; }

    /* Edit panels */
    .edit-panel {
      padding: 4px 0;
    }
    .edit-panel label {
      display: block;
      color: #aaa;
      font-size: 12px;
      margin: 8px 0 4px;
    }
    .text-input {
      width: 100%;
      padding: 6px 10px;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 4px;
      background: rgba(255,255,255,0.08);
      color: #eee;
      font-size: 14px;
      box-sizing: border-box;
    }
    .color-picker {
      width: 50px;
      height: 32px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 4px;
      cursor: pointer;
      background: transparent;
    }
    .align-buttons {
      display: flex;
      gap: 4px;
    }
    .align-buttons button {
      padding: 4px 12px;
      border: 1px solid rgba(255,255,255,0.15);
      background: rgba(255,255,255,0.05);
      color: #ccc;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    .align-buttons button.active { background: rgba(233,69,96,0.2); border-color: #e94560; color: #e94560; }

    /* Toolbar */
    .toolbar {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 0;
      border-bottom: 1px solid rgba(255,255,255,0.08);
      margin-bottom: 6px;
      flex-wrap: wrap;
    }
    .toolbar button {
      padding: 4px 10px;
      border: 1px solid rgba(255,255,255,0.12);
      background: rgba(255,255,255,0.05);
      color: #ddd;
      border-radius: 3px;
      cursor: pointer;
      font-size: 13px;
      transition: all 0.15s;
    }
    .toolbar button:hover { background: rgba(255,255,255,0.12); }
    .toolbar button.active { background: rgba(233,69,96,0.25); border-color: #e94560; color: #e94560; }
    .toolbar button:disabled { opacity: 0.4; cursor: not-allowed; }
    .toolbar-sep {
      width: 1px;
      height: 20px;
      background: rgba(255,255,255,0.15);
      margin: 0 4px;
    }

    /* Body editor */
    .body-editor {
      max-height: 200px;
      overflow-y: auto;
    }
    .run-item {
      background: rgba(255,255,255,0.04);
      border-radius: 6px;
      padding: 8px;
      margin-bottom: 6px;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .run-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .run-number {
      font-size: 11px;
      color: #666;
      font-weight: bold;
    }
    .run-controls button {
      padding: 1px 6px;
      border: 1px solid rgba(255,255,255,0.1);
      background: rgba(255,255,255,0.05);
      color: #aaa;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    }
    .run-controls button:disabled { opacity: 0.3; cursor: not-allowed; }
    .run-controls button:hover:not(:disabled) { background: rgba(255,255,255,0.1); }

    .run-textarea {
      width: 100%;
      padding: 6px 8px;
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 4px;
      background: rgba(255,255,255,0.06);
      color: #eee;
      font-size: 13px;
      resize: vertical;
      box-sizing: border-box;
      font-family: inherit;
    }
    .run-textarea:focus { outline: none; border-color: #e94560; }

    .run-format-options {
      display: flex;
      gap: 10px;
      margin-top: 4px;
      flex-wrap: wrap;
      align-items: center;
    }
    .format-label {
      display: flex;
      align-items: center;
      gap: 3px;
      font-size: 12px;
      color: #aaa;
      cursor: pointer;
    }
    .format-label input[type="checkbox"] {
      width: 14px;
      height: 14px;
      cursor: pointer;
    }

    /* Style presets */
    .style-presets {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }
    .preset {
      padding: 8px 4px;
      text-align: center;
      border-radius: 4px;
      cursor: pointer;
      font-size: 11px;
      color: #fff;
      border: 1px solid rgba(255,255,255,0.1);
      transition: transform 0.15s;
    }
    .preset:hover { transform: scale(1.05); }

    /* Buttons */
    .btn-primary {
      background: #e94560;
      color: #fff;
      border: none;
      padding: 8px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .btn-primary:hover { background: #d63851; }
    .btn-secondary {
      background: rgba(255,255,255,0.1);
      color: #ccc;
      border: 1px solid rgba(255,255,255,0.2);
      padding: 8px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.2); }

    /* Scrollbar */
    .editor-body::-webkit-scrollbar,
    .body-editor::-webkit-scrollbar { width: 4px; }
    .editor-body::-webkit-scrollbar-track,
    .body-editor::-webkit-scrollbar-track { background: transparent; }
    .editor-body::-webkit-scrollbar-thumb,
    .body-editor::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }
  `]
})
export class SpecialCardEditorComponent implements OnInit {
  visible = false;
  activeTab: 'header' | 'body' | 'footer' | 'style' = 'header';
  bodyCursor = 0;

  data!: SpecialCardData;

  constructor(
    private editorService: RichTextEditorService,
    private flowchartService: FlowchartService
  ) {
    this.data = this.createDefault();
  }

  ngOnInit(): void {
    window.addEventListener('open-special-card-editor', () => {
      this.open();
    });
  }

  private createDefault(): SpecialCardData {
    return this.editorService.createDefaultCardData();
  }

  open(): void {
    this.data = this.createDefault();
    this.visible = true;
    this.activeTab = 'header';
    this.bodyCursor = 0;
  }

  close(): void {
    this.visible = false;
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('overlay')) {
      this.close();
    }
  }

  isFormatActive(format: 'bold' | 'italic' | 'underline', index: number): boolean {
    if (index < 0 || index >= this.data.bodyRuns.length) return false;
    return !!this.data.bodyRuns[index][format];
  }

  toggleBold(): void {
    if (this.bodyCursor < 0 || this.bodyCursor >= this.data.bodyRuns.length) return;
    const result = this.editorService.insertBold(this.data.bodyRuns, this.bodyCursor);
    this.data.bodyRuns = result.runs;
  }

  toggleItalic(): void {
    if (this.bodyCursor < 0 || this.bodyCursor >= this.data.bodyRuns.length) return;
    const result = this.editorService.insertItalic(this.data.bodyRuns, this.bodyCursor);
    this.data.bodyRuns = result.runs;
  }

  toggleUnderline(): void {
    if (this.bodyCursor < 0 || this.bodyCursor >= this.data.bodyRuns.length) return;
    const result = this.editorService.insertUnderline(this.data.bodyRuns, this.bodyCursor);
    this.data.bodyRuns = result.runs;
  }

  addBulletList(): void {
    if (this.bodyCursor < 0 || this.bodyCursor >= this.data.bodyRuns.length) return;
    const result = this.editorService.insertBulletList(this.data.bodyRuns, this.bodyCursor);
    this.data.bodyRuns = result.runs;
  }

  addNumberedList(): void {
    if (this.bodyCursor < 0 || this.bodyCursor >= this.data.bodyRuns.length) return;
    const result = this.editorService.insertNumberedList(this.data.bodyRuns, this.bodyCursor);
    this.data.bodyRuns = result.runs;
  }

  addRun(): void {
    this.data.bodyRuns.push({ text: '', bold: false, italic: false, underline: false, color: '#ffffff', fontSize: 14 });
    this.bodyCursor = this.data.bodyRuns.length - 1;
  }

  removeRun(): void {
    if (this.data.bodyRuns.length <= 1) return;
    const idx = Math.min(this.bodyCursor, this.data.bodyRuns.length - 2);
    this.data.bodyRuns.splice(this.bodyCursor, 1);
    this.bodyCursor = idx;
  }

  moveRunUp(index: number): void {
    if (index <= 0) return;
    [this.data.bodyRuns[index], this.data.bodyRuns[index - 1]] = [this.data.bodyRuns[index - 1], this.data.bodyRuns[index]];
    this.bodyCursor = index - 1;
  }

  moveRunDown(index: number): void {
    if (index >= this.data.bodyRuns.length - 1) return;
    [this.data.bodyRuns[index], this.data.bodyRuns[index + 1]] = [this.data.bodyRuns[index + 1], this.data.bodyRuns[index]];
    this.bodyCursor = index + 1;
  }

  cancel(): void {
    this.close();
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
      position: { x: Math.round(centerX / 20) * 20, y: Math.round(centerY / 20) * 20 },
      size: { width: 320, height: 240 },
      text: this.data.headerText,
      color: this.data.backgroundColor,
      shape: 'special-card',
      fontSize: 14,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: '#ffffff44',
      textColor: '#ffffff',
      opacity: 1,
      specialCardData: { ...this.data }
    };

    this.flowchartService.addNode(node);
    this.close();
  }
}