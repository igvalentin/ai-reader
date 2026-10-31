import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Headphones, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TextInput, ImageUpload, LanguageSelector, AudioPlayer, PrivacyNotice, type LanguageCode } from "@/components/ai-reader";
import { Container, Section } from "@/packages/ui";
import { buildHead } from "@/packages/seo";
import { SITE } from "@/packages/shared";

export const Route = createFileRoute("/")({
  head: () => buildHead({ 
    title: `${SITE.name} — ${SITE.tagline}`, 
    description: SITE.description, 
    path: "/" 
  }),
  component: AIReaderPage,
});

function AIReaderPage() {
  const [inputMethod, setInputMethod] = useState<"text" | "image">("text");
  const [text, setText] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [language, setLanguage] = useState<LanguageCode>("auto");
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    // TODO: Implement OCR in Prompt 2
    console.log("Image selected:", file.name);
  };

  const handleImageRemove = () => {
    setSelectedImage(null);
  };

  const handleGenerate = async () => {
    // TODO: Implement TTS in Prompt 3
    setIsProcessing(true);
    
    // Placeholder: Simulate processing
    setTimeout(() => {
      setIsProcessing(false);
      console.log("Generate audio for text:", text);
      console.log("Language:", language);
    }, 2000);
  };

  const canGenerate = inputMethod === "text" ? text.trim().length > 0 : selectedImage !== null;

  return (
    <>
      {/* Hero Section */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <Container className="py-12 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
              Powered by AI
            </div>
            <h1 className="font-display text-4xl text-foreground sm:text-5xl md:text-6xl">
              {SITE.name}
            </h1>
            <p className="mt-4 text-xl text-foreground sm:text-2xl">
              {SITE.tagline}
            </p>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              {SITE.positioning}
            </p>
          </div>
        </Container>
      </section>

      {/* Main Content */}
      <Section>
        <Container>
          <div className="mx-auto max-w-4xl">
            <Card className="p-6 sm:p-8">
              <div className="mb-6">
                <h2 className="flex items-center gap-2 text-2xl font-semibold">
                  <Headphones className="h-6 w-6 text-primary" />
                  Generează audio
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Lipește text sau încarcă o imagine cu text pentru a asculta conținutul cu voce naturală.
                </p>
              </div>

              {/* Privacy Notice */}
              <div className="mb-6">
                <PrivacyNotice />
              </div>

              {/* Input Method Tabs */}
              <Tabs value={inputMethod} onValueChange={(value) => setInputMethod(value as "text" | "image")} className="mb-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="text">Text</TabsTrigger>
                  <TabsTrigger value="image">Imagine</TabsTrigger>
                </TabsList>
                <TabsContent value="text" className="mt-6">
                  <TextInput
                    value={text}
                    onChange={setText}
                    disabled={isProcessing}
                  />
                </TabsContent>
                <TabsContent value="image" className="mt-6">
                  <ImageUpload
                    onImageSelect={handleImageSelect}
                    onImageRemove={handleImageRemove}
                    disabled={isProcessing}
                    currentImage={selectedImage}
                  />
                  {selectedImage && (
                    <div className="mt-4">
                      <TextInput
                        value={text}
                        onChange={setText}
                        disabled={isProcessing}
                        placeholder="Textul extras va apărea aici..."
                      />
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Language Selector */}
              <div className="mb-6">
                <LanguageSelector
                  value={language}
                  onChange={setLanguage}
                  disabled={isProcessing}
                />
              </div>

              {/* Generate Button */}
              <div className="mb-6">
                <Button
                  onClick={handleGenerate}
                  disabled={!canGenerate || isProcessing}
                  className="w-full"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <span className="animate-pulse">Se procesează...</span>
                    </>
                  ) : (
                    <>
                      <Headphones className="mr-2 h-5 w-5" />
                      Generează audio
                    </>
                  )}
                </Button>
              </div>

              {/* Audio Player */}
              <AudioPlayer
                audioUrl={audioUrl}
                isLoading={isProcessing}
                disabled={isProcessing}
              />
            </Card>

            {/* Features Section */}
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Detectare automată</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Limba este detectată automat pentru pronunție corectă
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Headphones className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">Voce naturală</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Text-to-speech de înaltă calitate cu suport pentru română
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Headphones className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold">OCR pentru imagini</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Extrage text din imagini și ascultă conținutul
                </p>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
