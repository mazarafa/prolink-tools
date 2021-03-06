import {css} from '@emotion/core';

import fonts from 'src/shared/fonts';

const globalCss = css`
  html,
  body,
  body > div {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
    min-height: 100%;
    margin: 0;
    padding: 0;
    color: #28272b;
  }

  ${fonts};

  * {
    box-sizing: border-box;
  }

  :root {
    font-size: 16px;
    font-family: 'DM Mono';
    line-height: 1.2;
  }

  input,
  button,
  textarea,
  :focus {
    outline: none;
  }

  button {
    font-family: 'DM Mono';
    transition: background 200ms, color 200ms;
    cursor: pointer;
  }

  a {
    cursor: pointer;
    color: #4b97f8;
    transition: color 200ms;

    &:hover {
      color: #3371bf;
    }
  }

  p {
    line-height: 1.3;
  }
`;

const noSelect = css`
  *,
  *::after,
  *::before {
    -webkit-user-select: none;
    -webkit-user-drag: none;
    -webkit-app-region: no-drag;
  }
`;

export default globalCss;

export {noSelect};
