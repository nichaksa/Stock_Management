import { MovementGranularPoint } from './stockCalculation';
import { TypeCompositionItem } from '../components/stock/InventoryCompositionDonut';

export interface PlantMovementComparison {
  plant: string;
  grQty: number;
  giQty: number;
  grValue: number;
  giValue: number;
}

/**
 * Returns formatted date string YYYY-MM-DD for file naming.
 */
export function getExportDateStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Inlines computed styles from original SVG elements into a cloned SVG tree.
 * This guarantees that when SVG is exported to PNG/SVG/Print, all fonts,
 * stroke colors, fill colors, opacity, and alignments remain 100% faithful.
 */
function createInlinedSvgClone(sourceSvg: SVGSVGElement): SVGSVGElement {
  const clone = sourceSvg.cloneNode(true) as SVGSVGElement;

  const sourceElements = Array.from(sourceSvg.querySelectorAll('*'));
  const cloneElements = Array.from(clone.querySelectorAll('*'));

  // Relevant SVG presentation properties to inline
  const styleProps = [
    'fill',
    'stroke',
    'stroke-width',
    'stroke-dasharray',
    'stroke-linecap',
    'stroke-linejoin',
    'opacity',
    'font-family',
    'font-size',
    'font-weight',
    'font-style',
    'text-anchor',
    'dominant-baseline',
    'letter-spacing',
  ];

  for (let i = 0; i < sourceElements.length; i++) {
    const srcEl = sourceElements[i] as HTMLElement | SVGElement;
    const destEl = cloneElements[i] as HTMLElement | SVGElement;
    if (!srcEl || !destEl) continue;

    const computed = window.getComputedStyle(srcEl);
    styleProps.forEach((prop) => {
      const val = computed.getPropertyValue(prop);
      if (val && val !== 'none' && val !== 'auto' && val !== 'normal') {
        destEl.style.setProperty(prop, val);
      }
    });

    // Ensure text color defaults to legible dark if transparent or inherited
    if (srcEl.tagName.toLowerCase() === 'text') {
      const fill = computed.getPropertyValue('fill');
      if (!fill || fill === 'none' || fill === 'rgba(0, 0, 0, 0)') {
        destEl.style.fill = '#334155';
      }
    }
  }

  // Set explicit XML namespace
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  return clone;
}

/**
 * Extracts legend items text and colors if present in the chart container.
 */
function extractLegendItems(containerElement: HTMLElement): Array<{ name: string; color: string }> {
  const legendItems: Array<{ name: string; color: string }> = [];
  const legendWrapper = containerElement.querySelector('.recharts-legend-wrapper');
  if (legendWrapper) {
    const items = legendWrapper.querySelectorAll('.recharts-legend-item');
    items.forEach((item) => {
      const text = item.textContent?.trim() || '';
      // Find color from icon or circle
      const svgIcon = item.querySelector('svg path, svg circle, svg line');
      const iconComputed = svgIcon ? window.getComputedStyle(svgIcon) : null;
      const color = iconComputed?.getPropertyValue('fill') || iconComputed?.getPropertyValue('stroke') || '#2563EB';
      if (text) {
        legendItems.push({ name: text, color });
      }
    });
  }
  return legendItems;
}

export interface ChartExportOptions {
  title: string;
  subtitle?: string;
  filenamePrefix?: string;
  filename?: string;
}

/**
 * Exports chart as a razor-sharp high-DPI (2x) PNG image including Title, Subtitle,
 * Chart graphic, Axes, and Legend.
 */
