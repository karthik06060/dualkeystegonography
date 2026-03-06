import { useState, useRef } from 'react';
import { Lock, Download, Sparkles, QrCode, AlertTriangle, Upload, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { encodeMessageInImage } from '@/lib/steganography';
import { generateRandomKey, generatePRNGSeed, encryptKeyBundleWithPin, validatePin } from '@/lib/crypto';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import QRCode from 'qrcode';

type ImageSource = 'upload' | 'generate';

export const StegoEncoder = () => {
  const [imageSource, setImageSource] = useState<ImageSource>('upload');
  const [imagePrompt, setImagePrompt] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [message, setMessage] = useState('');
  const [pin, setPin] = useState('');
  const [generating, setGenerating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [encodedImageUrl, setEncodedImageUrl] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sourceImage = imageSource === 'upload' ? uploadedImage : generatedImage;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      toast.error('Please upload a PNG or JPG image');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setEncodedImageUrl('');
      setQrCodeUrl('');
      toast.success('Image uploaded successfully!');
    };
    reader.readAsDataURL(file);
  };

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
    } catch (error: any) {
      console.error('Image generation error:', error);
      const msg = error?.message || String(error);
      if (msg.includes('cannot fulfill') || msg.includes('inappropriate') || msg.includes('sexually')) {
        toast.error('Your prompt was rejected by the AI content policy. Please try a different, appropriate prompt.');
      } else {
        toast.error(msg || 'Failed to generate image');
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleEncode = async () => {
    if (!sourceImage || !message || !pin) {
      toast.error('Please provide an image, enter a message, and provide a 12-character PIN');
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

      img.src = sourceImage;
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
            Hide your secret message inside an image with AES-256-GCM encryption
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
            <Label className="text-foreground mb-2 block">
              Choose Image Source
            </Label>
            <RadioGroup
              value={imageSource}
              onValueChange={(value) => {
                setImageSource(value as ImageSource);
                setEncodedImageUrl('');
                setQrCodeUrl('');
              }}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="upload" id="upload" />
                <Label htmlFor="upload" className="flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Upload Image
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="generate" id="generate" />
                <Label htmlFor="generate" className="flex items-center gap-2 cursor-pointer">
                  <Sparkles className="w-4 h-4" />
                  Generate Image From Prompt
                </Label>
              </div>
            </RadioGroup>
          </div>

          {imageSource === 'upload' && (
            <div>
              <Label className="text-foreground mb-2 block">
                Upload Image (.png or .jpg)
              </Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Click to upload PNG or JPG image
                </p>
              </div>
            </div>
          )}

          {imageSource === 'generate' && (
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
          )}

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

          {sourceImage && !encodedImageUrl && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">
                {imageSource === 'upload' ? 'Uploaded Image' : 'Generated Image'}
              </span>
              <div className="relative rounded-lg overflow-hidden border-2 border-border">
                <img
                  src={sourceImage}
                  alt="Source"
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
            {imageSource === 'generate' && !generatedImage ? (
              <Button
                onClick={handleGenerateImage}
                disabled={generating || !imagePrompt}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generating ? 'Generating...' : 'Generate Image'}
              </Button>
            ) : !encodedImageUrl && sourceImage ? (
              <Button
                onClick={handleEncode}
                disabled={processing || !message || !validatePin(pin)}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {processing ? 'Encoding...' : 'ENCODE'}
              </Button>
            ) : encodedImageUrl ? (
              <Button
                onClick={() => {
                  setGeneratedImage('');
                  setUploadedImage('');
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
            ) : null}
          </div>
        </CardContent>
      </Card>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};
