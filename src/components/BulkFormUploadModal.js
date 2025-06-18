import { useState } from 'react';
import PropTypes from 'prop-types';
import { db, storage, auth } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Overlay, Modal, ModalHeader, ModalTitle, CloseBtn, Table, THead, Tr, Th, Td } from './ui/Table';
import { Button } from './ui/Button';
import styled from 'styled-components';
import { ArrowUpTrayIcon, TrashIcon } from '@heroicons/react/24/solid';
import { TextInput } from './ui/Input';
import logger, { LOG_CATEGORIES } from '../utils/logger';

/* ---------- styled ---------- */
const OverlayFixed = styled(Overlay)`
  position: fixed !important;
  inset: 0;
  background: rgba(17,24,39,0.5);
  backdrop-filter: blur(2px);
  z-index: 1400;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DropZone = styled.label`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 40px 60px;
  cursor: pointer;
  background: #f9fafb;
  transition: background 0.2s;
  &:hover {
    background: #f3f4f6;
  }
`;

const SmallInput = styled(TextInput)`
  font-size: 13px;
  padding: 4px 6px;
`;

/* ---------- util ---------- */
const inferMeta = (filename) => {
  // naive "Name_Number-Edition.pdf" extractor
  const nameNoExt = filename.replace(/\.pdf$/i, '');
  const parts = nameNoExt.split(/[_-]/);
  const meta = { formName: '', formNumber: '', formEditionDate: '' };
  if (parts.length >= 3) {
    meta.formName = parts[0].replace(/([A-Z])/g, ' $1').trim();
    meta.formNumber = parts[1];
    meta.formEditionDate = parts[2].replace(/(\d{2})(\d{2})/, '$1/$2');
  }
  return meta;
};

const META_SYSTEM_PROMPT = `
You are an assistant that extracts basic metadata from insurance PDF text.

Return ONLY a JSON object with:
{
  "formName": "string (may be empty)",
  "formNumber": "string",
  "formEditionDate": "MM/YY",
  "category": "Base Coverage Form | Endorsement | Exclusion | Notice | Dec/Quote | Other"
}

