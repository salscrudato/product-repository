// import React, { useEffect, useState } from 'react';
// import { db } from '../firebase';
// import { collection, collectionGroup, getDocs } from 'firebase/firestore';
// import Fuse from 'fuse.js';
// import styled from 'styled-components';
// import { useNavigate } from 'react-router-dom';

// /* ---------- styled bits ---------- */
// const SearchContainer = styled.div`
//   position: relative;
//   width: 100%;
//   max-width: 1250px;
//   margin: 0 auto;
// `;

// const SearchBox = styled.input`
//   padding: 12px 40px 12px 16px;
//   width: 100%;
//   font-size: 16px;
//   border: 1px solid #d1d5db;
//   border-radius: 8px;
//   margin-bottom: 16px;
//   outline: none;
//   box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
//   transition: border-color 0.2s ease, box-shadow 0.2s ease;
//   background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="%239ca3af" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>')
//     no-repeat 98% center;
//   background-size: 16px;

//   &:focus {
//     border-color: #4f46e5;
//     box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
//   }

//   @media (max-width: 640px) {
//     font-size: 14px;
//     padding: 10px 36px 10px 14px;
//   }
// `;

// const ResultItem = styled.div`
//   display: flex;
//   align-items: center;
//   padding: 8px 12px;
//   border: 1px solid #e5e7eb;
//   border-radius: 8px;
//   margin-bottom: 8px;
//   background: #ffffff;
//   cursor: pointer;
//   transition: background 0.2s ease, transform 0.1s ease;

//   &:hover {
//     background: #f3f4f6;
//     transform: translateX(2px);
//   }

//   &:focus {
//     outline: none;
//     background: #f3f4f6;
//     border-color: #4f46e5;
//   }
// `;

// const LabelProduct = styled.span`
//   font-size: 11px;
//   font-weight: 500;
//   background: #2dd4bf; /* Teal for Products */
//   color: #fff;
//   padding: 2px 8px;
//   border-radius: 5px;
//   margin-right: 6px;
//   text-transform: uppercase;
//   line-height: 1.5;
//   min-width: 80px;
//   text-align: center;
// `;

// const LabelCoverage = styled.span`
//   font-size: 11px;
//   font-weight: 500;
//   background: #a78bfa; /* Purple for Coverages */
//   color: #fff;
//   padding: 2px 8px;
//   border-radius: 5px;
//   margin-right: 6px;
//   text-transform: uppercase;
//   line-height: 1.5;
//   min-width: 80px;
//   text-align: center;
// `;

// const LabelForm = styled.span`
//   font-size: 11px;
//   font-weight: 500;
//   background: #60a5fa; /* Blue for Forms */
//   color: #fff;
//   padding: 2px 8px;
//   border-radius: 5px;
//   margin-right: 6px;
//   text-transform: uppercase;
//   line-height: 1.5;
//   min-width: 80px;
//   text-align: center;
// `;

// const NameText = styled.span`
//   font-size: 14px;
//   margin-right: 8px;

//   &.product {
//     color: #000000; /* Black for Products */
//     font-weight: 700; /* Bold for Products */
//   }

//   &.coverage {
//     color: #4b5563; /* Slightly less gray for Coverages */
//   }

//   &.form {
//     color: #4b5563; /* Same as Coverages for Forms */
//     font-style: italic; /* Italicized for Forms */
//   }
// `;

// const ArrowSeparator = styled.span`
//   font-size: 14px;
//   color: #6b7280;
//   margin: 0 6px;
// `;

// const ProductText = styled.span`
//   font-size: 13px;
//   color: #6b7280;
//   margin-left: 6px;
// `;

// /* ---------- component ---------- */
// export default function GlobalSearch() {
//   const [query, setQuery] = useState('');
//   const [index, setIndex] = useState(null);
//   const [results, setResults] = useState([]);
//   const navigate = useNavigate();

//   /* Build in-memory index once */
//   useEffect(() => {
//     (async () => {
//       const productSnap = await getDocs(collection(db, 'products'));
//       const productMap = Object.fromEntries(productSnap.docs.map(d => [d.id, d.data().name]));

//       const coverageSnap = await getDocs(collectionGroup(db, 'coverages'));
//       const formSnap = await getDocs(collection(db, 'forms'));

//       const docs = [];

//       // Products
//       productSnap.docs.forEach(d => {
//         docs.push({ id: d.id, name: d.data().name, type: 'Product' });
//       });