export function downloadChartAsPng(
  containerElement: HTMLElement | null,
  options: ChartExportOptions | string
) {
  if (!containerElement) return;

  const config: ChartExportOptions = typeof options === 'string'
    ? { title: 'Inventory Chart', filename: options }
    : options;

  const svgElement = containerElement.querySelector('svg');
  if (!svgElement) {
    alert('Chart graphic not found for export.');
    return;
  }

  try {
    const dateStamp = getExportDateStamp();
    const finalFilename = config.filename || `${config.filenamePrefix || 'chart'}_${dateStamp}.png`;

    const inlinedSvg = createInlinedSvgClone(svgElement);
    const bbox = svgElement.getBoundingClientRect();
    const svgWidth = Math.max(600, bbox.width || 700);
    const svgHeight = Math.max(300, bbox.height || 350);

    inlinedSvg.setAttribute('width', String(svgWidth));
    inlinedSvg.setAttribute('height', String(svgHeight));

    const svgData = new XMLSerializer().serializeToString(inlinedSvg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const headerHeight = config.subtitle ? 80 : 60;
      const legendItems = extractLegendItems(containerElement);
      const footerHeight = legendItems.length > 0 ? 45 : 25;

      const totalWidth = svgWidth + 60; // 30px padding on each side
      const totalHeight = headerHeight + svgHeight + footerHeight;

      const scale = 2; // 2x high-resolution retina scale
      const canvas = document.createElement('canvas');
      canvas.width = totalWidth * scale;
      canvas.height = totalHeight * scale;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Enable high quality rendering
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.scale(scale, scale);

      // 1. Draw Clean White Background
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, totalWidth, totalHeight);

      // Subtle top accent bar
      ctx.fillStyle = '#2563EB';
      ctx.fillRect(0, 0, totalWidth, 4);

      // 2. Render Chart Title & Subtitle Header
      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(config.title, 30, 20);

      if (config.subtitle) {
        ctx.fillStyle = '#64748B';
        ctx.font = 'normal 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillText(config.subtitle, 30, 44);
      }

      // Metadata export stamp on top-right
      ctx.fillStyle = '#94A3B8';
      ctx.font = '500 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Exported: ${dateStamp}`, totalWidth - 30, 20);

      // 3. Draw Chart SVG Graphic
      ctx.drawImage(image, 30, headerHeight, svgWidth, svgHeight);

      // 4. Draw Legend items at bottom if any
      if (legendItems.length > 0) {
        let currentX = 30;
        const legendY = headerHeight + svgHeight + 15;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        legendItems.forEach((item) => {
          // Color dot
          ctx.beginPath();
          ctx.arc(currentX + 5, legendY, 5, 0, Math.PI * 2);
          ctx.fillStyle = item.color;
          ctx.fill();

          // Text
          ctx.fillStyle = '#334155';
          ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.fillText(item.name, currentX + 15, legendY);

          currentX += ctx.measureText(item.name).width + 35;
        });
      }

      // 5. Trigger download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = finalFilename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(pngUrl);
        URL.revokeObjectURL(blobURL);
      }, 'image/png');
    };

    image.src = blobURL;
  } catch (err) {
    console.error('Failed to export PNG:', err);
  }
}

/**
 * Exports chart as a standalone SVG file with inlined styles and header metadata.
 */
