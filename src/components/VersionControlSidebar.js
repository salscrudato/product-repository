// VersionControlSidebar.js
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { collection, collectionGroup, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { getOpenAISummary } from '../api/openai';  // Uses Firebase Function to call OpenAI API

// Styled components for layout and styling
const SidebarContainer = styled.div`
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 380px;
  background: #ffffff;
  color: ${props => props.theme.colors.text};
  box-shadow: -6px 0 14px rgba(0,0,0,0.08);
  border-left: 1px solid ${props => props.theme.colors.border};
  transform: ${props => (props.open ? 'translateX(0)' : 'translateX(100%)')};
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  z-index: 1200;
`;

const SidebarHeader = styled.div`
  padding: 1rem;
  font-size: 1.25rem;
  font-weight: bold;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${props => props.theme.colors.text};
`;

/* Filter bar styling */
const FilterRow = styled.div`
  padding: 0.5rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  display: flex;
  gap: 0.5rem;
  align-items: center;
  background: ${props => props.theme.colors.backgroundAlt};
  border-radius: 8px;
  margin: 0.75rem 0.75rem 0;
  box-shadow: 0 1px 2px rgba(0,0,0,0.04);
`;
const FilterSelect = styled.select`
  padding: 0.25rem;
  font-size: 0.9rem;
`;
const FilterInput = styled.input`
  flex: 1;
  padding: 0.25rem 0.5rem;
  font-size: 0.9rem;
`;

/* Log list styling */
const HistoryList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
`;
const Bullet = styled.span`
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  margin-top: 4px;
  border-radius: 50%;
  background: ${({action}) =>
    action === 'create' ? '#10B981' :
    action === 'delete' ? '#EF4444' :
    action === 'update' ? '#F59E0B' : '#6366F1'};
`;
const LogEntry = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${props => props.theme.colors.border};
  font-size: 0.9rem;
  line-height: 1.4;

  &:last-of-type {
    border-bottom: none;
  }
`;

/* Chat area styling */
const ChatContainer = styled.div`
  border-top: 1px solid ${props => props.theme.colors.border};
  display: flex;
  flex-direction: column;
  padding: 0.75rem 1rem 0.75rem 0.75rem;
  background: ${props => props.theme.colors.backgroundAlt};
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  box-shadow: 0 -1px 3px rgba(0,0,0,0.04);
  min-height: 140px;
`;
const ChatMessages = styled.div`
  flex: 1 1 auto;
  overflow-y: auto;
  margin-bottom: 0.5rem;
`;
const UserMessage = styled.div`
  background: ${props => props.theme.colors.primaryLight};
  color: ${props => props.theme.colors.primaryText};
  padding: 0.5rem;
  border-radius: 4px;
  margin: 0.25rem 0;
`;
const AiMessage = styled.div`
  background: ${props => props.theme.colors.secondaryLight};
  color: ${props => props.theme.colors.secondaryText};
  padding: 0.5rem;
  border-radius: 4px;
  margin: 0.25rem 0;
`;
const ChatForm = styled.form`
  position: relative;
  width: 100%;
`;
const ChatInput = styled.textarea`
  width: 100%;
  height: 100px;           /* fill more of the shaded area */
  padding: 0.75rem 3.5rem 0.75rem 0.75rem; /* space for send button */
  font-size: 0.9rem;
  border-radius: 8px;
  border: 1px solid ${props => props.theme.colors.border};
  resize: none;
`;
const SendButton = styled.button`
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: ${props => props.theme.colors.primary};
  color: #fff;
  border: none;
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-weight: bold;
  border-radius: 4px;
`;

// Main component
const VersionControlSidebar = ({ open, onClose, productId }) => {
  const [logs, setLogs] = useState([]);
  const [userFilter, setUserFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [textFilter, setTextFilter] = useState('');
  // 'product' = current product only, 'all' = any product
  const [scope, setScope] = useState(productId ? 'product' : 'all');
  const [chatMessages, setChatMessages] = useState([]);   // { sender: 'user' | 'ai', text: '...' }
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    if (!open) return;
    let q;
    if (scope === 'product' && productId) {
      // product‑specific history
      q = query(
        collection(db, 'products', productId, 'versionHistory'),
        orderBy('ts', 'desc')
      );
    } else {
      // global history (cap at 250 docs)
      q = query(
        collectionGroup(db, 'versionHistory'),
        orderBy('ts', 'desc'),
        limit(250)
      );
    }
    const unsubscribe = onSnapshot(q, snapshot => {
      const entries = snapshot.docs.map(doc => doc.data());
      setLogs(entries);
    });
    return unsubscribe;
  }, [open, productId, scope]);

  // Filter the logs based on user selection
  const filteredLogs = logs.filter(log => {
    if (userFilter && log.userEmail !== userFilter) return false;
    if (entityFilter && log.entityType !== entityFilter) return false;
    if (textFilter) {
      const text = textFilter.toLowerCase();
      const target = (
        (log.entityName || '') + ' ' +
        (log.comment || '') + ' ' +
        JSON.stringify(log.changes || {})
      ).toLowerCase();
      if (!target.includes(text)) return false;
    }
    return true;
  });

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const question = chatInput.trim();
    // Add user message to chat history
    setChatMessages(msgs => [...msgs, { sender: 'user', text: question }]);
    setChatInput('');
    try {
      // Call OpenAI summarization (via cloud function helper)
      const answer = await getOpenAISummary(question, productId);
      setChatMessages(msgs => [...msgs, { sender: 'ai', text: answer }]);
    } catch (err) {
      console.error('AI summarization error:', err);
      setChatMessages(msgs => [...msgs, { sender: 'ai', text: "Sorry, I couldn't get the summary." }]);
    }
  };

  // Collect unique users and entity types from logs for filter dropdowns
  const users = Array.from(new Set(logs.map(l => l.userEmail))).sort();
  const entityTypes = Array.from(new Set(logs.map(l => l.entityType))).sort();

  return (
    <SidebarContainer open={open}>
      {/* Header with title and close button */}
      <SidebarHeader>
        Version Control
        <CloseButton onClick={onClose} aria-label="Close history panel">×</CloseButton>
      </SidebarHeader>

      {/* Filter controls */}
      <FilterRow>
        <FilterSelect value={scope} onChange={e => setScope(e.target.value)}>
          {productId && <option value="product">This Product</option>}
          <option value="all">All Products</option>
        </FilterSelect>
        <FilterSelect value={userFilter} onChange={e => setUserFilter(e.target.value)}>
          <option value="">All Users</option>
          {users.map(email => (
            <option key={email} value={email}>{email}</option>
          ))}
        </FilterSelect>
        <FilterSelect value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
          <option value="">All Pages</option>
          {entityTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </FilterSelect>
        <FilterInput 
          type="text" 
          placeholder="Search changes..." 
          value={textFilter} 
          onChange={e => setTextFilter(e.target.value)} 
        />
      </FilterRow>

      {/* Changelog list */}
      <HistoryList>
        {filteredLogs.map((log, idx) => (
          <LogEntry key={(log.ts?.seconds || log.ts) + '_' + idx}>
            <Bullet action={log.action} />
            <div style={{flex: 1}}>
              <strong>{log.userEmail}</strong> — {log.ts ? new Date(log.ts.toDate?.() || log.ts).toLocaleString() : ''}<br/>
              <em>{log.entityType} "{log.entityName}"</em> {log.action}{log.action === 'update' ? 'd' : 'd'}.
              {log.action === 'update' && log.changes ? (
                <> Changed:&nbsp;
                  {Object.keys(log.changes).map(field => (
                    <span key={field}>
                      <strong>{field}</strong> from "<i>{log.changes[field].before}</i>" to "<i>{log.changes[field].after}</i>";{' '}
                    </span>
                  ))}
                </>
              ) : null}
              {log.comment && <> <br/>Reason: {log.comment}</>}
            </div>
          </LogEntry>
        ))}
        {filteredLogs.length === 0 && (
          <p style={{ padding: '0.5rem 0' }}>No matching changes.</p>
        )}
      </HistoryList>

      {/* AI assistant chatbox */}
      <ChatContainer>
        <ChatMessages>
          {chatMessages.map((msg, i) =>
            msg.sender === 'user'
              ? <UserMessage key={i}>{msg.text}</UserMessage>
              : <AiMessage key={i}>{msg.text}</AiMessage>
          )}
        </ChatMessages>
        <ChatForm onSubmit={handleSendMessage}>
          <ChatInput 
            rows={1}
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            placeholder="Ask about the change log..."
          />
          <SendButton type="submit">Send</SendButton>
        </ChatForm>
      </ChatContainer>
    </SidebarContainer>
  );
};

export default VersionControlSidebar;

export const SIDEBAR_WIDTH = 380;   // for HistoryButton offset