If a field is missing, use an empty string.  No commentary.
`.trim();

// lightweight PDF -> text helper using dynamic import so bundle isn't bloated
let pdfjsLib = null;
async function pdfToText(file) {
  pdfjsLib = pdfjsLib || (await import(/* webpackChunkName: "pdfjs" */ 'pdfjs-dist'));
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  let text = '';
  for (let i = 1; i <= Math.min(3, pdf.numPages); i++) {        // first 3 pages usually enough
    const pg = await pdf.getPage(i);
    const { items } = await pg.getTextContent();
    text += items.map(it => it.str).join(' ') + '\n';
  }
  return text.slice(0, 15000);   // keep it tiny for the "mini" model
}

async function extractMetaAI(text) {
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: META_SYSTEM_PROMPT },
          { role: 'user', content: text }
        ]
      })
    });
    if (!res.ok) throw new Error(await res.text());
    const { choices } = await res.json();
    const raw = choices[0].message.content.replace(/```json\n?|```/g,'').trim();
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default function BulkFormUploadModal({ open, onClose, productId, products = [] }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [metas, setMetas] = useState([]);        // aligned with files array
  const CATEGORY_OPTS = ['Base Coverage Form','Endorsement','Exclusion','Notice','Dec/Quote','Other'];

  if (!open) return null;

  const handleFiles = (e) => {
    const picked = Array.from(e.target.files || []).filter(f => f.type === 'application/pdf');

    logger.logUserAction('Bulk form files selected', {
      totalFiles: e.target.files?.length || 0,
      pdfFiles: picked.length,
      fileNames: picked.map(f => f.name),
      fileSizes: picked.map(f => f.size),
      productId: productId || 'none'
    });

    if (!picked.length) {
      logger.warn(LOG_CATEGORIES.UPLOAD, 'No PDF files selected for bulk upload', {
        totalFiles: e.target.files?.length || 0
      });
      return;
    }

    // optimistic UI
    setFiles(prev => [...prev, ...picked]);
    setMetas(prev => [
      ...prev,
      ...picked.map(f => ({ ...inferMeta(f.name), product: productId || '' }))
    ]);

    // async AI refinement
    picked.forEach(async (file, idx) => {
      const startTime = Date.now();
      try {
        logger.info(LOG_CATEGORIES.AI, `Processing PDF for metadata extraction: ${file.name}`, {
          fileName: file.name,
          fileSize: file.size
        });

        const txt = await pdfToText(file);
        const ai = await extractMetaAI(txt);

        const duration = Date.now() - startTime;
        logger.logPerformance(`PDF metadata extraction - ${file.name}`, duration, {
          fileName: file.name,
          fileSize: file.size,
          textLength: txt?.length || 0,
          extractedFields: Object.keys(ai || {}).length
        });

        setMetas(prev => {
          const clone = [...prev];
          clone[prev.length - picked.length + idx] = { ...clone[prev.length - picked.length + idx], ...ai };
          return clone;
        });
      } catch (error) {
        const duration = Date.now() - startTime;
        logger.error(LOG_CATEGORIES.AI, `PDF metadata extraction failed: ${file.name}`, {
          fileName: file.name,
          fileSize: file.size,
          duration
        }, error);
      }
    });
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setMetas(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!files.length) return;

    const startTime = Date.now();
    const uploadSession = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.logFormSubmission('Bulk form upload', {
      fileCount: files.length,
      fileNames: files.map(f => f.name),
      fileSizes: files.map(f => f.size),
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      productId: productId || 'various',
      uploadSession
    });

    setUploading(true);
    let successCount = 0;
    let failureCount = 0;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileStartTime = Date.now();

        try {
          logger.info(LOG_CATEGORIES.UPLOAD, `Starting upload: ${file.name}`, {
            fileName: file.name,
            fileSize: file.size,
            fileIndex: i + 1,
            totalFiles: files.length,
            uploadSession
          });

          const storageRef = ref(storage, `forms/bulk/${Date.now()}_${file.name}`);
          await uploadBytes(storageRef, file);
          const downloadUrl = await getDownloadURL(storageRef);
          const meta = metas[i] || inferMeta(file.name);

          if (!meta.product) {
            logger.error(LOG_CATEGORIES.UPLOAD, `No product selected for form: ${file.name}`, {
              fileName: file.name,
              uploadSession
            });
            alert('Please select a product for every form.');
            setUploading(false);
            return;
          }

          await addDoc(collection(db, 'forms'), {
            ...meta,
            productIds: [meta.product],
            productId: meta.product,
            coverageIds: [],
            filePath: storageRef.fullPath,
            downloadUrl,
            uploadedBy: auth.currentUser?.email || 'unknown',
            ts: serverTimestamp()
          });

          const fileDuration = Date.now() - fileStartTime;
          logger.logPerformance(`Form upload - ${file.name}`, fileDuration, {
            fileName: file.name,
            fileSize: file.size,
            productId: meta.product,
            uploadSession
          });

          successCount++;
        } catch (fileError) {
          const fileDuration = Date.now() - fileStartTime;
          logger.error(LOG_CATEGORIES.UPLOAD, `Form upload failed: ${file.name}`, {
            fileName: file.name,
            fileSize: file.size,
            duration: fileDuration,
            uploadSession
          }, fileError);

          failureCount++;
        }
      }

      const totalDuration = Date.now() - startTime;
      logger.logPerformance('Bulk form upload completed', totalDuration, {
        totalFiles: files.length,
        successCount,
        failureCount,
        uploadSession
      });

      if (successCount > 0) {
        alert(`Uploaded ${successCount} forms successfully!${failureCount > 0 ? ` (${failureCount} failed)` : ''}`);
        onClose();
      }
    } catch (err) {
      const totalDuration = Date.now() - startTime;
      logger.error(LOG_CATEGORIES.UPLOAD, 'Bulk form upload failed', {
        totalFiles: files.length,
        successCount,
        failureCount,
        duration: totalDuration,
        uploadSession
      }, err);

      alert('Bulk upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <OverlayFixed onClick={onClose}>
      <Modal onClick={e => e.stopPropagation()} style={{ maxWidth: 1200 }}>
        <ModalHeader>
          <ModalTitle>Bulk Form Upload</ModalTitle>
          <CloseBtn onClick={onClose}>✕</CloseBtn>
        </ModalHeader>
        {/* Drop zone */}
        <input
          id="bulk-input"
          type="file"
          accept="application/pdf"
          multiple
          style={{ display:'none' }}
          onChange={handleFiles}
        />
        <DropZone htmlFor="bulk-input">
          <ArrowUpTrayIcon width={32} height={32} style={{ color: '#6B7280', marginBottom: 8 }} />
          <span style={{ fontSize:16, color:'#4B5563' }}>Drop PDFs here or click to select</span>
          <span style={{ fontSize:12, color:'#9CA3AF', marginTop:4 }}>(you may choose many)</span>
        </DropZone>
        {/* Files list */}
        {files.length > 0 && (
          <div style={{ overflowX:'auto', marginTop:16 }}>
            <Table style={{ minWidth:600 }}>
              <THead>
                <Tr>
                  <Th align="left">File</Th>
                  <Th align="left">Name</Th>
                  <Th align="left">Number</Th>
                  <Th align="left">Edition</Th>
                  <Th align="left">Product</Th>
                  <Th align="left">Category</Th>
                  <Th />
                </Tr>
              </THead>
              <tbody>
                {files.map((f, idx) => (
                  <Tr key={idx}>
                    <Td align="left">{f.name}</Td>
                    <Td align="left">
                      <SmallInput
                        value={metas[idx]?.formName || ''}
                        onChange={e =>
                          setMetas(m => {
                            const c = [...m]; c[idx] = { ...c[idx], formName:e.target.value }; return c;
                          })
                        }
                      />
                    </Td>
                    <Td align="left">
                      <SmallInput
                        value={metas[idx]?.formNumber || ''}
                        onChange={e =>
                          setMetas(m => {
                            const c = [...m]; c[idx] = { ...c[idx], formNumber:e.target.value }; return c;
                          })
                        }
                      />
                    </Td>
                    <Td align="left">
                      <SmallInput
                        value={metas[idx]?.formEditionDate || ''}
                        onChange={e =>
                          setMetas(m => {
                            const c = [...m]; c[idx] = { ...c[idx], formEditionDate:e.target.value }; return c;
                          })
                        }
                      />
                    </Td>
                    <Td align="left">
                      <SmallInput
                        as="select"
                        value={metas[idx]?.product || ''}
                        onChange={e =>
                          setMetas(m => {
                            const c = [...m];
                            c[idx] = { ...c[idx], product: e.target.value };
                            return c;
                          })
                        }
                      >
                        <option value="">Select product…</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </SmallInput>
                    </Td>
                    <Td align="left">
                      <SmallInput
                        as="select"
                        value={metas[idx]?.category || ''}
                        onChange={e =>
                          setMetas(m => {
                            const c = [...m]; c[idx] = { ...c[idx], category:e.target.value }; return c;
                          })
                        }
                      >
                        <option value="">Select…</option>
                        {CATEGORY_OPTS.map(o => <option key={o}>{o}</option>)}
                      </SmallInput>
                    </Td>
                    <Td align="center">
                      <Button variant="ghost" onClick={() => removeFile(idx)} title="Remove">
                        <TrashIcon width={14} height={14} />
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
        <Button disabled={uploading || !files.length || metas.some(m => !m.formNumber || !m.product)} onClick={handleSubmit} style={{ marginTop: 24 }}>
          {uploading ? 'Uploading…' : 'Submit'}
        </Button>
      </Modal>
    </OverlayFixed>
  );
}

BulkFormUploadModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  productId: PropTypes.string,
  products : PropTypes.array
};