import styled from 'styled-components';

// Card component
export const Card = styled.div`
  background: ${({ theme }) => theme.colours.background};
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: ${({ theme }) => theme.radius};
  padding: 24px;
  box-shadow: ${({ theme }) => theme.shadow};
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }
`;

// Input component
export const Input = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.colours.border};
  border-radius: ${({ theme }) => theme.radius};
  background: ${({ theme }) => theme.colours.background};
  color: ${({ theme }) => theme.colours.text};
  font-size: 14px;
  transition: all 0.3s ease;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.colours.primary};
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  &::placeholder {
    color: #9ca3af;
  }
`;

// Text components
export const Title = styled.h1`
  color: ${({ theme }) => theme.colours.text};
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 16px;
`;

export const Subtitle = styled.p`
  color: ${({ theme }) => theme.colours.secondaryText};
  font-size: 1rem;
  margin-bottom: 24px;
  line-height: 1.6;
`;
