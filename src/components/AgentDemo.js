// src/components/AgentDemo.js
import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  SparklesIcon, 
  RocketLaunchIcon,
  CubeIcon,
  DocumentIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/solid';
// import { getAgentPrompts } from '../services/agentService';

// ============================================================================
// Styled Components
// ============================================================================

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 60px;
`;

const Title = styled.h1`
  font-size: 48px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 16px;
`;

const Subtitle = styled.p`
  font-size: 20px;
  color: #6b7280;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  margin-bottom: 60px;
`;

const FeatureCard = styled.div`
  background: white;
  border-radius: 16px;
  padding: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  }
`;

const FeatureIcon = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  
  svg {
    width: 28px;
    height: 28px;
    color: white;
  }
`;

const FeatureTitle = styled.h3`
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
`;

const FeatureDescription = styled.p`
  color: #6b7280;
  line-height: 1.6;
  margin-bottom: 20px;
`;

const ExamplePrompts = styled.div`
  margin-top: 16px;
`;

const ExampleTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
`;

const PromptTag = styled.span`
  display: inline-block;
  background: #f3f4f6;
  color: #374151;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  margin: 2px 4px 2px 0;
  border: 1px solid #d1d5db;
`;

const DemoSection = styled.div`
  background: #f9fafb;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
`;

const DemoTitle = styled.h2`
  font-size: 32px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 16px;
`;

const DemoDescription = styled.p`
  font-size: 18px;
  color: #6b7280;
  margin-bottom: 30px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
`;

const CallToAction = styled.div`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px 30px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  font-size: 16px;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
`;

// ============================================================================
// Main Component
// ============================================================================

export default function AgentDemo() {
  // const [selectedCategory, setSelectedCategory] = useState(null);
  
  const features = [
    {
      icon: <CubeIcon />,
      title: 'Product Management',
      description: 'Create, update, and manage insurance products with AI assistance. The agent can set up new products with coverages, forms, and pricing automatically.',
      examples: [
        'Create a new auto insurance product',
        'Add comprehensive coverage to existing product',
        'Update deductible options for homeowners'
      ]
    },
    {
      icon: <ShieldCheckIcon />,
      title: 'Coverage & Forms',
      description: 'Intelligently link coverages with forms and manage complex relationships between insurance components.',
      examples: [
        'Link liability form to all auto coverages',
        'Create umbrella coverage with $1M limits',
        'Add state-specific endorsements'
      ]
    },
    {
      icon: <CurrencyDollarIcon />,
      title: 'Pricing & Rules',
      description: 'Set up pricing structures and business rules with AI-powered validation and optimization suggestions.',
      examples: [
        'Create age-based auto discounts',
        'Add multi-policy discount rules',
        'Update base rates for property products'
      ]
    },
    {
      icon: <DocumentIcon />,
      title: 'Analysis & Insights',
      description: 'Get intelligent analysis of your product portfolio, identify gaps, and receive optimization recommendations.',
      examples: [
        'Analyze coverage gaps across products',
        'Find missing state filings',
        'Identify conflicting business rules'
      ]
    }
  ];

  return (
    <Container>
      <Header>
        <Title>Meet InsuranceAgent</Title>
        <Subtitle>
          Your AI-powered assistant for insurance product management. 
          Automate complex tasks, ensure compliance, and optimize your product portfolio 
          with intelligent, observable AI workflows.
        </Subtitle>
      </Header>

      <FeaturesGrid>
        {features.map((feature, index) => (
          <FeatureCard key={index}>
            <FeatureIcon>
              {feature.icon}
            </FeatureIcon>
            <FeatureTitle>{feature.title}</FeatureTitle>
            <FeatureDescription>{feature.description}</FeatureDescription>
            <ExamplePrompts>
              <ExampleTitle>Try these prompts:</ExampleTitle>
              {feature.examples.map((example, idx) => (
                <PromptTag key={idx}>{example}</PromptTag>
              ))}
            </ExamplePrompts>
          </FeatureCard>
        ))}
      </FeaturesGrid>

      <DemoSection>
        <DemoTitle>Ready to Experience Agentic AI?</DemoTitle>
        <DemoDescription>
          The InsuranceAgent widget is now available in the bottom-right corner of your screen. 
          Click on it to start automating your insurance product management tasks with AI.
        </DemoDescription>
        <CallToAction>
          <SparklesIcon style={{ width: 20, height: 20 }} />
          Look for the Agent Widget →
          <RocketLaunchIcon style={{ width: 20, height: 20 }} />
        </CallToAction>
      </DemoSection>
    </Container>
  );
}
