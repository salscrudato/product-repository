/**
 * Role Management Admin Panel
 * Admin-only component for managing user roles
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { 
  UserCircleIcon, 
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { 
  listUsersWithRoles, 
  setUserRole, 
  UserWithRole, 
  UserRole, 
  ROLES,
  ROLE_DISPLAY_NAMES,
  ROLE_DESCRIPTIONS
} from '../../services/roleService';
import { useRoleContext } from '../../context/RoleContext';
import LoadingSpinner from '../ui/LoadingSpinner';

const Container = styled.div`
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
`;

const UserTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
`;

const Th = styled.th`
  text-align: left;
  padding: 16px;
  background: #f8fafc;
  font-weight: 600;
  color: #64748b;
  font-size: 13px;
  border-bottom: 1px solid #e2e8f0;
`;

const Td = styled.td`
  padding: 16px;
  border-bottom: 1px solid #f1f5f9;
  color: #334155;
  font-size: 14px;
`;

const RoleSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  cursor: pointer;
  
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const StatusBadge = styled.span<{ $success?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  background: ${props => props.$success ? '#dcfce7' : '#fee2e2'};
  color: ${props => props.$success ? '#166534' : '#991b1b'};
`;

const Message = styled.div<{ $type: 'success' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 24px;
  background: ${props => props.$type === 'success' ? '#dcfce7' : '#fee2e2'};
  color: ${props => props.$type === 'success' ? '#166534' : '#991b1b'};
`;

const RoleManagement: React.FC = () => {
  const { isAdmin, loading: roleLoading } = useRoleContext();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await listUsersWithRoles();
      setUsers(result.users);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setUpdating(userId);
      setMessage(null);
      await setUserRole(userId, newRole);
      setMessage({ type: 'success', text: 'Role updated successfully' });
      await fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to update role' });
    } finally {
      setUpdating(null);
    }
  };

  if (roleLoading || loading) {
    return <LoadingSpinner label="Loading..." />;
  }

  if (!isAdmin) {
    return (
      <Container>
        <Message $type="error">
          <ExclamationCircleIcon width={20} />
          You do not have permission to access this page.
        </Message>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <ShieldCheckIcon width={32} color="#6366f1" />
        <Title>Role Management</Title>
      </Header>

      {message && (
        <Message $type={message.type}>
          {message.type === 'success' ? <CheckCircleIcon width={20} /> : <ExclamationCircleIcon width={20} />}
          {message.text}
        </Message>
      )}

      <UserTable>
        <thead>
          <tr>
            <Th>User</Th>
            <Th>Role</Th>
            <Th>Last Sign In</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.uid}>
              <Td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <UserCircleIcon width={32} color="#94a3b8" />
                  <div>
                    <div style={{ fontWeight: 500 }}>{user.email || 'Anonymous'}</div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>{user.uid.slice(0, 8)}...</div>
                  </div>
                </div>
              </Td>
              <Td>
                <RoleSelect
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.uid, e.target.value as UserRole)}
                  disabled={updating === user.uid}
                >
                  {ROLES.map(role => (
                    <option key={role} value={role} title={ROLE_DESCRIPTIONS[role]}>
                      {ROLE_DISPLAY_NAMES[role]}
                    </option>
                  ))}
                </RoleSelect>
              </Td>
              <Td>{user.lastSignIn ? new Date(user.lastSignIn).toLocaleDateString() : 'Never'}</Td>
              <Td>
                <StatusBadge $success={!user.disabled}>
                  {user.disabled ? 'Disabled' : 'Active'}
                </StatusBadge>
              </Td>
            </tr>
          ))}
        </tbody>
      </UserTable>
    </Container>
  );
};

export default RoleManagement;

