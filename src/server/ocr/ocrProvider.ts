/**
 * Abstracție pentru un furnizor de recunoaștere optică a caracterelor (OCR). Permite
 * înlocuirea furnizorului concret (ex. OCR.space, Google Cloud Vision, Azure Document
 * Intelligence) fără a schimba logica endpoint-ului server-side care îl consumă.
 */
export interface OcrProvider {
  /**
   * Extrage textul dintr-o imagine. Implementările trebuie să trateze imaginea strict
   * tranzitoriu (fără persistență) și să nu logheză conținutul imaginii sau textul extras.
   * Folosește `Uint8Array` (nu `Buffer`) pentru compatibilitate cu Edge Runtime.
   */
  recognizeText(imageBytes: Uint8Array, mimeType: string): Promise<string>
}

/**
 * Eroare specifică eșecurilor furnizorului OCR (rețea, răspuns invalid, procesare eșuată),
 * distinctă de erorile de validare a cererii, pentru a putea fi mapată la un cod HTTP potrivit
 * (502) în handler.
 */
export class OcrProviderError extends Error {}
