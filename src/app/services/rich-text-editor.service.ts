import { Injectable } from '@angular/core';
import { RichTextRun, SpecialCardData } from '../types';

@Injectable({ providedIn: 'root' })
export class RichTextEditorService {

  createDefaultCardData(): SpecialCardData {
    return {
      headerText: 'Meu Card',
      headerAlign: 'center',
      bodyRuns: [{ text: 'Digite seu texto aqui...', bold: false, italic: false, underline: false }],
      bodyType: 'paragraph',
      footerText: 'Rodapé',
      footerAlign: 'center',
      backgroundColor: '#2c3e50',
      headerColor: '#e94560',
      footerColor: '#95a5a6'
    };
  }

  insertBold(runs: RichTextRun[], cursorPos: number): { runs: RichTextRun[]; cursorPos: number } {
    return this.toggleFormat(runs, cursorPos, 'bold');
  }

  insertItalic(runs: RichTextRun[], cursorPos: number): { runs: RichTextRun[]; cursorPos: number } {
    return this.toggleFormat(runs, cursorPos, 'italic');
  }

  insertUnderline(runs: RichTextRun[], cursorPos: number): { runs: RichTextRun[]; cursorPos: number } {
    return this.toggleFormat(runs, cursorPos, 'underline');
  }

  insertBulletList(runs: RichTextRun[], cursorPos: number): { runs: RichTextRun[]; cursorPos: number } {
    // Add bullet prefix to text
    const updated = [...runs];
    if (updated.length > 0 && cursorPos < updated.length) {
      const run = { ...updated[cursorPos] };
      if (!run.text.startsWith('• ')) {
        run.text = '• ' + run.text;
      } else {
        run.text = run.text.replace(/^• /, '');
      }
      updated[cursorPos] = run;
    }
    return { runs: updated, cursorPos };
  }

  insertNumberedList(runs: RichTextRun[], cursorPos: number): { runs: RichTextRun[]; cursorPos: number } {
    const updated = [...runs];
    if (updated.length > 0 && cursorPos < updated.length) {
      const run = { ...updated[cursorPos] };
      if (!/^\d+\.\s/.test(run.text)) {
        run.text = `${cursorPos + 1}. ${run.text}`;
      } else {
        run.text = run.text.replace(/^\d+\.\s/, '');
      }
      updated[cursorPos] = run;
    }
    return { runs: updated, cursorPos };
  }

  splitRun(runs: RichTextRun[], index: number, splitAt: number): RichTextRun[] {
    if (index < 0 || index >= runs.length) return runs;
    const run = runs[index];
    if (splitAt <= 0 || splitAt >= run.text.length) return runs;

    const before: RichTextRun = { ...run, text: run.text.substring(0, splitAt) };
    const after: RichTextRun = { ...run, text: run.text.substring(splitAt) };

    return [...runs.slice(0, index), before, after, ...runs.slice(index + 1)];
  }

  mergeRunsIfPossible(runs: RichTextRun[]): RichTextRun[] {
    if (runs.length <= 1) return runs;
    const merged: RichTextRun[] = [];
    for (const run of runs) {
      const last = merged[merged.length - 1];
      if (last &&
          last.bold === run.bold &&
          last.italic === run.italic &&
          last.underline === run.underline &&
          last.color === run.color &&
          last.fontSize === run.fontSize) {
        last.text += run.text;
      } else {
        merged.push({ ...run });
      }
    }
    return merged;
  }

  private toggleFormat(runs: RichTextRun[], cursorPos: number, format: 'bold' | 'italic' | 'underline'): { runs: RichTextRun[]; cursorPos: number } {
    const updated = [...runs];
    if (updated.length > 0 && cursorPos < updated.length) {
      const run = { ...updated[cursorPos] };
      run[format] = !run[format];
      updated[cursorPos] = run;
    }
    return { runs: this.mergeRunsIfPossible(updated), cursorPos };
  }

  // HTML conversion for rendering
  runsToHtml(runs: RichTextRun[]): string {
    return runs.map(run => {
      let text = this.escapeHtml(run.text);
      if (run.bold) text = `<strong>${text}</strong>`;
      if (run.italic) text = `<em>${text}</em>`;
      if (run.underline) text = `<u>${text}</u>`;
      if (run.color) text = `<span style="color:${run.color}">${text}</span>`;
      if (run.fontSize) text = `<span style="font-size:${run.fontSize}px">${text}</span>`;
      return text;
    }).join('');
  }

  htmlToRuns(html: string): RichTextRun[] {
    // Simple parser for basic tags
    const runs: RichTextRun[] = [];
    const regex = /<\/?(strong|em|u|span)[^>]*>/g;
    let lastIndex = 0;
    let match;
    let currentRun: RichTextRun = { text: '', bold: false, italic: false, underline: false };

    const parts = html.split(regex);
    // Simplified: just return plain text
    const div = document.createElement('div');
    div.innerHTML = html;
    runs.push({ text: div.textContent || '', bold: false, italic: false, underline: false });
    return runs;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}