export function downloadChartAsSvg(
  containerElement: HTMLElement | null,
  options: ChartExportOptions | string
) {
  if (!containerElement) return;

  const config: ChartExportOptions = typeof options === 'string'
    ? { title: 'Inventory Chart', filename: options }
    : options;

  const svgElement = containerElement.querySelector('svg');
  if (!svgElement) {
    alert('Chart graphic not found for export.');
    return;
  }

  try {
    const dateStamp = getExportDateStamp();
    const finalFilename = config.filename || `${config.filenamePrefix || 'chart'}_${dateStamp}.svg`;

    const inlinedSvg = createInlinedSvgClone(svgElement);
    const bbox = svgElement.getBoundingClientRect();
    const width = Math.max(600, bbox.width || 700);
    const height = Math.max(300, bbox.height || 350);

    const fullSvgWrapper = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    fullSvgWrapper.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    fullSvgWrapper.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    fullSvgWrapper.setAttribute('width', String(width + 40));
    fullSvgWrapper.setAttribute('height', String(height + 80));
    fullSvgWrapper.setAttribute('viewBox', `0 0 ${width + 40} ${height + 80}`);
    fullSvgWrapper.setAttribute('style', 'background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;');

    // Background rect
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', '#ffffff');
    fullSvgWrapper.appendChild(bgRect);

    // Title text
    const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleEl.setAttribute('x', '20');
    titleEl.setAttribute('y', '30');
    titleEl.setAttribute('fill', '#0f172a');
    titleEl.setAttribute('font-size', '16');
    titleEl.setAttribute('font-weight', 'bold');
    titleEl.textContent = config.title;
    fullSvgWrapper.appendChild(titleEl);

    // Subtitle text
    if (config.subtitle) {
      const subtitleEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      subtitleEl.setAttribute('x', '20');
      subtitleEl.setAttribute('y', '48');
      subtitleEl.setAttribute('fill', '#64748b');
      subtitleEl.setAttribute('font-size', '12');
      subtitleEl.textContent = `${config.subtitle} • Exported: ${dateStamp}`;
      fullSvgWrapper.appendChild(subtitleEl);
    }

    // Embed inlined SVG inside a <g>
    const gEl = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gEl.setAttribute('transform', 'translate(20, 60)');
    while (inlinedSvg.firstChild) {
      gEl.appendChild(inlinedSvg.firstChild);
    }
    fullSvgWrapper.appendChild(gEl);

    const svgData = new XMLSerializer().serializeToString(fullSvgWrapper);
    const svgBlob = new Blob(['<?xml version="1.0" standalone="no"?>\r\n', svgData], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const svgUrl = URL.createObjectURL(svgBlob);

    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = finalFilename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  } catch (err) {
    console.error('Failed to export SVG:', err);
  }
}

/**
 * Triggers clean native print dialog specifically for the chart using a hidden
 * temporary iframe. Eliminates about:blank and blank window issues completely.
 */
export function printChartElement(
  containerElement: HTMLElement | null,
  options: { title: string; subtitle?: string } | string
) {
  if (!containerElement) return;

  const config = typeof options === 'string'
    ? { title: options }
    : options;

  const svgElement = containerElement.querySelector('svg');
  if (!svgElement) {
    alert('Chart graphic not found to print.');
    return;
  }

  const dateStamp = getExportDateStamp();
  const inlinedSvg = createInlinedSvgClone(svgElement);
  const legendItems = extractLegendItems(containerElement);

  // Build clean legend HTML
  let legendHtml = '';
  if (legendItems.length > 0) {
    legendHtml = `
      <div style="display: flex; justify-content: center; gap: 24px; margin-top: 20px; flex-wrap: wrap;">
        ${legendItems
          .map(
            (item) => `
          <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; color: #334155; font-weight: 500;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background-color: ${item.color}; display: inline-block;"></span>
            <span>${item.name}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  // Create hidden iframe
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    document.body.removeChild(iframe);
    return;
  }

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${config.title}</title>
        <style>
          @page {
            size: landscape;
            margin: 15mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            color: #0f172a;
            background: #ffffff;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 12px;
            margin-bottom: 20px;
          }
          .title {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin: 0;
          }
          .subtitle {
            font-size: 12px;
            color: #64748b;
            margin-top: 4px;
          }
          .meta {
            font-size: 11px;
            color: #94a3b8;
            text-align: right;
          }
          .chart-wrapper {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          svg {
            max-width: 100%;
            height: auto;
          }
          .footer {
            margin-top: 24px;
            text-align: center;
            font-size: 10px;
            color: #94a3b8;
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${config.title}</h1>
            ${config.subtitle ? `<div class="subtitle">${config.subtitle}</div>` : ''}
          </div>
          <div class="meta">
            <div>Zycoda Stock Management</div>
            <div>Printed: ${dateStamp}</div>
          </div>
        </div>

        <div class="chart-wrapper">
          ${inlinedSvg.outerHTML}
        </div>

        ${legendHtml}

        <div class="footer">
          Confidential - Internal Inventory Analytics Report &bull; Zycoda Enterprise
        </div>
      </body>
    </html>
  `);
  doc.close();

  // Trigger print after styles and layout calculation
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error('Print failed:', e);
    } finally {
      // Remove iframe after short delay
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }
  }, 300);
}

/**
 * Exports Movement Trend time series data points as a CSV file with UTF-8 BOM.
 */
export function downloadChartAsCsv(
  data: MovementGranularPoint[],
  isPriceMode: boolean,
  filename?: string
) {
  if (!data || data.length === 0) {
    alert('No chart data points available to export.');
    return;
  }

  const dateStamp = getExportDateStamp();
  const finalFilename = filename || `goods_movement_trend_${isPriceMode ? 'value' : 'qty'}_${dateStamp}.csv`;

  const headers = isPriceMode
    ? ['Period', 'Goods Receipt Value (THB)', 'Goods Issue Value (THB)', 'Net Movement (THB)']
    : ['Period', 'Goods Receipt Qty', 'Goods Issue Qty', 'Net Movement (Units)'];

  const rows = data.map((item) => {
    if (isPriceMode) {
      return [
        `"${item.periodLabel}"`,
        item.grValue,
        item.giValue,
        item.netValue,
      ];
    }
    return [
      `"${item.periodLabel}"`,
      item.grQty,
      item.giQty,
      item.netQty,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports Plant/FL movement comparison data points as a CSV file with UTF-8 BOM.
 */
export function downloadPlantMovementCsv(
  data: PlantMovementComparison[],
  isPriceMode: boolean,
  filename?: string
) {
  if (!data || data.length === 0) {
    alert('No chart data points available to export.');
    return;
  }

  const dateStamp = getExportDateStamp();
  const finalFilename = filename || `goods_movement_by_fl_${isPriceMode ? 'value' : 'qty'}_${dateStamp}.csv`;

  const headers = isPriceMode
    ? ['Plant (FL)', 'Goods Receipt Value (THB)', 'Goods Issue Value (THB)', 'Net Delta (THB)']
    : ['Plant (FL)', 'Goods Receipt Qty', 'Goods Issue Qty', 'Net Delta (Units)'];

  const rows = data.map((item) => {
    if (isPriceMode) {
      return [
        `"${item.plant}"`,
        item.grValue,
        item.giValue,
        item.grValue - item.giValue,
      ];
    }
    return [
      `"${item.plant}"`,
      item.grQty,
      item.giQty,
      item.grQty - item.giQty,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports Material Type composition breakdown as a CSV file with UTF-8 BOM.
 */
export function downloadCompositionCsv(
  data: TypeCompositionItem[],
  isPriceMode: boolean,
  filename?: string
) {
  if (!data || data.length === 0) {
    alert('No composition data points available to export.');
    return;
  }

  const dateStamp = getExportDateStamp();
  const finalFilename = filename || `inventory_composition_by_type_${isPriceMode ? 'value' : 'qty'}_${dateStamp}.csv`;

  const totalQty = data.reduce((acc, curr) => acc + curr.quantity, 0);
  const totalVal = data.reduce((acc, curr) => acc + curr.value, 0);

  const headers = [
    'Material Type',
    'SKU Items Count',
    'Physical Quantity (Units)',
    'Valuation (THB)',
    'Share (%)',
  ];

  const rows = data.map((item) => {
    const share = isPriceMode
      ? totalVal > 0 ? ((item.value / totalVal) * 100).toFixed(2) : '0'
      : totalQty > 0 ? ((item.quantity / totalQty) * 100).toFixed(2) : '0';

    return [
      `"${item.name}"`,
      item.itemCount,
      item.quantity,
      item.value,
      `${share}%`,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = finalFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
