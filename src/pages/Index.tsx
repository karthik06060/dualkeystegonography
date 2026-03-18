import { useState } from 'react';
import { Shield, Lock, Unlock, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StegoEncoder } from '@/components/StegoEncoder';
import { StegoDecoder } from '@/components/StegoDecoder';
import { Alert, AlertDescription } from '@/components/ui/alert';

const isCryptoAvailable = (() => {
  try {
    return !!(
      (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) ||
      (typeof window !== 'undefined' && window.crypto?.subtle)
    );
  } catch {
    return false;
  }
})();

const Index = () => {
  const [activeTab, setActiveTab] = useState('encode');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="w-8 h-8 text-primary animate-pulse-glow" />
              <Lock className="w-4 h-4 text-primary absolute -bottom-1 -right-1" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dual-Key Latent Diffusion Steganography</h1>
              <p className="text-xs text-muted-foreground">AES-256-GCM Encrypted Image Steganography</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-card">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Secure Message Hiding
            </h2>
            <p className="text-lg text-muted-foreground">
              Advanced steganography tool using AES-256-GCM encryption and PIN-protected QR codes.
              Keys are generated automatically and never shown.
            </p>
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                AES-256-GCM Encryption
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                12-Character PIN Protection
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                QR-Based Key Exchange
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {!isCryptoAvailable && (
            <Alert className="mb-6 bg-destructive/10 border-destructive">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <AlertDescription className="text-foreground">
                <strong>Secure context required:</strong> This app needs HTTPS or localhost to work.
                You're currently on an insecure connection, so encryption features are unavailable.
                Please access this page via <code className="bg-muted px-1 rounded">https://</code> or <code className="bg-muted px-1 rounded">http://localhost</code>.
              </AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-card border border-border">
              <TabsTrigger
                value="encode"
                disabled={!isCryptoAvailable}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-lg py-3"
              >
                <Lock className="w-5 h-5 mr-2" />
                Encode Message
              </TabsTrigger>
              <TabsTrigger
                value="decode"
                disabled={!isCryptoAvailable}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-lg py-3"
              >
                <Unlock className="w-5 h-5 mr-2" />
                Decode Message
              </TabsTrigger>
            </TabsList>

            <TabsContent value="encode">
              <StegoEncoder />
            </TabsContent>

            <TabsContent value="decode">
              <StegoDecoder />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Secure steganography with AES-256-GCM encryption
            </p>
            <p className="text-xs text-muted-foreground">
              All processing happens locally in your browser. Your data never leaves your device.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
