import { Component, HostListener, ViewChild } from '@angular/core';
import { ToolbarComponent } from './components/toolbar/toolbar.component';
import { CanvasComponent } from './components/canvas/canvas.component';
import { PropertiesPanelComponent } from './components/properties-panel/properties-panel.component';
import { ImageDialogComponent } from './components/dialogs/image-dialog.component';
import { MinimapComponent } from './components/minimap/minimap.component';
import { SymbolPaletteComponent } from './components/symbol-palette/symbol-palette.component';
import { SpecialCardEditorComponent } from './components/special-card/special-card-editor.component';
import { FlowchartService } from './services/flowchart.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    ToolbarComponent,
    CanvasComponent,
    PropertiesPanelComponent,
    ImageDialogComponent,
    MinimapComponent,
    SymbolPaletteComponent,
    SpecialCardEditorComponent
  ],
  template: `
    <div class="app-container" (keydown)="onKeydown($event)" tabindex="0">
      <app-toolbar (openImage)="openImageDialog()"></app-toolbar>
      <div class="main-area">
        <app-symbol-palette></app-symbol-palette>
        <app-canvas class="canvas-area"></app-canvas>
        <app-properties-panel></app-properties-panel>
        <app-minimap></app-minimap>
      </div>
      <app-image-dialog #imageDialog></app-image-dialog>
      <app-special-card-editor></app-special-card-editor>
    </div>
  `,
  styles: [`
    .app-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      outline: none;
      background: #1a1a2e;
    }
    .main-area {
      flex: 1;
      position: relative;
      overflow: hidden;
    }
    .canvas-area {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
    }
  `]
})
export class AppComponent {
  @ViewChild('imageDialog') imageDialog!: ImageDialogComponent;

  title = 'Fluxograma Pro';

  constructor(private service: FlowchartService) {}

  openImageDialog(): void {
    this.service.setActiveTool('image');
    this.imageDialog?.open();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const ctrl = event.ctrlKey || event.metaKey;

    switch (event.key.toLowerCase()) {
      case 'v':
        if (!ctrl) this.service.setActiveTool('select');
        break;
      case 'm':
        if (!ctrl) this.service.setActiveTool('move');
        break;
      case 'n':
        if (!ctrl) this.service.setActiveTool('node');
        break;
      case 'i':
        if (!ctrl) {
          this.openImageDialog();
        }
        break;
      case 'a':
        if (!ctrl) this.service.setActiveTool('arrow');
        break;
      case 'delete':
      case 'backspace':
        if (!ctrl) this.service.removeSelected();
        break;
      case 'd':
        if (ctrl) { event.preventDefault(); this.service.duplicateSelected(); }
        break;
      case 'z':
        if (ctrl && !event.shiftKey) { event.preventDefault(); this.service.undo(); }
        break;
      case 'y':
        if (ctrl) { event.preventDefault(); this.service.redo(); }
        break;
      case 's':
        if (ctrl) { event.preventDefault(); this.service.saveToFile(); }
        break;
      case 'c':
        if (ctrl) { event.preventDefault(); this.service.copySelected(); }
        break;
      case 'p':
        if (ctrl) { event.preventDefault(); window.print(); }
        break;
    }
  }
}
