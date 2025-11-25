import { useState, useRef } from 'react';
import { Lock, Download, AlertCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { encodeMessageInImage } from '@/lib/steganography';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';

export const StegoEncoder = () => {
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [message, setMessage] = useState('');
  const [key1, setKey1] = useState('');
  const [key2, setKey2] = useState('');
  const [generating, setGenerating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [encodedImageUrl, setEncodedImageUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleGenerateImage = async () => {
    if (!imagePrompt) {
      toast.error('Please enter an image prompt');
      return;
    }

    setGenerating(true);
    setEncodedImageUrl('');

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
    if (!generatedImage || !message || !key1 || !key2) {
      toast.error('Please generate an image and fill in all fields');
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

      img.src = generatedImage;
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
            <Label htmlFor="image-prompt" className="text-foreground mb-2 block">
              Image Prompt
            </Label>
            <div className="flex gap-2">
              <Textarea
                id="image-prompt"
                value={imagePrompt}
                onChange={(e) => setImagePrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                className="min-h-20 bg-input border-border text-foreground"
              />
              <Button
                onClick={handleGenerateImage}
                disabled={generating || !imagePrompt}
                className="bg-primary text-primary-foreground hover:bg-primary/90 self-end"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {generating ? 'Generating...' : 'Generate'}
              </Button>
            </div>
          </div>

          {generatedImage && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${encodedImageUrl ? 'text-primary' : 'text-muted-foreground'}`}>
                  {encodedImageUrl ? '✓ Encoded Image (with hidden message)' : 'Generated Image'}
                </span>
              </div>
              <div className={`relative rounded-lg overflow-hidden border-2 ${encodedImageUrl ? 'border-primary' : 'border-border'}`}>
                <img
                  src={encodedImageUrl || generatedImage}
                  alt={encodedImageUrl ? 'Encoded' : 'Generated'}
                  className="w-full h-auto max-h-96 object-contain bg-muted"
                />
                {encodedImageUrl && (
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded-full">
                    Encoded
                  </div>
                )}
              </div>
            </div>
          )}

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
                Latent Position Key (Key 1)
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Controls PRNG-based deterministic embedding positions
              </p>
              <Input
                id="key1"
                type="password"
                value={key1}
                onChange={(e) => setKey1(e.target.value)}
                placeholder="Enter position key..."
                className="bg-input border-border text-foreground"
              />
            </div>
            <div>
              <Label htmlFor="key2" className="text-foreground mb-2 block">
                Encryption Key (Key 2)
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Used for message encryption
              </p>
              <Input
                id="key2"
                type="password"
                value={key2}
                onChange={(e) => setKey2(e.target.value)}
                placeholder="Enter encryption key..."
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
              disabled={processing || !generatedImage || !message || !key1 || !key2}
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
