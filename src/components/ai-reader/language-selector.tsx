import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Languages } from "lucide-react";

export type LanguageCode = "auto" | "ro-RO" | "en-US" | "en-GB";

export interface Language {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

export const SUPPORTED_LANGUAGES: Language[] = [
  { code: "auto", name: "Auto-detect", nativeName: "Detectare automată" },
  { code: "ro-RO", name: "Romanian", nativeName: "Română" },
  { code: "en-US", name: "English (US)", nativeName: "English (US)" },
  { code: "en-GB", name: "English (UK)", nativeName: "English (UK)" },
];

interface LanguageSelectorProps {
  value: LanguageCode;
  onChange: (value: LanguageCode) => void;
  disabled?: boolean;
  detectedLanguage?: LanguageCode | null;
}

export function LanguageSelector({ value, onChange, disabled = false, detectedLanguage = null }: LanguageSelectorProps) {
  const selectedLanguage = SUPPORTED_LANGUAGES.find((lang) => lang.code === value);
  const detectedLanguageName = detectedLanguage
    ? SUPPORTED_LANGUAGES.find((lang) => lang.code === detectedLanguage)?.nativeName
    : null;

  return (
    <div className="space-y-2">
      <Label htmlFor="language-selector" className="flex items-center gap-2">
        <Languages className="h-4 w-4" />
        Limba
      </Label>
      <Select value={value} onValueChange={(val) => onChange(val as LanguageCode)} disabled={disabled}>
        <SelectTrigger id="language-selector" className="w-full">
          <SelectValue placeholder="Selectează limba">
            {selectedLanguage?.nativeName || "Selectează limba"}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <span className="flex items-center gap-2">
                {lang.nativeName}
                {lang.code !== "auto" && <span className="text-xs text-muted-foreground">({lang.name})</span>}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {detectedLanguageName && value === "auto" && (
        <p className="text-xs text-muted-foreground">
          Limbă detectată: <span className="font-medium">{detectedLanguageName}</span>
        </p>
      )}
    </div>
  );
}
