import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FlowchartService } from '../../services/flowchart.service';

@Component({
  selector: 'app-image-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="overlay" [class.visible]="visible" (click)="onOverlayClick($event)">
      <div class="dialog">
        <h2><i class="fas fa-image"></i> Adicionar Imagem</h2>

        <div class="body">
          <div class="upload-area" (click)="fileInput.click()">
            <i class="fas fa-cloud-upload-alt"></i>
            <p>Arraste uma imagem aqui ou clique para selecionar</p>
            <input
              #fileInput
              type="file"
              accept="image/*"
              (change)="onFileSelected($event)"
              style="display:none"
            />
          </div>

          <div class="or-divider"><span>ou</span></div>

          <div class="url-group">
            <label>URL da Imagem:</label>
            <div class="input-row">
              <input
                type="text"
                [(ngModel)]="imageUrl"
                placeholder="https://exemplo.com/imagem.jpg"
              />
              <button class="btn-primary" (click)="addFromUrl()">Carregar</button>
            </div>
          </div>

          <div class="preview" *ngIf="previewData">
            <img [src]="previewData" alt="Preview" />
            <button class="btn-remove" (click)="clearPreview()">&times;</button>
          </div>
        </div>

        <div class="footer">
          <button class="btn-secondary" (click)="cancel()">Cancelar</button>
          <button
            class="btn-primary"
            (click)="confirm()"
            [disabled]="!previewData"
          >Inserir no Canvas</button>
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
    .dialog {
      background: #16213e;
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 12px;
      padding: 24px;
      min-width: 420px;
      max-width: 520px;
      box-shadow: 0 16px 48px rgba(0,0,0,0.5);
    }
    .dialog h2 {
      color: #e94560;
      margin-bottom: 16px;
      font-size: 18px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .body { margin-bottom: 20px; }
    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .upload-area {
      border: 2px dashed rgba(255,255,255,0.2);
      border-radius: 8px;
      padding: 30px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
    }
    .upload-area:hover { border-color: #e94560; background: rgba(233,69,96,0.05); }
    .upload-area i { font-size: 48px; color: #e94560; margin-bottom: 12px; }
    .upload-area p { color: #aaa; font-size: 14px; }
    .or-divider {
      text-align: center;
      color: #666;
      margin: 16px 0;
      font-size: 13px;
      position: relative;
    }
    .or-divider::before, .or-divider::after {
      content: '';
      display: inline-block;
      width: 80px;
      height: 1px;
      background: rgba(255,255,255,0.1);
      margin: 0 8px;
      vertical-align: middle;
    }
    .url-group label {
      display: block;
      margin-bottom: 6px;
      color: #aaa;
      font-size: 13px;
    }
    .input-row { display: flex; gap: 8px; }
    .input-row input {
      flex: 1;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.15);
      color: #eee;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 14px;
    }
    .preview {
      margin-top: 12px;
      position: relative;
      display: inline-block;
    }
    .preview img {
      max-width: 100%;
      max-height: 200px;
      border-radius: 4px;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .btn-remove {
      position: absolute;
      top: -8px;
      right: -8px;
      background: #e94560;
      color: #fff;
      border: none;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
    }
    .btn-primary {
      background: #e94560;
      color: #fff;
      border: none;
      padding: 8px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background 0.2s;
    }
    .btn-primary:disabled { background: #555; cursor: not-allowed; }
    .btn-primary:hover:not(:disabled) { background: #d63851; }
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
  `]
})
export class ImageDialogComponent implements OnInit {
  @ViewChild('fileInput') fileInputEl!: ElementRef<HTMLInputElement>;

  visible = false;
  imageUrl = '';
  previewData: string | null = null;

  constructor(private service: FlowchartService) {}

  ngOnInit(): void {
    window.addEventListener('open-image-dialog', () => {
      this.open();
    });
  }

  open(): void {
    this.visible = true;
    this.imageUrl = '';
    this.previewData = null;
  }

  close(): void {
    this.visible = false;
  }

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('overlay')) {
      this.close();
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewData = e.target?.result as string;
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  addFromUrl(): void {
    if (this.imageUrl.trim()) {
      this.previewData = this.imageUrl.trim();
    }
  }

  clearPreview(): void {
    this.previewData = null;
    this.imageUrl = '';
  }

  confirm(): void {
    if (!this.previewData) return;

    const vp = this.service.getViewport();
    const container = document.querySelector('.canvas-wrapper')!;
    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;
    const worldX = (cx - vp.offsetX) / vp.zoom - 140;
    const worldY = (cy - vp.offsetY) / vp.zoom - 100;

    const node = {
      id: crypto.randomUUID(),
      type: 'image' as const,
      position: { x: worldX, y: worldY },
      size: { width: 280, height: 200 },
      text: '',
      color: '#2c3e50',
      shape: 'rounded' as const,
      fontSize: 14,
      imageData: this.previewData,
      imageUrl: this.imageUrl || undefined,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: '#ffffff44',
      textColor: '#ffffff',
      opacity: 1
    };

    this.service.addNode(node);
    this.close();
  }

  cancel(): void {
    this.close();
  }
}