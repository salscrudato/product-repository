import styled from 'styled-components';

export const TextInput = styled.input`
  width:100%;
  padding:12px;
  font-size:16px;
  border:1px solid #E5E7EB;
  border-radius:${({ theme }) => theme.radius};
  outline:none;
  &:focus{
    border-color:${({ theme }) => theme.colours.primary};
    box-shadow:0 0 0 2px rgba(29,78,216,0.1);
  }
  &::placeholder{ color:#6B7280; }
`;