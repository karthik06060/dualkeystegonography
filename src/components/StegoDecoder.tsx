import { useState, useRef } from 'react';
import { Unlock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ImageUpload';
import { QRScanner } from '@/components/QRScanner';
import { decodeMessageFromImage } from '@/lib/steganography';
import { decryptKeyBundleWithPin, validatePin } from '@/lib/crypto';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const StegoDecoder = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [qrData, setQrData] = useState<string>('');
  const [pin, setPin] = useState('');
  const [processing, setProcessing] = useState(false);
  const [decodedMessage, setDecodedMessage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      setDecodedMessage('');
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleQRScan = (data: string) => {
    setQrData(data);
    setDecodedMessage('');
    setError('');
  };

  const handleDecode = async () => {
    if (!imageFile || !qrData || !pin) {
      toast.error('Please provide stego image, QR code, and PIN');
      return;
    }

    if (!validatePin(pin)) {
      toast.error('PIN must be exactly 12 characters');
      return;
    }

    setProcessing(true);
    setError('');
    setDecodedMessage('');

    try {
      // Decrypt QR to get keys
      let key1: string, key2: string;
      try {
        const keys = await decryptKeyBundleWithPin(qrData, pin);
        key1 = keys.key1;
        key2 = keys.key2;
      } catch {
        setError('Incorrect PIN or QR. Cannot decrypt message.');
        setProcessing(false);
        return;
      }

      // Load and decode image
      const img = new Image();
      img.onload = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        try {
          const message = await decodeMessageFromImage(imageData, key1, key2);
          setDecodedMessage(message);
          toast.success('Message decoded successfully!');
        } catch {
          setError('Failed to decode message. The image may not contain a hidden message or keys are incorrect.');
        }
        setProcessing(false);
      };

      img.onerror = () => {
        setError('Failed to load image');
        setProcessing(false);
      };

      img.src = imagePreview;
    } catch {
      setError('Decoding failed. Please check your inputs.');
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Unlock className="w-5 h-5 text-primary" />
            Decode Message
          </CardTitle>
          <CardDescription>
            Extract hidden message from a stego image using the QR code and PIN
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="decode-image" className="text-foreground mb-2 block">
              Upload Stego Image
            </Label>
            <ImageUpload
              onImageSelect={handleImageSelect}
              preview={imagePreview}
            />
          </div>

          <div>
            <Label className="text-foreground mb-2 block">
              Scan or Upload QR Code
            </Label>
            <QRScanner onScan={handleQRScan} />
            {qrData && (
              <p className="text-xs text-primary mt-2">✓ QR code loaded successfully</p>
            )}
          </div>

          <div>
            <Label htmlFor="decode-pin" className="text-foreground mb-2 block">
              Enter 12-Character PIN
            </Label>
            <Input
              id="decode-pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter exactly 12 characters..."
              maxLength={12}
              className="bg-input border-border text-foreground font-mono"
            />
            <p className={`text-xs mt-1 ${pin.length === 12 ? 'text-primary' : 'text-muted-foreground'}`}>
              {pin.length}/12 characters
            </p>
          </div>

          {error && (
            <Alert className="bg-destructive/10 border-destructive">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-foreground">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {decodedMessage && (
            <Alert className="bg-primary/10 border-primary">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground">
                <div className="font-semibold mb-2">Decoded Message:</div>
                <div className="p-3 bg-background rounded border border-border whitespace-pre-wrap">
                  {decodedMessage}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleDecode}
            disabled={processing || !imageFile || !qrData || !validatePin(pin)}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {processing ? 'Decoding...' : 'DECODE MESSAGE'}
          </Button>
        </CardContent>
      </Card>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