//       // Coverages
//       for (const d of coverageSnap.docs) {
//         const productId = d.ref.parent.parent.id;
//         const coverageData = d.data();
//         const productName = productMap[productId] || '';
        
//         // Fetch forms associated with this coverage
//         const formSnap = await getDocs(collection(db, 'forms'));
//         const associatedForms = formSnap.docs.filter(f => {
//           const formData = f.data();
//           return formData.productId === productId && formData.formNumber === coverageData.formNumber;
//         });

//         // Determine if this is a base coverage
//         const isBaseCoverage = coverageData.name === 'Base Coverage';

//         if (isBaseCoverage && associatedForms.length === 1) {
//           // Single product, base coverage: show coverage, product, and form
//           const form = associatedForms[0].data();
//           docs.push({
//             id: d.id,
//             name: coverageData.name,
//             type: 'Coverage',
//             productId,
//             productName,
//             form: form.formName || form.formNumber,
//             formId: associatedForms[0].id
//           });
//         } else {
//           // Multiple products/forms: create a line item for each combination
//           associatedForms.forEach(formDoc => {
//             const form = formDoc.data();
//             docs.push({
//               id: `${d.id}-${formDoc.id}`,
//               name: coverageData.name,
//               type: 'Coverage',
//               productId,
//               productName,
//               form: form.formName || form.formNumber,
//               formId: formDoc.id
//             });
//           });

//           // If no forms are associated, still add the coverage with the product
//           if (associatedForms.length === 0) {
//             docs.push({
//               id: d.id,
//               name: coverageData.name,
//               type: 'Coverage',
//               productId,
//               productName,
//               form: null,
//               formId: null
//             });
//           }
//         }
//       }

//       // Forms
//       for (const d of formSnap.docs) {
//         const data = d.data();
//         const productId = data.productId;
//         const productName = productMap[productId] || '';
//         docs.push({
//           id: `${d.id}-${productId}`,
//           name: data.formName || data.formNumber,
//           type: 'Form',
//           formNumber: data.formNumber,
//           productId,
//           productName
//         });
//       }

//       setIndex(new Fuse(docs, { keys: ['name', 'formNumber', 'productName', 'form'], threshold: 0.3 }));
//     })();
//   }, []);

//   /* Run search, limited to top 10 results */
//   useEffect(() => {
//     if (!index || !query.trim()) {
//       setResults([]);
//       return;
//     }
//     setResults(index.search(query).slice(0, 10).map(r => r.item));
//   }, [query, index]);

//   /* Click handler */
//   const handleClick = item => {
//     switch (item.type) {
//       case 'Product':
//         return navigate(`/coverage/${item.id}`);
//       case 'Coverage':
//         return navigate(`/coverage/${item.productId}`);
//       case 'Form':
//         return navigate(`/forms?formId=${item.id.split('-')[0]}`);
//       default:
//         return;
//     }
//   };

//   const getLabelComponent = type => {
//     switch (type) {
//       case 'Product':
//         return LabelProduct;
//       case 'Coverage':
//         return LabelCoverage;
//       case 'Form':
//         return LabelForm;
//       default:
//         return LabelProduct; // Fallback
//     }
//   };

//   const getNameTextClass = type => {
//     if (type === 'Product') return 'product';
//     if (type === 'Coverage') return 'coverage';
//     if (type === 'Form') return 'form';
//     return 'product'; // Fallback
//   };

//   const renderBreadcrumb = item => {
//     const items = [];
//     if (item.type === 'Coverage') {
//       if (item.productName) {
//         items.push(
//           <React.Fragment key="product">
//             <ArrowSeparator>→</ArrowSeparator>
//             <span className="ph-icon-product" title="Product"></span>
//             <ProductText>{item.productName}</ProductText>
//           </React.Fragment>
//         );
//       }
//       if (item.form) {
//         items.push(
//           <React.Fragment key="form">
//             <ArrowSeparator>→</ArrowSeparator>
//             <span className="ph-icon-form" title="Form"></span>
//             <ProductText>{item.form}</ProductText>
//           </React.Fragment>
//         );
//       }
//     } else if (item.type === 'Form' && item.productName) {
//       items.push(
//         <React.Fragment key="product">
//           <ArrowSeparator>→</ArrowSeparator>
//           <span className="ph-icon-product" title="Product"></span>
//           <ProductText>{item.productName}</ProductText>
//         </React.Fragment>
//       );
//     }
//     return items;
//   };

