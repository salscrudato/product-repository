import 'styled-components';
import { theme } from './styles/theme';

type ThemeType = typeof theme;

declare module 'styled-components' {
  export interface DefaultTheme extends ThemeType {
    // Ensure all theme properties are available
    colours: ThemeType['colours'];
    colors: ThemeType['colors'];
    fontFamily?: string;
    radiusSm: string;
    radiusLg: string;
    shadowXl: string;
  }
}

