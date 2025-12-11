import { useState, useRef } from 'react';
import { Lock, Download, AlertCircle, Sparkles, QrCode, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { encodeMessageInImage } from '@/lib/steganography';
import { generateRandomKey, generatePRNGSeed, encryptKeyBundleWithPin, validatePin } from '@/lib/crypto';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import QRCode from 'qrcode';

export const StegoEncoder = () => {
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [message, setMessage] = useState('');
  const [pin, setPin] = useState('');
  const [generating, setGenerating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [encodedImageUrl, setEncodedImageUrl] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleGenerateImage = async () => {
    if (!imagePrompt) {
      toast.error('Please enter an image prompt');
      return;
    }

    setGenerating(true);
    setEncodedImageUrl('');
    setQrCodeUrl('');

    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: imagePrompt }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast.success('Image generated successfully!');
      } else {
        throw new Error('No image URL returned');
      }
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate image');
    } finally {
      setGenerating(false);
    }
  };

  const handleEncode = async () => {
    if (!generatedImage || !message || !pin) {
      toast.error('Please generate an image, enter a message, and provide a 12-character PIN');
      return;
    }

    if (!validatePin(pin)) {
      toast.error('PIN must be exactly 12 characters');
      return;
    }

    setProcessing(true);

    try {
      // Generate random keys (never shown to user)
      const key1 = generateRandomKey(); // Encryption key
      const key2 = generatePRNGSeed();  // Latent position key

      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = async () => {
        try {
          const canvas = canvasRef.current;
          if (!canvas) return;

          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Encode message with AES-256-GCM encryption
          const encodedImageData = await encodeMessageInImage(imageData, message, key1, key2);
          ctx.putImageData(encodedImageData, 0, 0);

          // Generate stego image blob
          canvas.toBlob(async (blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              setEncodedImageUrl(url);

              // Create encrypted QR code with key bundle
              const encryptedBundle = await encryptKeyBundleWithPin(key1, key2, pin);
              const qrDataUrl = await QRCode.toDataURL(encryptedBundle, {
                width: 300,
                margin: 2,
                color: { dark: '#000000', light: '#ffffff' }
              });
              setQrCodeUrl(qrDataUrl);

              toast.success('Message encoded successfully!');
            }
            setProcessing(false);
          }, 'image/png');
        } catch (error) {
          console.error('Encoding error:', error);
          toast.error(error instanceof Error ? error.message : 'Encoding failed');
          setProcessing(false);
        }
      };

      img.onerror = () => {
        toast.error('Failed to load image');
        setProcessing(false);
      };

      img.src = generatedImage;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Encoding failed');
      setProcessing(false);
    }
  };

  const handleDownloadImage = () => {
    if (!encodedImageUrl) return;
    const link = document.createElement('a');
    link.href = encodedImageUrl;
    link.download = 'stego-image.png';
    link.click();
    toast.success('Stego image downloaded!');
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = 'key-qr.png';
    link.click();
    toast.success('QR code downloaded!');
  };

  return (
    <div className="space-y-6 animate-slide-up">
      <Card className="bg-gradient-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Encode Message
          </CardTitle>
          <CardDescription>
            Hide your secret message inside an AI-generated image with AES-256-GCM encryption
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="message" className="text-foreground mb-2 block">
              Enter Message to Encode
            </Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your secret message..."
              className="min-h-32 bg-input border-border text-foreground"
            />
          </div>

          <div>
            <Label htmlFor="image-prompt" className="text-foreground mb-2 block">
              Enter Image Prompt
            </Label>
            <Textarea
              id="image-prompt"
              value={imagePrompt}
              onChange={(e) => setImagePrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              className="min-h-20 bg-input border-border text-foreground"
            />
          </div>

          <div>
            <Label htmlFor="pin" className="text-foreground mb-2 block">
              Enter 12-Character PIN
            </Label>
            <p className="text-xs text-muted-foreground mb-2">
              This PIN will be used to encrypt the keys. You'll need it to decode the message.
            </p>
            <Input
              id="pin"
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

          {generatedImage && !encodedImageUrl && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">Generated Image</span>
              <div className="relative rounded-lg overflow-hidden border-2 border-border">
                <img
                  src={generatedImage}
                  alt="Generated"
                  className="w-full h-auto max-h-96 object-contain bg-muted"
                />
              </div>
            </div>
          )}

          {encodedImageUrl && qrCodeUrl && (
            <>
              <Alert className="bg-destructive/10 border-destructive">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-foreground">
                  <strong>Security Warning:</strong> Share the QR code and PIN separately. Never share them together!
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-sm font-medium text-primary">✓ Stego Image</span>
                  <div className="relative rounded-lg overflow-hidden border-2 border-primary">
                    <img
                      src={encodedImageUrl}
                      alt="Encoded"
                      className="w-full h-auto object-contain bg-muted"
                    />
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                      Encoded
                    </div>
                  </div>
                  <Button
                    onClick={handleDownloadImage}
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Stego Image
                  </Button>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-primary">✓ Encrypted QR Code</span>
                  <div className="relative rounded-lg overflow-hidden border-2 border-primary bg-white p-4">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code"
                      className="w-full h-auto object-contain"
                    />
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                      <QrCode className="w-3 h-3" />
                    </div>
                  </div>
                  <Button
                    onClick={handleDownloadQR}
                    variant="outline"
                    className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download QR Code
                  </Button>
                </div>
              </div>
            </>
          )}

          <div className="flex gap-3">
            {!generatedImage ? (
              <Button
                onClick={handleGenerateImage}
                disabled={generating || !imagePrompt}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generating ? 'Generating...' : 'Generate Image'}
              </Button>
            ) : !encodedImageUrl ? (
              <Button
                onClick={handleEncode}
                disabled={processing || !message || !validatePin(pin)}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {processing ? 'Encoding...' : 'ENCODE'}
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setGeneratedImage('');
                  setEncodedImageUrl('');
                  setQrCodeUrl('');
                  setMessage('');
                  setPin('');
                  setImagePrompt('');
                }}
                variant="outline"
                className="flex-1 border-border"
              >
                Encode New Message
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
