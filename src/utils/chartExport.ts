import { MovementGranularPoint } from './stockCalculation';

/**
 * Exports chart SVG element as a high-resolution PNG image.
 */
export function downloadChartAsPng(containerElement: HTMLElement | null, filename: string = 'goods_movement_trend.png') {
  if (!containerElement) return;

  const svgElement = containerElement.querySelector('svg');
  if (!svgElement) {
    alert('Chart SVG element not found.');
    return;
  }

  try {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const bbox = svgElement.getBoundingClientRect();
      const canvas = document.createElement('canvas');
      const scale = 2; // High DPI 2x
      canvas.width = Math.max(800, bbox.width) * scale;
      canvas.height = Math.max(400, bbox.height) * scale;

      const context = canvas.getContext('2d');
      if (!context) return;

      context.fillStyle = '#FFFFFF';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.scale(scale, scale);
      context.drawImage(image, 0, 0, bbox.width || 800, bbox.height || 400);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = filename;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(blobURL);
    };

    image.src = blobURL;
  } catch (err) {
    console.error('Failed to export PNG:', err);
  }
}

/**
 * Exports chart SVG directly as an SVG file.
 */
export function downloadChartAsSvg(containerElement: HTMLElement | null, filename: string = 'goods_movement_trend.svg') {
  if (!containerElement) return;

  const svgElement = containerElement.querySelector('svg');
  if (!svgElement) {
    alert('Chart SVG element not found.');
    return;
  }

  try {
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    const downloadLink = document.createElement('a');
    downloadLink.href = svgUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(svgUrl);
  } catch (err) {
    console.error('Failed to export SVG:', err);
  }
}

/**
 * Exports chart time series data points as a CSV file.
 */
export function downloadChartAsCsv(
  data: MovementGranularPoint[],
  isPriceMode: boolean,
  filename: string = 'goods_movement_trend.csv'
) {
  if (!data || data.length === 0) {
    alert('No chart data points available to export.');
    return;
  }

  const headers = isPriceMode
    ? ['Period', 'Goods Receipt Value (THB)', 'Goods Issue Value (THB)', 'Net Value (THB)']
    : ['Period', 'Goods Receipt Qty', 'Goods Issue Qty', 'Net Qty'];

  const rows = data.map(item => {
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

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers clean print view for the chart.
 */
export function printChartElement(containerElement: HTMLElement | null, chartTitle: string = 'Goods Movement Trend') {
  if (!containerElement) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  const chartHtml = containerElement.innerHTML;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${chartTitle}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 24px; text-align: center; }
          h2 { margin-bottom: 20px; color: #1e293b; }
          .chart-container { width: 100%; max-width: 900px; margin: 0 auto; }
          svg { width: 100% !important; height: auto !important; }
        </style>
      </head>
      <body>
        <h2>${chartTitle}</h2>
        <div class="chart-container">
          ${chartHtml}
        </div>
        <script>
          window.onload = function() {
            window.print();
            window.close();
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}
