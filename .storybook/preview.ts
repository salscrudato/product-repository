/**
 * Storybook Preview Configuration
 * Global settings and decorators for all stories
 */

import type { Preview } from '@storybook/react';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i
      }
    },
    viewport: {
      viewports: {
        mobile: {
          name: 'Mobile',
          styles: {
            width: '375px',
            height: '667px'
          },
          type: 'mobile'
        },
        tablet: {
          name: 'Tablet',
          styles: {
            width: '768px',
            height: '1024px'
          },
          type: 'tablet'
        },
        desktop: {
          name: 'Desktop',
          styles: {
            width: '1280px',
            height: '720px'
          },
          type: 'desktop'
        }
      }
    },
    backgrounds: {
      default: 'light',
      values: [
        {
          name: 'light',
          value: '#ffffff'
        },
        {
          name: 'dark',
          value: '#111827'
        },
        {
          name: 'gray',
          value: '#f3f4f6'
        }
      ]
    },
    a11y: {
      config: {
        rules: [
          {
            id: 'color-contrast',
            enabled: true
          },
          {
            id: 'valid-aria-role',
            enabled: true
          },
          {
            id: 'button-name',
            enabled: true
          }
        ]
      },
      options: {
        checks: { 'valid-aria-role': { options: { allowedRoles: ['status'] } } },
        runOnly: { type: 'tag', values: ['wcag2aa'] }
      }
    }
  },
  decorators: [
    (Story) => (
      <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <Story />
      </div>
    )
  ]
};

export default preview;

