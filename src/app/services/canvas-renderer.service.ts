import { Injectable } from '@angular/core';
import { FlowNode, Connection, Position } from '../types';

@Injectable({ providedIn: 'root' })
export class CanvasRendererService {

  drawGrid(ctx: CanvasRenderingContext2D, viewport: { offsetX: number; offsetY: number; zoom: number }, canvasWidth: number, canvasHeight: number): void {
    const gridSize = 30;
    const startX = -(viewport.offsetX / viewport.zoom) % gridSize;
    const startY = -(viewport.offsetY / viewport.zoom) % gridSize;
    const visWidth = canvasWidth / viewport.zoom;
    const visHeight = canvasHeight / viewport.zoom;

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let x = startX; x < visWidth; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, visHeight);
    }
    for (let y = startY; y < visHeight; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(visWidth, y);
    }
    ctx.stroke();
  }

  drawNode(ctx: CanvasRenderingContext2D, node: FlowNode, selected: boolean): void {
    const { x, y } = node.position;
    const { width, height } = node.size;
    const cx = x + width / 2;
    const cy = y + height / 2;

    ctx.save();
    if (node.rotation) {
      ctx.translate(cx, cy);
      ctx.rotate((node.rotation * Math.PI) / 180);
      ctx.translate(-cx, -cy);
    }

    ctx.shadowColor = selected ? 'rgba(233,69,96,0.5)' : 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = selected ? 15 : 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = node.color || '#4A90D9';
    ctx.globalAlpha = node.opacity ?? 1;
    ctx.strokeStyle = selected ? '#e94560' : (node.borderColor || '#ffffff33');
    ctx.lineWidth = selected ? 3 : (node.borderWidth || 2);

    this.drawShape(ctx, node.shape || 'rounded', x, y, width, height, node.borderRadius || 10);

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawShape(ctx: CanvasRenderingContext2D, shape: string, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    switch (shape) {
      case 'rectangle':
        ctx.rect(x, y, w, h);
        break;
      case 'rounded':
        this.roundRect(ctx, x, y, w, h, r);
        break;
      case 'circle':
        const cx = x + w / 2;
        const cy = y + h / 2;
        const radius = Math.min(w, h) / 2;
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        break;
      case 'diamond':
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h / 2);
        ctx.lineTo(x + w / 2, y + h);
        ctx.lineTo(x, y + h / 2);
        ctx.closePath();
        break;
      case 'parallelogram':
        const skew = w * 0.2;
        ctx.moveTo(x + skew, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w - skew, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        break;
      case 'document':
        ctx.moveTo(x, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w, y + h * 0.85);
        ctx.quadraticCurveTo(x + w * 0.75, y + h, x + w * 0.5, y + h * 0.85);
        ctx.quadraticCurveTo(x + w * 0.25, y + h * 0.7, x, y + h * 0.85);
        ctx.closePath();
        break;
      case 'hexagon':
        const hx = w * 0.25;
        ctx.moveTo(x + hx, y);
        ctx.lineTo(x + w - hx, y);
        ctx.lineTo(x + w, y + h / 2);
        ctx.lineTo(x + w - hx, y + h);
        ctx.lineTo(x + hx, y + h);
        ctx.lineTo(x, y + h / 2);
        ctx.closePath();
        break;
      default:
        this.roundRect(ctx, x, y, w, h, r);
    }
    ctx.fill();
    ctx.stroke();
  }

  roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  drawImageOnNode(ctx: CanvasRenderingContext2D, node: FlowNode): void {
    if (!node.imageData) return;
    const img = new Image();
    img.src = node.imageData;
    const { x, y } = node.position;
    const { width, height } = node.size;

    ctx.save();
    // Clip apenas com 1px de margem para a borda aparecer
    ctx.beginPath();
    this.drawShape(ctx, node.shape || 'rounded', x + 1, y + 1, width - 2, height - 2, Math.max(2, (node.borderRadius || 10) - 1));
    ctx.clip();

    // Cover fill: preenche todo o espaço, cortando excesso
    const imgAspect = img.naturalWidth / img.naturalHeight;
    const boxAspect = (width - 2) / (height - 2);
    const bx = x + 1;
    const by = y + 1;
    const bw = width - 2;
    const bh = height - 2;

    let drawW: number, drawH: number, drawX: number, drawY: number;

    if (imgAspect > boxAspect) {
      // Image is wider than box -> fill by height
      drawH = bh;
      drawW = bh * imgAspect;
      drawX = bx - (drawW - bw) / 2;
      drawY = by;
    } else {
      // Image is taller -> fill by width
      drawW = bw;
      drawH = bw / imgAspect;
      drawX = bx;
      drawY = by - (drawH - bh) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();
  }

  drawNodeText(ctx: CanvasRenderingContext2D, node: FlowNode): void {
    if (!node.text) return;
    const { x, y } = node.position;
    const { width, height } = node.size;

    ctx.save();

    if (node.type === 'image' && node.imageData) {
      // Overlay semi-transparente no rodapé
      const overlayH = 28;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.beginPath();
      ctx.roundRect(x, y + height - overlayH, width, overlayH, [0, 0, (node.borderRadius || 10), (node.borderRadius || 10)]);
      ctx.fill();
      const textY = y + height - overlayH / 2;
      ctx.fillStyle = node.textColor || '#fff';
      ctx.font = `bold ${node.fontSize || 12}px 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.text, x + width / 2, textY);
    } else {
      // Nó normal - texto centralizado
      ctx.fillStyle = node.textColor || '#fff';
      ctx.font = `${node.fontSize || 14}px 'Segoe UI', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const maxWidth = width - 16;
      const lines = this.wrapText(node.text, maxWidth, ctx);
      const lineHeight = (node.fontSize || 14) + 4;
      const startY = y + height / 2 - (lines.length - 1) * lineHeight / 2;
      lines.forEach((line, i) => {
        ctx.fillText(line, x + width / 2, startY + i * lineHeight);
      });
    }

    ctx.restore();
  }

  wrapText(text: string, maxWidth: number, ctx: CanvasRenderingContext2D): string[] {
    const words = text.split('\n');
    const lines: string[] = [];
    words.forEach(word => {
      let line = '';
      for (let i = 0; i < word.length; i++) {
        const testLine = line + word[i];
        if (ctx.measureText(testLine).width > maxWidth && line) {
          lines.push(line);
          line = word[i];
        } else {
          line = testLine;
        }
      }
      if (line) lines.push(line);
    });
    return lines.length ? lines : [''];
  }

  drawConnection(ctx: CanvasRenderingContext2D, conn: Connection, nodes: FlowNode[], selectedConnId: string | null): void {
    const source = nodes.find(n => n.id === conn.sourceId);
    const target = nodes.find(n => n.id === conn.targetId);
    if (!source || !target) return;

    const isSelected = conn.id === selectedConnId;
    const start = this.getConnectionPoint(source, target.position);
    const end = this.getConnectionPoint(target, source.position);

    ctx.save();
    ctx.strokeStyle = isSelected ? '#e94560' : (conn.color || '#666');
    ctx.lineWidth = isSelected ? (conn.strokeWidth + 2) : (conn.strokeWidth || 2);
    ctx.globalAlpha = 0.8;

    if (conn.style === 'dashed') {
      ctx.setLineDash([8, 4]);
    } else if (conn.style === 'dotted') {
      ctx.setLineDash([3, 3]);
    }

    const cpx1 = start.x + (end.x - start.x) * 0.4;
    const cpy1 = start.y;
    const cpx2 = start.x + (end.x - start.x) * 0.6;
    const cpy2 = end.y;

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (conn.endArrow) {
      this.drawArrowhead(ctx, end, { x: cpx2, y: cpy2 }, conn.color || '#666', isSelected);
    }
    if (conn.startArrow) {
      this.drawArrowhead(ctx, start, { x: cpx1, y: cpy1 }, conn.color || '#666', isSelected);
    }

    if (conn.label) {
      const labelPos = {
        x: (start.x + end.x) / 2 + (cpx2 - cpx1) * 0.3,
        y: (start.y + end.y) / 2 - 12
      };
      ctx.fillStyle = '#e94560';
      ctx.font = '12px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(conn.label, labelPos.x, labelPos.y);
    }

    ctx.restore();
  }

  drawArrowhead(ctx: CanvasRenderingContext2D, tip: Position, from: Position, color: string, selected: boolean): void {
    const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
    const size = selected ? 14 : 10;

    ctx.save();
    ctx.fillStyle = selected ? '#e94560' : color;
    ctx.translate(tip.x, tip.y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size / 2.5);
    ctx.lineTo(-size, size / 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  getConnectionPoint(node: FlowNode, targetPos: Position): Position {
    const cx = node.position.x + node.size.width / 2;
    const cy = node.position.y + node.size.height / 2;
    const dx = targetPos.x - cx;
    const dy = targetPos.y - cy;
    const angle = Math.atan2(dy, dx);

    const hw = node.size.width / 2;
    const hh = node.size.height / 2;

    const t = Math.min(
      Math.abs(hw / (Math.cos(angle) || 0.001)),
      Math.abs(hh / (Math.sin(angle) || 0.001))
    );

    return {
      x: cx + Math.cos(angle) * Math.abs(t),
      y: cy + Math.sin(angle) * Math.abs(t)
    };
  }
}