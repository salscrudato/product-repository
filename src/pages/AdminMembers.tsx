/**
 * Admin Members Page
 * Organization member management for admins
 * Route: /admin/members
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  UserGroupIcon,
  PlusIcon,
  UserCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  TrashIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import MainNavigation from '../components/ui/Navigation';
import { PageContainer, PageContent } from '../components/ui/PageContainer';
import EnhancedHeader from '../components/ui/EnhancedHeader';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useRoleContext } from '../context/RoleContext';
import {
  listOrgMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  OrgMember,
  OrgRole,
  ORG_ROLES,
  ORG_ROLE_DISPLAY_NAMES,
} from '../services/orgService';

// ============ Styled Components ============
const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
`;

const Card = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e2e8f0;
`;

const CardTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  svg { width: 22px; height: 22px; color: #6366f1; }
`;

const InviteButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }
  svg { width: 18px; height: 18px; }
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const Th = styled.th`
  text-align: left;
  padding: 14px 24px;
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
`;

const Td = styled.td`
  padding: 16px 24px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 14px;
  color: #334155;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  svg { width: 36px; height: 36px; color: #94a3b8; }
`;

const UserDetails = styled.div`
  h4 { font-size: 14px; font-weight: 500; color: #1e293b; margin: 0 0 2px; }
  p { font-size: 12px; color: #94a3b8; margin: 0; }
`;

const RoleSelect = styled.select`
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 13px;
  color: #334155;
  background: white;
  cursor: pointer;
  
  &:focus { outline: none; border-color: #6366f1; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const StatusBadge = styled.span<{ $status: string }>`
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: ${p => p.$status === 'active' ? '#dcfce7' : p.$status === 'invited' ? '#fef3c7' : '#fee2e2'};
  color: ${p => p.$status === 'active' ? '#16a34a' : p.$status === 'invited' ? '#d97706' : '#dc2626'};
`;

const ActionButton = styled.button`
  padding: 6px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  color: #94a3b8;
  transition: all 0.2s;
  
  &:hover { background: #fee2e2; color: #dc2626; }
  svg { width: 18px; height: 18px; }
`;

const Message = styled.div<{ $type: 'success' | 'error' }>`
  padding: 12px 20px;
  margin: 0 24px 16px;
  border-radius: 10px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: ${p => p.$type === 'error' ? '#fef2f2' : '#f0fdf4'};
  color: ${p => p.$type === 'error' ? '#dc2626' : '#16a34a'};
  svg { width: 18px; height: 18px; }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalCard = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
  width: 100%;
  max-width: 440px;
  padding: 28px;
`;

const ModalTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 20px;
`;

const FormGroup = styled.div`
  margin-bottom: 16px;
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 6px;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;

  &:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 14px;
  background: white;

  &:focus { outline: none; border-color: #6366f1; }
`;

const ModalButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

const CancelButton = styled.button`
  flex: 1;
  padding: 12px;
  background: #f1f5f9;
  color: #64748b;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover { background: #e2e8f0; }
`;

const SubmitButton = styled.button`
  flex: 1;
  padding: 12px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;

  &:hover { transform: translateY(-1px); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 48px 24px;
  color: #64748b;

  svg { width: 48px; height: 48px; color: #cbd5e1; margin-bottom: 16px; }
  h3 { font-size: 16px; font-weight: 500; color: #334155; margin: 0 0 8px; }
  p { font-size: 14px; margin: 0; }
`;

// ============ Component ============
const AdminMembers: React.FC = () => {
  const navigate = useNavigate();
  const { currentOrg, isOrgAdmin, orgLoading, user } = useRoleContext();

  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [updatingMember, setUpdatingMember] = useState<string | null>(null);

  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<OrgRole>('viewer');
  const [inviting, setInviting] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!currentOrg) return;
    try {
      setLoading(true);
      const result = await listOrgMembers(currentOrg.id);
      setMembers(result);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load members' });
    } finally {
      setLoading(false);
    }
  }, [currentOrg]);

  useEffect(() => {
    if (currentOrg && isOrgAdmin) {
      fetchMembers();
    }
  }, [currentOrg, isOrgAdmin, fetchMembers]);

  const handleRoleChange = async (memberId: string, newRole: OrgRole) => {
    if (!currentOrg) return;
    try {
      setUpdatingMember(memberId);
      setMessage(null);
      await updateMemberRole(currentOrg.id, memberId, newRole);
      setMessage({ type: 'success', text: 'Role updated successfully' });
      await fetchMembers();
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to update role' });
    } finally {
      setUpdatingMember(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!currentOrg || !confirm('Are you sure you want to remove this member?')) return;
    try {
      setUpdatingMember(memberId);
      await removeMember(currentOrg.id, memberId);
      setMessage({ type: 'success', text: 'Member removed' });
      await fetchMembers();
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to remove member' });
    } finally {
      setUpdatingMember(null);
    }
  };

  const handleInvite = async () => {
    if (!currentOrg || !inviteEmail.trim()) return;
    try {
      setInviting(true);
      await inviteMember(currentOrg.id, inviteEmail.trim(), inviteRole);
      setMessage({ type: 'success', text: `Invite sent to ${inviteEmail}` });
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('viewer');
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to send invite' });
    } finally {
      setInviting(false);
    }
  };

  if (orgLoading || loading) {
    return (
      <PageContainer>
        <MainNavigation />
        <PageContent>
          <LoadingSpinner label="Loading members..." />
        </PageContent>
      </PageContainer>
    );
  }

  if (!currentOrg) {
    return (
      <PageContainer>
        <MainNavigation />
        <PageContent>
          <Message $type="error">
            <ExclamationCircleIcon />
            No organization selected. Please select an organization first.
          </Message>
        </PageContent>
      </PageContainer>
    );
  }

  if (!isOrgAdmin) {
    return (
      <PageContainer>
        <MainNavigation />
        <PageContent>
          <Message $type="error">
            <ExclamationCircleIcon />
            You don't have permission to manage members.
          </Message>
        </PageContent>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <MainNavigation />
      <PageContent>
        <Container>
          <EnhancedHeader
            title="Team Members"
            subtitle={`Manage members of ${currentOrg.name}`}
            icon={UserGroupIcon}
            showBackButton
            onBackClick={() => navigate(-1)}
          />

          <Card>
            <CardHeader>
              <CardTitle>
                <UserGroupIcon />
                Members ({members.filter(m => m.status === 'active').length})
              </CardTitle>
              <InviteButton onClick={() => setShowInviteModal(true)}>
                <PlusIcon />
                Invite Member
              </InviteButton>
            </CardHeader>

            {message && (
              <Message $type={message.type}>
                {message.type === 'success' ? <CheckCircleIcon /> : <ExclamationCircleIcon />}
                {message.text}
              </Message>
            )}

            {members.length === 0 ? (
              <EmptyState>
                <UserGroupIcon />
                <h3>No members yet</h3>
                <p>Invite team members to collaborate</p>
              </EmptyState>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Member</Th>
                    <Th>Role</Th>
                    <Th>Status</Th>
                    <Th>Joined</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {members.map(member => (
                    <tr key={member.id}>
                      <Td>
                        <UserInfo>
                          <UserCircleIcon />
                          <UserDetails>
                            <h4>{member.displayName || member.email}</h4>
                            <p>{member.email}</p>
                          </UserDetails>
                        </UserInfo>
                      </Td>
                      <Td>
                        <RoleSelect
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as OrgRole)}
                          disabled={updatingMember === member.id || member.userId === user?.uid}
                        >
                          {ORG_ROLES.map(role => (
                            <option key={role} value={role}>
                              {ORG_ROLE_DISPLAY_NAMES[role]}
                            </option>
                          ))}
                        </RoleSelect>
                      </Td>
                      <Td>
                        <StatusBadge $status={member.status}>{member.status}</StatusBadge>
                      </Td>
                      <Td>
                        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '—'}
                      </Td>
                      <Td>
                        {member.userId !== user?.uid && (
                          <ActionButton
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={updatingMember === member.id}
                            title="Remove member"
                          >
                            <TrashIcon />
                          </ActionButton>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </Container>

        {/* Invite Modal */}
        {showInviteModal && (
          <ModalOverlay onClick={() => setShowInviteModal(false)}>
            <ModalCard onClick={(e) => e.stopPropagation()}>
              <ModalTitle>Invite Team Member</ModalTitle>

              <FormGroup>
                <Label>Email address</Label>
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </FormGroup>

              <FormGroup>
                <Label>Role</Label>
                <Select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as OrgRole)}
                >
                  {ORG_ROLES.map(role => (
                    <option key={role} value={role}>
                      {ORG_ROLE_DISPLAY_NAMES[role]}
                    </option>
                  ))}
                </Select>
              </FormGroup>

              <ModalButtons>
                <CancelButton onClick={() => setShowInviteModal(false)}>
                  Cancel
                </CancelButton>
                <SubmitButton
                  onClick={handleInvite}
                  disabled={inviting || !inviteEmail.trim()}
                >
                  {inviting ? 'Sending...' : 'Send Invite'}
                </SubmitButton>
              </ModalButtons>
            </ModalCard>
          </ModalOverlay>
        )}
      </PageContent>
    </PageContainer>
  );
};

export default AdminMembers;

