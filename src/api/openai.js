import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';

const generateSummaryFn = httpsCallable(functions, 'generateSummary');

export async function generateSummary(formText) {
  const { data } = await generateSummaryFn({ formText });
  return data.summary;
}

export const getOpenAISummary = generateSummary;