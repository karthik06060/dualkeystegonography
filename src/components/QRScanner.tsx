import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (data: string) => void;
}

export const QRScanner = ({ onScan }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [qrPreview, setQrPreview] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      scannerRef.current = new Html5Qrcode('qr-reader');
      setIsScanning(true);

      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          onScan(decodedText);
          stopScanning();
          toast.success('QR code scanned successfully!');
        },
        () => {} // Ignore scan failures
      );
    } catch (error) {
      console.error('Camera error:', error);
      toast.error('Could not access camera. Try uploading a QR image instead.');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
    }
    setIsScanning(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const scanner = new Html5Qrcode('qr-file-scanner');
      const result = await scanner.scanFile(file, true);
      
      // Show preview
      const reader = new FileReader();
      reader.onload = (ev) => setQrPreview(ev.target?.result as string);
      reader.readAsDataURL(file);

      onScan(result);
      toast.success('QR code decoded successfully!');
      await scanner.clear();
    } catch (error) {
      console.error('QR scan error:', error);
      toast.error('Could not read QR code from image');
    }
  };

  const clearQR = () => {
    setQrPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={isScanning ? stopScanning : startScanning}
          className="flex-1 border-border"
        >
          <Camera className="w-4 h-4 mr-2" />
          {isScanning ? 'Stop Camera' : 'Scan with Camera'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          className="flex-1 border-border"
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload QR Image
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {isScanning && (
        <div 
          id="qr-reader" 
          className="w-full rounded-lg overflow-hidden border border-border"
        />
      )}

      {qrPreview && (
        <div className="relative">
          <img 
            src={qrPreview} 
            alt="QR Code" 
            className="w-full max-w-xs mx-auto rounded-lg border border-primary"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearQR}
            className="absolute top-2 right-2"
          >
            <X className="w-4 h-4" />
          </Button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
            QR Loaded
          </div>
        </div>
      )}

      {/* Hidden element for file scanning */}
      <div id="qr-file-scanner" className="hidden" />
    </div>
  );
};
