import * as pdfjsLib from 'pdfjs-dist';

// Use the bundled worker from the package in a way that TypeScript and Vite understand
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    if (!fullText.trim()) {
      throw new Error("No text could be extracted from this PDF. It might be an image-only scan.");
    }

    return fullText;
  } catch (error: any) {
    console.error("PDF Extraction Error:", error);
    throw new Error(`PDF Extraction failed: ${error.message}`);
  }
}
