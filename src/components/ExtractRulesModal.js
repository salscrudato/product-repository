import { useState } from 'react';
import CoverageScreen from './CoverageScreen';
import ExtractRulesModal from './ExtractRulesModal';
import { Button } from './ui/Button';
import { DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function ProductHub() {
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [rulesProduct,   setRulesProduct]   = useState(null);
  const [rulesFile,      setRulesFile]      = useState(null);
  const [rulesLoading,   setRulesLoading]   = useState(false);
  const [rulesData,      setRulesData]      = useState(null);

  const openRulesModal = (product) => {
    setRulesProduct(product);
    setRulesFile(null);
    setRulesData(null);
    setRulesModalOpen(true);
  };

  const handleRulesFile = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') setRulesFile(file);
    else alert('Please select a PDF file');
  };

  const extractRules = async () => {
    if (!rulesFile) return;
    setRulesLoading(true);
    try {
      const form = new FormData();
      form.append('file', rulesFile);
      const res = await fetch('/api/extract-rules', { method: 'POST', body: form });
      const json = await res.json();
      setRulesData(json.rules || []);
    } catch (e) { console.error(e); alert('Extraction failed'); }
    setRulesLoading(false);
  };

  return (
    <div>
      {/* other UI components */}
      <div className="action-group">
        {/* other buttons */}
        <Button variant="ghost" onClick={() => openRulesModal(p)} title="Extract rules">
          <DocumentMagnifyingGlassIcon width={20} height={20}/>
        </Button>
      </div>

      {rulesModalOpen && (
        <ExtractRulesModal
          onClose={()=>setRulesModalOpen(false)}
          onFileSelect={handleRulesFile}
          onExtract={extractRules}
          loading={rulesLoading}
          rules={rulesData}
          file={rulesFile}
        />
      )}

      {/* details modal and other components */}
    </div>
  );
}
