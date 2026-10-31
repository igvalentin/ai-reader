import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function TextInput({ value, onChange, disabled = false, placeholder = "Lipește sau scrie textul aici..." }: TextInputProps) {
  const charCount = value.length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-2">
      <Label htmlFor="text-input" className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        Text de citit
      </Label>
      <Textarea
        id="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder={placeholder}
        className="min-h-[200px] resize-y text-base"
        aria-describedby="text-stats"
      />
      <div id="text-stats" className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{charCount} caractere</span>
        <span>·</span>
        <span>{wordCount} cuvinte</span>
      </div>
    </div>
  );
}
