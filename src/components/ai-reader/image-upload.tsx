import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  onImageRemove: () => void;
  disabled?: boolean;
  currentImage?: File | null;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function ImageUpload({ onImageSelect, onImageRemove, disabled = false, currentImage = null }: ImageUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Tip de fișier invalid. Folosește JPEG, PNG sau WebP.");
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setError("Fișierul este prea mare. Mărimea maximă este 5MB.");
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setError(null);
    onImageSelect(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setError(null);
    onImageRemove();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-2">
        <ImageIcon className="h-4 w-4" />
        Încarcă imagine cu text
      </Label>

      {!preview ? (
        <div
          onClick={disabled ? undefined : handleClick}
          className={cn(
            "flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-6 transition-colors hover:bg-muted/50",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-center text-sm font-medium">Apasă pentru a încărca o imagine</p>
          <p className="mt-1 text-center text-xs text-muted-foreground">
            JPEG, PNG sau WebP · Max 5MB
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            onChange={handleFileChange}
            disabled={disabled}
            className="sr-only"
            aria-label="Încarcă imagine"
          />
        </div>
      ) : (
        <div className="relative rounded-lg border border-border bg-card p-3">
          <img
            src={preview}
            alt="Previzualizare imagine încărcată"
            className="h-auto w-full rounded-md object-contain"
            style={{ maxHeight: "300px" }}
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute right-5 top-5"
            onClick={handleRemove}
            disabled={disabled}
            aria-label="Elimină imagine"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-muted-foreground">
        Imaginea va fi procesată pentru extragerea textului. Nu este stocată permanent.
      </p>
    </div>
  );
}
