import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Printer, Copy, Check } from 'lucide-react';
import { Modal } from '../common/Modal';
import { useToast } from '../../context/ToastContext';

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  materialCode: string;
  description: string;
  plant: string;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({
  isOpen,
  onClose,
  materialCode,
  description,
  plant,
}) => {
  const qrRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const qrValue = `MATERIAL:${materialCode}`;

  const handleCopyPayload = () => {
    navigator.clipboard.writeText(qrValue);
    setCopied(true);
    addToast('QR payload copied to clipboard', 'info');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svgElement = qrRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 300;
      canvas.height = 300;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 300, 300);
        ctx.drawImage(img, 25, 25, 250, 250);
      }
      const pngFile = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.download = `QR_${materialCode}_${plant}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
      addToast(`QR Code for ${materialCode} downloaded`, 'success');
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print QR - ${materialCode}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            .card { border: 2px solid #000; padding: 20px; max-width: 320px; margin: 0 auto; border-radius: 10px; }
            h2 { margin: 10px 0 4px 0; font-size: 18px; font-family: monospace; }
            p { margin: 4px 0; font-size: 12px; color: #555; }
            .plant { font-weight: bold; font-size: 13px; color: #000; margin-top: 8px; }
          </style>
        </head>
        <body>
          <div class="card">
            ${qrRef.current?.innerHTML || ''}
            <h2>${materialCode}</h2>
            <p>${description}</p>
            <div class="plant">Plant: ${plant}</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Material QR Code"
      subtitle="Digital optical identification tag"
      maxWidthClass="max-w-sm"
      footer={
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            onClick={handleCopyPayload}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-app-secondary dark:text-app-darkSecondary hover:text-app-text rounded-lg border border-app-border dark:border-app-darkBorder"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-gr" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-app-border dark:border-app-darkBorder text-app-text dark:text-app-darkText hover:bg-app-bg"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-semibold text-white bg-brand-blue hover:bg-brand-hoverBlue rounded-lg shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center justify-center p-2 text-center">
        <div
          ref={qrRef}
          className="p-4 bg-white rounded-2xl border border-app-border shadow-sm flex items-center justify-center mb-3"
        >
          <QRCodeSVG
            value={qrValue}
            size={180}
            level="H"
            includeMargin={true}
          />
        </div>

        <div className="space-y-1">
          <span className="inline-block px-2 py-0.5 rounded bg-brand-softBlue text-brand-blue text-xs font-mono font-bold tracking-wider">
            {materialCode}
          </span>
          <p className="text-xs text-app-text dark:text-app-darkText font-medium line-clamp-2 px-2">
            {description}
          </p>
          <p className="text-[11px] text-app-muted dark:text-app-darkMuted font-mono">
            Payload: {qrValue}
          </p>
        </div>
      </div>
    </Modal>
  );
};
