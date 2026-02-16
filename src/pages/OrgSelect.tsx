/**
 * Organization Selection Page
 * First-run page for org creation/selection
 * Route: /org/select
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import {
  BuildingOffice2Icon,
  PlusIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  SparklesIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { useRoleContext } from '../context/RoleContext';
import { createOrganization, acceptInvite, getPendingInvites, OrgInvite } from '../services/orgService';
import LoadingSpinner from '../components/ui/LoadingSpinner';

// ============ Animations ============
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
`;

// ============ Styled Components ============
const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #f1f5f9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const Container = styled.div`
  max-width: 520px;
  width: 100%;
  animation: ${fadeIn} 0.4s ease-out;
`;

const Card = styled.div`
  background: white;
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
  padding: 40px;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 32px;
`;

const Logo = styled.div`
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
  svg { width: 32px; height: 32px; color: white; }
`;

const Title = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 8px;
`;

const Subtitle = styled.p`
  font-size: 15px;
  color: #64748b;
  margin: 0;
`;

const Section = styled.div`
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2`
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 12px;
`;

const OrgButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: ${p => p.$variant === 'primary' ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'white'};
  color: ${p => p.$variant === 'primary' ? 'white' : '#1e293b'};
  border: ${p => p.$variant === 'primary' ? 'none' : '1px solid #e2e8f0'};
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  margin-bottom: 8px;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
  }
  
  svg { width: 20px; height: 20px; flex-shrink: 0; }
`;

const OrgInfo = styled.div`
  flex: 1;
  h3 { font-size: 15px; font-weight: 600; margin: 0 0 2px; }
  p { font-size: 13px; opacity: 0.8; margin: 0; }
`;

const Input = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  font-size: 15px;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #6366f1;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }
`;

const Message = styled.div<{ $type: 'error' | 'success' }>`
  padding: 12px 16px;
  border-radius: 10px;
  font-size: 14px;
  margin-bottom: 16px;
  background: ${p => p.$type === 'error' ? '#fef2f2' : '#f0fdf4'};
  color: ${p => p.$type === 'error' ? '#dc2626' : '#16a34a'};
  display: flex;
  align-items: center;
  gap: 8px;
  svg { width: 18px; height: 18px; }
`;

const InviteCard = styled.div`
  padding: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  margin-bottom: 12px;
`;

const InviteHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
`;

const InviteName = styled.h4`
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
`;

const InviteRole = styled.span`
  font-size: 12px;
  padding: 4px 8px;
  background: #e0e7ff;
  color: #4f46e5;
  border-radius: 6px;
  font-weight: 500;
`;

const AcceptButton = styled.button`
  padding: 8px 16px;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover { background: #4f46e5; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
`;

const Divider = styled.div`
  height: 1px;
  background: #e2e8f0;
  margin: 24px 0;
`;

// ============ Component ============
const OrgSelect: React.FC = () => {
  const navigate = useNavigate();
  const { user, userOrgs, hasOrg, currentOrg, orgLoading, loading: authLoading, switchOrg, refreshOrg } = useRoleContext();

  const [mode, setMode] = useState<'select' | 'create'>('select');
  const [newOrgName, setNewOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [acceptingInvite, setAcceptingInvite] = useState<string | null>(null);

  // Load pending invites after auth has fully settled (wait for authLoading to complete to avoid permission-denied)
  useEffect(() => {
    if (!user || authLoading) return;
    getPendingInvites().then(setInvites).catch(() => setInvites([]));
  }, [user, authLoading]);

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) {
      setMessage({ type: 'error', text: 'Please enter an organization name' });
      return;
    }

    try {
      setLoading(true);
      setMessage(null);
      const org = await createOrganization(newOrgName.trim());
      await refreshOrg();
      setMessage({ type: 'success', text: `Created "${org.name}" successfully!` });
      setTimeout(() => navigate('/'), 1500);
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to create organization' });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrg = async (orgId: string) => {
    try {
      setLoading(true);
      await switchOrg(orgId);
      navigate('/');
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to select organization' });
      setLoading(false);
    }
  };

  const handleAcceptInvite = async (inviteId: string) => {
    try {
      setAcceptingInvite(inviteId);
      await acceptInvite(inviteId);
      setInvites(prev => prev.filter(i => i.id !== inviteId));
      await refreshOrg();
      setMessage({ type: 'success', text: 'Invite accepted! Redirecting...' });
      setTimeout(() => navigate('/'), 1500);
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to accept invite' });
    } finally {
      setAcceptingInvite(null);
    }
  };

  if (orgLoading) {
    return (
      <Page>
        <LoadingSpinner label="Loading organizations..." />
      </Page>
    );
  }

  return (
    <Page>
      <Container>
        <Card>
          <Header>
            <Logo><SparklesIcon /></Logo>
            <Title>Welcome to Product Hub</Title>
            <Subtitle>
              {userOrgs.length === 0 && invites.length === 0
                ? 'Create your first organization to get started'
                : 'Select or create an organization'}
            </Subtitle>
          </Header>

          {message && (
            <Message $type={message.type}>
              <CheckCircleIcon />
              {message.text}
            </Message>
          )}

          {/* Pending Invites */}
          {invites.length > 0 && (
            <Section>
              <SectionTitle><EnvelopeIcon style={{ width: 14, marginRight: 6 }} />Pending Invites</SectionTitle>
              {invites.map(invite => (
                <InviteCard key={invite.id}>
                  <InviteHeader>
                    <InviteName>{invite.orgName}</InviteName>
                    <InviteRole>{invite.role}</InviteRole>
                  </InviteHeader>
                  <AcceptButton
                    onClick={() => handleAcceptInvite(invite.id)}
                    disabled={acceptingInvite === invite.id}
                  >
                    {acceptingInvite === invite.id ? 'Accepting...' : 'Accept Invite'}
                  </AcceptButton>
                </InviteCard>
              ))}
              <Divider />
            </Section>
          )}

          {/* Existing Orgs */}
          {userOrgs.length > 0 && (
            <Section>
              <SectionTitle>Your Organizations</SectionTitle>
              {userOrgs.map(({ org, membership }) => (
                <OrgButton
                  key={org.id}
                  onClick={() => handleSelectOrg(org.id)}
                  disabled={loading}
                >
                  <BuildingOffice2Icon />
                  <OrgInfo>
                    <h3>{org.name}</h3>
                    <p>{membership.role}</p>
                  </OrgInfo>
                  <ArrowRightIcon />
                </OrgButton>
              ))}
              <Divider />
            </Section>
          )}

          {/* Create New Org */}
          <Section>
            <SectionTitle>
              <PlusIcon style={{ width: 14, marginRight: 6 }} />
              {userOrgs.length > 0 ? 'Create Another Organization' : 'Create Your Organization'}
            </SectionTitle>

            <Input
              type="text"
              placeholder="Organization name"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateOrg()}
              disabled={loading}
            />

            <OrgButton
              $variant="primary"
              onClick={handleCreateOrg}
              disabled={loading || !newOrgName.trim()}
              style={{ marginTop: 12 }}
            >
              {loading ? (
                <>Creating...</>
              ) : (
                <>
                  <PlusIcon />
                  <OrgInfo>
                    <h3>Create Organization</h3>
                    <p>You'll be the admin</p>
                  </OrgInfo>
                </>
              )}
            </OrgButton>
          </Section>
        </Card>
      </Container>
    </Page>
  );
};

export default OrgSelect;

