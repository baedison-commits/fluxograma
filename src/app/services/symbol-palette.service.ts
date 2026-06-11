import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FlowNode, NodeShape, Position, SpecialCardData } from '../types';

export interface PaletteSymbol {
  id: string;
  name: string;
  description: string;
  shape: NodeShape;
  color: string;
  defaultWidth: number;
  defaultHeight: number;
  fontSize: number;
  icon: string;
  defaultText: string;
  category: 'process' | 'decision' | 'terminator' | 'data' | 'document' | 'predefined' | 'special';
}

@Injectable({ providedIn: 'root' })
export class SymbolPaletteService {
  private symbols = new BehaviorSubject<PaletteSymbol[]>(this.getDefaultSymbols());
  private isOpen = new BehaviorSubject<boolean>(true);

  symbols$: Observable<PaletteSymbol[]> = this.symbols.asObservable();
  isOpen$: Observable<boolean> = this.isOpen.asObservable();

  getSymbols(): PaletteSymbol[] { return this.symbols.value; }
  isPaletteOpen(): boolean { return this.isOpen.value; }
  togglePalette(): void { this.isOpen.next(!this.isOpen.value); }
  openPalette(): void { this.isOpen.next(true); }
  closePalette(): void { this.isOpen.next(false); }

  createNodeFromSymbol(symbol: PaletteSymbol, position: Position, text?: string): FlowNode {
    return {
      id: crypto.randomUUID(),
      type: 'node',
      position,
      size: { width: symbol.defaultWidth, height: symbol.defaultHeight },
      text: text || symbol.defaultText,
      color: symbol.color,
      shape: symbol.shape,
      fontSize: symbol.fontSize,
      borderRadius: symbol.shape === 'rounded' ? 10 : (symbol.shape === 'circle' ? 50 : 4),
      borderWidth: 2,
      borderColor: '#ffffff44',
      textColor: '#ffffff',
      opacity: 1
    };
  }

  createImageNodeFromSymbol(symbol: PaletteSymbol, position: Position, imageData: string): FlowNode {
    return {
      id: crypto.randomUUID(),
      type: 'image',
      position,
      size: { width: symbol.defaultWidth, height: symbol.defaultHeight },
      text: symbol.defaultText,
      color: symbol.color,
      shape: symbol.shape,
      fontSize: symbol.fontSize,
      imageData,
      borderRadius: symbol.shape === 'rounded' ? 10 : (symbol.shape === 'circle' ? 50 : 4),
      borderWidth: 2,
      borderColor: '#ffffff44',
      textColor: '#ffffff',
      opacity: 1
    };
  }

  createSpecialCardNode(position: Position, cardData: SpecialCardData): FlowNode {
    return {
      id: crypto.randomUUID(),
      type: 'special-card',
      position,
      size: { width: 320, height: 240 },
      text: cardData.headerText,
      color: cardData.backgroundColor,
      shape: 'special-card',
      fontSize: 14,
      borderRadius: 8,
      borderWidth: 2,
      borderColor: '#ffffff44',
      textColor: '#ffffff',
      opacity: 1,
      specialCardData: { ...cardData }
    };
  }

  private getDefaultSymbols(): PaletteSymbol[] {
    return [
      {
        id: 'process',
        name: 'Processo',
        description: 'Ação ou operação',
        shape: 'rounded',
        color: '#4A90D9',
        defaultWidth: 160,
        defaultHeight: 80,
        fontSize: 14,
        defaultText: 'Novo Processo',
        icon: '⬡',
        category: 'process'
      },
      {
        id: 'decision',
        name: 'Decisão',
        description: 'Pergunta ou condição',
        shape: 'diamond',
        color: '#E67E22',
        defaultWidth: 140,
        defaultHeight: 120,
        fontSize: 13,
        defaultText: 'Condição?',
        icon: '◇',
        category: 'decision'
      },
      {
        id: 'terminator',
        name: 'Terminal',
        description: 'Início ou fim',
        shape: 'rounded',
        color: '#27AE60',
        defaultWidth: 140,
        defaultHeight: 60,
        fontSize: 14,
        defaultText: 'Início',
        icon: '⬭',
        category: 'terminator'
      },
      {
        id: 'data',
        name: 'Dado',
        description: 'Entrada/saída de dados',
        shape: 'parallelogram',
        color: '#8E44AD',
        defaultWidth: 160,
        defaultHeight: 70,
        fontSize: 13,
        defaultText: 'Ler Dados',
        icon: '▱',
        category: 'data'
      },
      {
        id: 'document',
        name: 'Documento',
        description: 'Documento ou relatório',
        shape: 'document',
        color: '#D35400',
        defaultWidth: 140,
        defaultHeight: 100,
        fontSize: 13,
        defaultText: 'Relatório',
        icon: '📄',
        category: 'document'
      },
      {
        id: 'predefined',
        name: 'Processo Predefinido',
        description: 'Sub-processo ou módulo',
        shape: 'rectangle',
        color: '#2980B9',
        defaultWidth: 170,
        defaultHeight: 70,
        fontSize: 13,
        defaultText: 'Chamar Módulo',
        icon: '▢',
        category: 'predefined'
      },
      {
        id: 'circle',
        name: 'Conector',
        description: 'Ponto de conexão',
        shape: 'circle',
        color: '#1ABC9C',
        defaultWidth: 60,
        defaultHeight: 60,
        fontSize: 12,
        defaultText: 'A',
        icon: '○',
        category: 'process'
      },
      {
        id: 'hexagon',
        name: 'Preparação',
        description: 'Preparação ou inicialização',
        shape: 'hexagon',
        color: '#F39C12',
        defaultWidth: 150,
        defaultHeight: 90,
        fontSize: 13,
        defaultText: 'Inicializar',
        icon: '⬡',
        category: 'process'
      },
      {
        id: 'special-card',
        name: 'Card Especial',
        description: 'Card com cabeçalho, corpo editável e rodapé',
        shape: 'special-card',
        color: '#2c3e50',
        defaultWidth: 320,
        defaultHeight: 240,
        fontSize: 14,
        defaultText: 'Meu Card',
        icon: '📇',
        category: 'special'
      }
    ];
  }
}