import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck } from "lucide-react";

export function PrivacyNotice() {
  return (
    <Alert className="border-primary/20 bg-primary/5">
      <ShieldCheck className="h-4 w-4 text-primary" />
      <AlertDescription className="text-sm leading-relaxed">
        <strong>Confidențialitate:</strong> Textul și imaginile tale sunt procesate temporar pentru a genera audio.
        Nu stocăm permanent conținutul tău. Imaginile sunt șterse imediat după extragerea textului.
      </AlertDescription>
    </Alert>
  );
}
