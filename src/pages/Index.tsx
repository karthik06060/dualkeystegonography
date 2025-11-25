import { useState } from 'react';
import { Shield, Lock, Unlock } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StegoEncoder } from '@/components/StegoEncoder';
import { StegoDecoder } from '@/components/StegoDecoder';

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
              <h1 className="text-2xl font-bold text-foreground">DualKey Stego</h1>
              <p className="text-xs text-muted-foreground">Dual-Key Image Steganography</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-card">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground">
              Hide Messages in Plain Sight
            </h2>
            <p className="text-lg text-muted-foreground">
              Advanced dual-key steganography tool that securely hides your messages inside images
              using LSB technique and dual-key encryption.
            </p>
            <div className="flex flex-wrap gap-4 justify-center pt-4">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Dual-Key Encryption
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                LSB Steganography
              </div>
              <div className="flex items-center gap-2 text-sm text-foreground">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Secure & Private
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-card border border-border">
              <TabsTrigger
                value="encode"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Lock className="w-4 h-4 mr-2" />
                Encode
              </TabsTrigger>
              <TabsTrigger
                value="decode"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Unlock className="w-4 h-4 mr-2" />
                Decode
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
              Secure steganography with dual-key encryption
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
