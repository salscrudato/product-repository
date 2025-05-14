import { getStorage, ref, getDownloadURL } from 'firebase/storage';
import { getDocument } from 'pdfjs-dist';

// Extract plain text from a PDF in Firebase Storage
export async function extractPdfText(filePath) {
  const storage = getStorage();
  const url = await getDownloadURL(ref(storage, filePath));
  const pdf = await getDocument(url).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map(item => item.str).join(' ') + '\n';
  }
  return text;
}

// Call OpenAI to generate a structured summary
export async function generateFormSummary(text) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Summarize this insurance form with sections: Form Type, Form Name, Overview (3 sentences), Coverages (bold titles + descriptions + sub-coverages), Conditions, Exclusions. Use Markdown.' },
        { role: 'user', content: text }
      ],
      max_tokens: 1000,
      temperature: 0.2
    })
  });
  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}