//   return (
//     <SearchContainer>
//       <SearchBox
//         placeholder="Search any product, coverage, or form…"
//         value={query}
//         onChange={e => setQuery(e.target.value)}
//         aria-label="Search for products, coverages, or forms"
//       />
//       {results.map(r => {
//         const LabelComponent = getLabelComponent(r.type);
//         const nameTextClass = getNameTextClass(r.type);
//         return (
//           <ResultItem
//             key={`${r.type}-${r.id}`}
//             onClick={() => handleClick(r)}
//             tabIndex={0}
//             onKeyPress={e => e.key === 'Enter' && handleClick(r)}
//           >
//             <LabelComponent>{r.type}</LabelComponent>
//             <NameText className={nameTextClass}>{r.name}</NameText>
//             {renderBreadcrumb(r)}
//           </ResultItem>
//         );
//       })}
//     </SearchContainer>
//   );
// }

import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, collectionGroup, getDocs } from 'firebase/firestore';
import Fuse from 'fuse.js';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';

/* ---------- styled bits ---------- */
const SearchContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 1250px;
  margin: 0 auto;
`;

const SearchBox = styled.input`
  padding: 12px 40px 12px 16px;
  width: 100%;
  font-size: 16px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  margin-bottom: 16px;
  outline: none;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="%239ca3af" viewBox="0 0 16 16"><path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/></svg>')
    no-repeat 98% center;
  background-size: 16px;

  &:focus {
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  @media (max-width: 640px) {
    font-size: 14px;
    padding: 10px 36px 10px 14px;
  }
`;

const ResultItem = styled.div`
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 8px;
  background: #ffffff;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;

  &:hover {
    background: #f3f4f6;
    transform: translateX(2px);
  }

  &:focus {
    outline: none;
    background: #f3f4f6;
    border-color: #4f46e5;
  }
`;

const LabelProduct = styled.span`
  font-size: 11px;
  font-weight: 500;
  background: #2dd4bf; /* Teal for Products */
  color: #fff;
  padding: 2px 8px;
  border-radius: 5px;
  margin-right: 6px;
  text-transform: uppercase;
  line-height: 1.5;
  min-width: 80px;
  text-align: center;
`;

const LabelCoverage = styled.span`
  font-size: 11px;
  font-weight: 500;
  background: #a78bfa; /* Purple for Coverages */
  color: #fff;
  padding: 2px 8px;
  border-radius: 5px;
  margin-right: 6px;
  text-transform: uppercase;
  line-height: 1.5;
  min-width: 80px;
  text-align: center;
`;

const LabelForm = styled.span`
  font-size: 11px;
  font-weight: 500;
  background: #60a5fa; /* Blue for Forms */
  color: #fff;
  padding: 2px 8px;
  border-radius: 5px;
  margin-right: 6px;
  text-transform: uppercase;
  line-height: 1.5;
  min-width: 80px;
  text-align: center;
`;

const NameText = styled.span`
  font-size: 14px;
  margin-right: 8px;

  &.product {
    color: #000000; /* Black for Products */
    font-weight: 700; /* Bold for Products */
  }

  &.coverage {
    color: #4b5563; /* Slightly less gray for Coverages */
  }

  &.form {
    color: #4b5563; /* Same as Coverages for Forms */
    font-style: italic; /* Italicized for Forms */
  }
`;

const ArrowSeparator = styled.span`
  font-size: 14px;
  color: #6b7280;
  margin: 0 6px;
`;

const ProductText = styled.span`
  font-size: 13px;
  color: #6b7280;
  margin-left: 6px;
`;

/* ---------- component ---------- */
export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(null);
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  /* Build in-memory index once */
  useEffect(() => {
    (async () => {
      const productSnap = await getDocs(collection(db, 'products'));
      const productMap = Object.fromEntries(productSnap.docs.map(d => [d.id, d.data().name]));

      const coverageSnap = await getDocs(collectionGroup(db, 'coverages'));
      const formSnap = await getDocs(collection(db, 'forms'));

      const docs = [];

      // Products
      productSnap.docs.forEach(d => {
        docs.push({ id: d.id, name: d.data().name, type: 'Product' });
      });

      // Coverages
      for (const d of coverageSnap.docs) {
        const productId = d.ref.parent.parent.id;
        const coverageData = d.data();
        const productName = productMap[productId] || '';
        
        // Fetch forms associated with this coverage
        const formSnap = await getDocs(collection(db, 'forms'));
        const associatedForms = formSnap.docs.filter(f => {
          const formData = f.data();
          return formData.productId === productId && formData.formNumber === coverageData.formNumber;
        });

        // Determine if this is a base coverage
        const isBaseCoverage = coverageData.name === 'Base Coverage';

        if (isBaseCoverage && associatedForms.length === 1) {
          // Single product, base coverage: show coverage, product, and form
          const form = associatedForms[0].data();
          docs.push({
            id: d.id,
            name: coverageData.name,
            type: 'Coverage',
            productId,
            productName,
            form: form.formName || form.formNumber,
            formId: associatedForms[0].id
          });
        } else {
          // Multiple products/forms: create a line item for each combination
          associatedForms.forEach(formDoc => {
            const form = formDoc.data();
            docs.push({
              id: `${d.id}-${formDoc.id}`,
              name: coverageData.name,
              type: 'Coverage',
              productId,
              productName,
              form: form.formName || form.formNumber,
              formId: formDoc.id
            });
          });

          // If no forms are associated, still add the coverage with the product
          if (associatedForms.length === 0) {
            docs.push({
              id: d.id,
              name: coverageData.name,
              type: 'Coverage',
              productId,
              productName,
              form: null,
              formId: null
            });
          }
        }
      }

      // Forms
      for (const d of formSnap.docs) {
        const data = d.data();
        const productId = data.productId;
        const productName = productMap[productId] || '';
        docs.push({
          id: `${d.id}-${productId}`,
          name: data.formName || data.formNumber,
          type: 'Form',
          formNumber: data.formNumber,
          productId,
          productName
        });
      }

      setIndex(new Fuse(docs, { keys: ['name', 'formNumber', 'productName', 'form'], threshold: 0.3 }));
    })();
  }, []);

  /* Run search, limited to top 10 results */
  useEffect(() => {
    if (!index || !query.trim()) {
      setResults([]);
      return;
    }
    setResults(index.search(query).slice(0, 10).map(r => r.item));
  }, [query, index]);

  /* Click handler */
  const handleClick = item => {
    switch (item.type) {
      case 'Product':
        return navigate(`/coverage/${item.id}`);
      case 'Coverage':
        return navigate(`/coverage/${item.productId}`);
      case 'Form':
        return navigate(`/forms?formId=${item.id.split('-')[0]}`);
      default:
        return;
    }
  };

  const getLabelComponent = type => {
    switch (type) {
      case 'Product':
        return LabelProduct;
      case 'Coverage':
        return LabelCoverage;
      case 'Form':
        return LabelForm;
      default:
        return LabelProduct; // Fallback
    }
  };

  const getNameTextClass = type => {
    if (type === 'Product') return 'product';
    if (type === 'Coverage') return 'coverage';
    if (type === 'Form') return 'form';
    return 'product'; // Fallback
  };

  const renderBreadcrumb = item => {
    const items = [];
    if (item.type === 'Coverage') {
      if (item.productName) {
        items.push(
          <React.Fragment key="product">
            <ArrowSeparator>→</ArrowSeparator>
            <span className="ph-icon-product" title="Product"></span>
            <ProductText>{item.productName}</ProductText>
          </React.Fragment>
        );
      }
      if (item.form) {
        items.push(
          <React.Fragment key="form">
            <ArrowSeparator>→</ArrowSeparator>
            <span className="ph-icon-form" title="Form"></span>
            <ProductText>{item.form}</ProductText>
          </React.Fragment>
        );
      }
    } else if (item.type === 'Form' && item.productName) {
      items.push(
        <React.Fragment key="product">
          <ArrowSeparator>→</ArrowSeparator>
          <span className="ph-icon-product" title="Product"></span>
          <ProductText>{item.productName}</ProductText>
        </React.Fragment>
      );
    }
    return items;
  };

  return (
    <SearchContainer>
      <SearchBox
        placeholder="Search any product, coverage, or form…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        aria-label="Search for products, coverages, or forms"
      />
      {results.map(r => {
        const LabelComponent = getLabelComponent(r.type);
        const nameTextClass = getNameTextClass(r.type);
        return (
          <ResultItem
            key={`${r.type}-${r.id}`}
            onClick={() => handleClick(r)}
            tabIndex={0}
            onKeyPress={e => e.key === 'Enter' && handleClick(r)}
          >
            <LabelComponent>{r.type}</LabelComponent>
            <NameText className={nameTextClass}>{r.name}</NameText>
            {renderBreadcrumb(r)}
          </ResultItem>
        );
      })}
    </SearchContainer>
  );
}