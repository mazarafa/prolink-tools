import * as React from 'react';
import styled from '@emotion/styled';
import {css} from '@emotion/core';

type Props = React.HTMLAttributes<HTMLLabelElement> & {
  size?: 'sm' | 'md' | 'lg' | 'fit' | 'full';
  name?: string;
  description?: string;
};

const SIZES = {
  sm: '40px',
  md: '100px',
  lg: '250px',
  fit: 'max-content',
  full: '100%',
};

const Field = styled(({size, name, description, children, ...p}: Props) => (
  <label {...p}>
    {children}
    <div>
      {name}
      {description && <small>{description}</small>}
    </div>
  </label>
))<Props>`
  display: grid;
  align-items: center;
  grid-template-columns: ${p => SIZES[p.size ?? 'md']} ${p =>
      p.size !== 'full' && 'minmax(0, 1fr)'};
  grid-gap: 0.5rem 1rem;

  font-size: 0.75rem;
  padding: 1rem 1.5rem;

  ${p =>
    p.size !== 'full' &&
    css`
      > *:first-child {
        justify-self: center;
      }
    `}

  &:not(:last-child) {
    border-bottom: 1px solid #eee;
  }

  small {
    display: block;
    margin-top: 0.25rem;
    color: #888;
  }
`;

export default Field;
