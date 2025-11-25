import { useState, useRef } from 'react';
import { Lock, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ImageUpload } from '@/components/ImageUpload';
import { encodeMessageInImage } from '@/lib/steganography';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const StegoEncoder = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [message, setMessage] = useState('');
  const [key1, setKey1] = useState('');
  const [key2, setKey2] = useState('');
  const [processing, setProcessing] = useState(false);
  const [encodedImageUrl, setEncodedImageUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
      setEncodedImageUrl('');
    };
    reader.readAsDataURL(file);
  };

  const handleEncode = async () => {
    if (!imageFile || !message || !key1 || !key2) {
      toast.error('Please fill in all fields');
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

        const encodedImageData = encodeMessageInImage(imageData, message, key1, key2);
        ctx.putImageData(encodedImageData, 0, 0);

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setEncodedImageUrl(url);
            toast.success('Message encoded successfully!');
          }
          setProcessing(false);
        }, 'image/png');
      };

      img.src = imagePreview;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Encoding failed');
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!encodedImageUrl) return;

    const link = document.createElement('a');
    link.href = encodedImageUrl;
    link.download = 'encoded-image.png';
    link.click();
    toast.success('Image downloaded!');
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Encode Message
          </CardTitle>
          <CardDescription>Hide your secret message inside an image</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="image-upload" className="text-foreground mb-2 block">
              Upload Image
            </Label>
            <ImageUpload
              onImageSelect={handleImageSelect}
              preview={encodedImageUrl || imagePreview}
            />
          </div>

          <div>
            <Label htmlFor="message" className="text-foreground mb-2 block">
              Secret Message
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your secret message..."
              className="min-h-32 bg-input border-border text-foreground"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="key1" className="text-foreground mb-2 block">
                Encryption Key 1
              </Label>
              <Input
                id="key1"
                type="password"
                value={key1}
                onChange={(e) => setKey1(e.target.value)}
                placeholder="Enter first key..."
                className="bg-input border-border text-foreground"
              />
            </div>
            <div>
              <Label htmlFor="key2" className="text-foreground mb-2 block">
                Encryption Key 2
              </Label>
              <Input
                id="key2"
                type="password"
                value={key2}
                onChange={(e) => setKey2(e.target.value)}
                placeholder="Enter second key..."
                className="bg-input border-border text-foreground"
              />
            </div>
          </div>

          {encodedImageUrl && (
            <Alert className="bg-primary/10 border-primary">
              <AlertCircle className="h-4 w-4 text-primary" />
              <AlertDescription className="text-foreground">
                Message successfully encoded! Download the image below.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleEncode}
              disabled={processing || !imageFile || !message || !key1 || !key2}
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {processing ? 'Encoding...' : 'Encode Message'}
            </Button>
            {encodedImageUrl && (
              <Button
                onClick={handleDownload}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
