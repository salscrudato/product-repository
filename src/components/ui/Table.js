import styled from 'styled-components';

/** Table Styling **/
export const Table = styled.table`
  width: 100%;
  background: ${({ theme }) => theme.colours.bg};
  border-radius: ${({ theme }) => theme.radius};
  border-collapse: collapse;
  box-shadow: ${({ theme }) => theme.shadow};
`;

export const THead = styled.thead`
  background: ${({ theme }) => theme.colours.tableHeader};
`;

export const Tr = styled.tr`
  border-bottom: 1px solid #e5e7eb;
`;

export const Th = styled.th`
  padding: 12px;
  text-align: ${({ align = 'left' }) => align};
  font-size: 14px;
  font-weight: 500;
  color: #6b7280;
`;

export const Td = styled.td`
  padding: 12px;
  text-align: ${({ align = 'left' }) => align};
  font-size: 14px;
`;

/** Modal & Overlay **/
export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);          /* dim only backdrop */
  backdrop-filter: blur(2px);            /* subtle gaussian blur */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

export const Modal = styled.div`
  position: relative;
  z-index: 1010;                         /* higher than overlay */
  background: #ffffff;                   /* crisp white */
  border-radius: ${({ theme }) => theme.radius};
  padding: 24px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0,0,0,0.14);
`;

export const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

export const ModalTitle = styled.h3`
  margin: 0;
  font-size: 20px;
  font-weight: 600;
`;

export const CloseBtn = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
`;