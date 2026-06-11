import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SymbolPaletteService, PaletteSymbol } from '../../services/symbol-palette.service';
import { FlowchartService } from '../../services/flowchart.service';
import { Position } from '../../types';

interface PromptState {
  visible: boolean;
  symbol: PaletteSymbol | null;
  mode: 'text' | 'image' | null;
  text: string;
  imageData: string | null;
}

@Component({
  selector: 'app-symbol-palette',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="palette-container" [class.collapsed]="!isOpen">
      <div class="palette-header" (click)="toggle()">
        <span class="toggle-icon">{{ isOpen ? '‹' : '›' }}</span>
        <span class="title" *ngIf="!isOpen">S</span>
        <span class="title-text" *ngIf="isOpen">Símbolos</span>
      </div>

      <div class="palette-body" *ngIf="isOpen">

        <div class="category-title">Processos</div>
        <div
          *ngFor="let sym of getByCategory('process')"
          class="symbol-item"
          [title]="sym.description"
        >
          <div class="symbol-icon" [style.background]="sym.color"
            (click)="addSymbol(sym)" (contextmenu)="addSymbolWithImage($event, sym)">
            <svg viewBox="0 0 16 12" class="icon-svg">
              <rect x="0.5" y="0.5" width="15" height="11" rx="2" fill="rgba(255,255,255,0.9)" />
            </svg>
          </div>
          <span class="symbol-name">{{ sym.name }}</span>
        </div>

        <div class="category-divider"></div>

        <div class="category-title">Decisões</div>
        <div
          *ngFor="let sym of getByCategory('decision')"
          class="symbol-item"
          [title]="sym.description"
        >
          <div class="symbol-icon" [style.background]="sym.color"
            (click)="addSymbol(sym)" (contextmenu)="addSymbolWithImage($event, sym)">
            <svg viewBox="0 0 16 14" class="icon-svg">
              <polygon points="8,1 15,7 8,13 1,7" fill="rgba(255,255,255,0.9)" />
            </svg>
          </div>
          <span class="symbol-name">{{ sym.name }}</span>
        </div>

        <div class="category-divider"></div>

        <div class="category-title">Dados</div>
        <div
          *ngFor="let sym of getByCategory('data')"
          class="symbol-item"
          [title]="sym.description"
        >
          <div class="symbol-icon" [style.background]="sym.color"
            (click)="addSymbol(sym)" (contextmenu)="addSymbolWithImage($event, sym)">
            <svg viewBox="0 0 16 10" class="icon-svg">
              <polygon points="3,1 15,1 13,9 1,9" fill="rgba(255,255,255,0.9)" />
            </svg>
          </div>
          <span class="symbol-name">{{ sym.name }}</span>
        </div>

        <div class="category-divider"></div>

        <div class="category-title">Outros</div>
        <div
          *ngFor="let sym of getByCategory('terminator', 'document', 'predefined', 'special')"
          class="symbol-item"
          [title]="sym.description"
        >
          <div class="symbol-icon" [style.background]="sym.color"
            (click)="addSymbol(sym)" (contextmenu)="addSymbolWithImage($event, sym)">
            <svg *ngIf="sym.id === 'terminator'" viewBox="0 0 18 10" class="icon-svg">
              <rect x="0.5" y="0.5" width="17" height="9" rx="4.5" fill="rgba(255,255,255,0.9)" />
            </svg>
            <svg *ngIf="sym.id === 'document'" viewBox="0 0 14 14" class="icon-svg">
              <path d="M1,1 L13,1 L13,11 Q10,13 7,11 Q4,9 1,11 Z" fill="rgba(255,255,255,0.9)" />
            </svg>
            <svg *ngIf="sym.id === 'predefined'" viewBox="0 0 16 10" class="icon-svg">
              <rect x="0.5" y="0.5" width="15" height="9" rx="1" fill="rgba(255,255,255,0.9)" />
              <line x1="0.5" y1="4" x2="15.5" y2="4" stroke="rgba(0,0,0,0.15)" stroke-width="0.5" />
            </svg>
            <svg *ngIf="sym.id === 'circle'" viewBox="0 0 16 16" class="icon-svg">
              <circle cx="8" cy="8" r="7" fill="rgba(255,255,255,0.9)" />
            </svg>
            <svg *ngIf="sym.id === 'hexagon'" viewBox="0 0 16 12" class="icon-svg">
              <polygon points="5,1 11,1 15,6 11,11 5,11 1,6" fill="rgba(255,255,255,0.9)" />
            </svg>
            <!-- Card Especial -->
            <span *ngIf="sym.id === 'special-card'" style="font-size:14px;line-height:1">📇</span>
          </div>
          <span class="symbol-name">{{ sym.name }}</span>
        </div>

        <div class="palette-hint">
          <small>Clique ➔ texto  |  Clique direito ➔ imagem</small>
        </div>
      </div>

      <!-- Prompt: Texto -->
      <div class="prompt-overlay" *ngIf="prompt.visible && prompt.mode === 'text'" (click)="closePrompt()">
        <div class="prompt-dialog" (click)="$event.stopPropagation()">
          <h4>✏️ Editar Texto</h4>
          <p>Digite o texto para <strong>{{ prompt.symbol?.name }}</strong>:</p>
          <input
            type="text"
            [(ngModel)]="prompt.text"
            placeholder="Digite o texto..."
            (keydown.enter)="confirmPrompt()"
            autofocus
          />
          <div class="prompt-actions">
            <button class="btn-cancel" (click)="closePrompt()">Cancelar</button>
            <button class="btn-ok" (click)="confirmPrompt()">Inserir</button>
          </div>
        </div>
      </div>

      <!-- Prompt: Imagem -->
      <div class="prompt-overlay" *ngIf="prompt.visible && prompt.mode === 'image'" (click)="closePrompt()">
        <div class="prompt-dialog" (click)="$event.stopPropagation()">
          <h4>🖼️ Inserir Imagem</h4>
          <p>Selecione uma imagem para <strong>{{ prompt.symbol?.name }}</strong>:</p>

          <div class="image-upload-area" (click)="fileInput.click()">
            <span class="upload-icon">📁</span>
            <span>Clique para selecionar</span>
          </div>
          <input #fileInput type="file" accept="image/*" (change)="onFileSelected($event)" style="display:none" />

          <div class="url-row">
            <input type="text" [(ngModel)]="imageUrl" placeholder="Ou cole uma URL..." />
            <button class="btn-ok" (click)="addImageFromUrl()">OK</button>
          </div>

          <div class="prompt-preview" *ngIf="prompt.imageData">
            <img [src]="prompt.imageData" alt="preview" />
          </div>

          <div class="prompt-actions">
            <button class="btn-cancel" (click)="closePrompt()">Cancelar</button>
            <button class="btn-ok" (click)="confirmImagePrompt()" [disabled]="!prompt.imageData">Inserir</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .palette-container {
      position: absolute;
      top: 66px;
      left: 8px;
      z-index: 110;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      max-height: calc(100vh - 80px);
      overflow-y: auto;
      overflow-x: hidden;
      transition: width 0.25s ease;
      box-shadow: 0 4px 20px rgba(0,0,0,0.12);
      display: flex;
      flex-direction: column;
    }
    .palette-container.collapsed { width: 32px; min-width: 32px; }
    .palette-container:not(.collapsed) { width: 148px; min-width: 148px; }

    .palette-header {
      padding: 8px 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;
      user-select: none;
      border-bottom: 1px solid #eee;
      flex-shrink: 0;
      background: #fafafa;
      border-radius: 8px 8px 0 0;
    }
    .palette-header:hover { background: #f0f0f0; }
    .toggle-icon { font-size: 14px; color: #e94560; font-weight: bold; min-width: 14px; text-align: center; }
    .title-text { font-size: 12px; font-weight: 600; color: #333; letter-spacing: 0.3px; }
    .title { font-size: 11px; color: #999; font-weight: 600; }

    .palette-body { padding: 4px 0; overflow-y: auto; flex: 1; }
    .category-title { font-size: 9px; color: #999; text-transform: uppercase; letter-spacing: 0.8px; padding: 6px 8px 2px; font-weight: 600; }
    .category-divider { height: 1px; background: #eee; margin: 2px 8px; }

    .symbol-item {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 5px 8px;
      transition: background 0.15s;
      border-left: 2px solid transparent;
    }
    .symbol-item:hover { background: #fff5f5; border-left-color: #e94560; }

    .symbol-icon {
      width: 22px;
      height: 18px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      cursor: pointer;
    }
    .symbol-icon:hover { opacity: 0.85; }
    .icon-svg { width: 14px; height: 12px; }

    .symbol-name { font-size: 11px; color: #444; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .palette-hint { text-align: center; padding: 6px 4px; border-top: 1px solid #eee; }
    .palette-hint small { color: #aaa; font-size: 9px; }

    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #ccc; border-radius: 2px; }

    /* Prompt overlay */
    .prompt-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2000;
    }
    .prompt-dialog {
      background: #16213e;
      border: 1px solid rgba(255,255,255,0.15);
      border-radius: 10px;
      padding: 20px;
      min-width: 320px;
      max-width: 400px;
      box-shadow: 0 12px 40px rgba(0,0,0,0.5);
    }
    .prompt-dialog h4 { color: #e94560; margin: 0 0 8px; font-size: 16px; }
    .prompt-dialog p { color: #ccc; font-size: 13px; margin: 0 0 12px; }
    .prompt-dialog input[type="text"] {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 4px;
      background: rgba(255,255,255,0.08);
      color: #eee;
      font-size: 14px;
      box-sizing: border-box;
    }
    .prompt-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 12px;
    }
    .btn-cancel {
      background: rgba(255,255,255,0.1);
      color: #aaa;
      border: 1px solid rgba(255,255,255,0.15);
      padding: 6px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    .btn-cancel:hover { background: rgba(255,255,255,0.2); }
    .btn-ok {
      background: #e94560;
      color: #fff;
      border: none;
      padding: 6px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    .btn-ok:disabled { background: #555; cursor: not-allowed; }
    .btn-ok:hover:not(:disabled) { background: #d63851; }

    .image-upload-area {
      border: 2px dashed rgba(255,255,255,0.2);
      border-radius: 6px;
      padding: 16px;
      text-align: center;
      cursor: pointer;
      margin-bottom: 8px;
    }
    .image-upload-area:hover { border-color: #e94560; }
    .upload-icon { font-size: 24px; display: block; margin-bottom: 4px; }
    .image-upload-area span { color: #aaa; font-size: 13px; }

    .url-row { display: flex; gap: 6px; margin-bottom: 8px; }
    .url-row input {
      flex: 1;
      padding: 6px 8px;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 4px;
      background: rgba(255,255,255,0.08);
      color: #eee;
      font-size: 13px;
    }

    .prompt-preview { margin-top: 8px; }
    .prompt-preview img {
      max-width: 100%;
      max-height: 120px;
      border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.1);
    }
  `]
})
export class SymbolPaletteComponent implements OnInit {
  @Output() openImageDialog = new EventEmitter<{ symbol: PaletteSymbol }>();

  isOpen = true;
  imageUrl = '';
  prompt: PromptState = {
    visible: false,
    symbol: null,
    mode: null,
    text: '',
    imageData: null
  };

  constructor(
    private paletteService: SymbolPaletteService,
    private flowchartService: FlowchartService
  ) {}

  ngOnInit(): void {
    this.paletteService.isOpen$.subscribe(open => this.isOpen = open);
  }

  toggle(): void {
    this.paletteService.togglePalette();
  }

  getByCategory(...categories: string[]): PaletteSymbol[] {
    return this.paletteService.getSymbols().filter(s => categories.includes(s.category));
  }

  addSymbol(symbol: PaletteSymbol): void {
    // Special card opens its own editor
    if (symbol.id === 'special-card') {
      window.dispatchEvent(new CustomEvent('open-special-card-editor'));
      return;
    }

    this.prompt.visible = true;
    this.prompt.symbol = symbol;
    this.prompt.mode = 'text';
    this.prompt.text = symbol.defaultText;
    this.prompt.imageData = null;
    this.imageUrl = '';
  }

  addSymbolWithImage(event: MouseEvent, symbol: PaletteSymbol): void {
    event.preventDefault();

    // Special card opens its own editor
    if (symbol.id === 'special-card') {
      window.dispatchEvent(new CustomEvent('open-special-card-editor'));
      return;
    }
    this.prompt.visible = true;
    this.prompt.symbol = symbol;
    this.prompt.mode = 'image';
    this.prompt.text = '';
    this.prompt.imageData = null;
    this.imageUrl = '';
  }

  closePrompt(): void {
    this.prompt.visible = false;
    this.prompt.symbol = null;
    this.prompt.mode = null;
    this.prompt.text = '';
    this.prompt.imageData = null;
    this.imageUrl = '';
  }

  confirmPrompt(): void {
    if (!this.prompt.symbol) return;
    const pos = this.getCenterPosition(this.prompt.symbol);
    const node = this.paletteService.createNodeFromSymbol(this.prompt.symbol, pos, this.prompt.text);
    this.flowchartService.addNode(node);
    this.closePrompt();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.prompt.imageData = e.target?.result as string;
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  addImageFromUrl(): void {
    if (this.imageUrl.trim()) {
      this.prompt.imageData = this.imageUrl.trim();
    }
  }

  confirmImagePrompt(): void {
    if (!this.prompt.symbol || !this.prompt.imageData) return;
    const pos = this.getCenterPosition(this.prompt.symbol);
    const node = this.paletteService.createImageNodeFromSymbol(this.prompt.symbol, pos, this.prompt.imageData);
    this.flowchartService.addNode(node);
    this.closePrompt();
  }

  private getCenterPosition(symbol: PaletteSymbol): Position {
    const vp = this.flowchartService.getViewport();
    const container = document.querySelector('.canvas-wrapper');
    if (!container) return { x: 100, y: 100 };

    const rect = container.getBoundingClientRect();
    const centerX = (rect.width / 2 - vp.offsetX) / vp.zoom - symbol.defaultWidth / 2;
    const centerY = (rect.height / 2 - vp.offsetY) / vp.zoom - symbol.defaultHeight / 2;

    return {
      x: Math.round(centerX / 20) * 20,
      y: Math.round(centerY / 20) * 20
    };
  }
}