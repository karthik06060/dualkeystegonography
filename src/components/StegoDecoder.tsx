import { useState, useRef } from 'react';
import { Unlock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ImageUpload';
import { decodeMessageFromImage } from '@/lib/steganography';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const StegoDecoder = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [key1, setKey1] = useState('');
  const [key2, setKey2] = useState('');
  const [processing, setProcessing] = useState(false);
  const [decodedMessage, setDecodedMessage] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      setDecodedMessage('');
    };
    reader.readAsDataURL(file);
  };

  const handleDecode = async () => {
    if (!imageFile || !key1 || !key2) {
      toast.error('Please provide image and both keys');
      return;
    }

    setProcessing(true);

    try {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        try {
          const message = decodeMessageFromImage(imageData, key1, key2);
          setDecodedMessage(message);
          toast.success('Message decoded successfully!');
        } catch (error) {
          toast.error('Failed to decode message. Wrong keys or no message found.');
          setDecodedMessage('');
        }
        setProcessing(false);
      };

      img.src = imagePreview;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Decoding failed');
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
          <CardDescription>Extract hidden message from an image</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="decode-image" className="text-foreground mb-2 block">
              Upload Encoded Image
            </Label>
            <ImageUpload
              onImageSelect={handleImageSelect}
              preview={imagePreview}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="decode-key1" className="text-foreground mb-2 block">
                Decryption Key 1
              </Label>
              <Input
                id="decode-key1"
                type="password"
                value={key1}
                onChange={(e) => setKey1(e.target.value)}
                placeholder="Enter first key..."
                className="bg-input border-border text-foreground"
              />
            </div>
            <div>
              <Label htmlFor="decode-key2" className="text-foreground mb-2 block">
                Decryption Key 2
              </Label>
              <Input
                id="decode-key2"
                type="password"
                value={key2}
                onChange={(e) => setKey2(e.target.value)}
                placeholder="Enter second key..."
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          {decodedMessage && (
            <Alert className="bg-primary/10 border-primary">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground">
                <div className="font-semibold mb-2">Decoded Message:</div>
                <div className="p-3 bg-background rounded border border-border">
                  {decodedMessage}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleDecode}
            disabled={processing || !imageFile || !key1 || !key2}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {processing ? 'Decoding...' : 'Decode Message'}
          </Button>
        </CardContent>
      </Card>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
