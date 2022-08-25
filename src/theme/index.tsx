import { transparentize } from 'polished'
import React, { useMemo } from 'react'
import { Text, TextProps } from 'rebass'
import styled, {
  createGlobalStyle,
  css,
  DefaultTheme,
  ThemeProvider as StyledComponentsThemeProvider,
} from 'styled-components'

import { Colors } from './styled'

export * from './components'

const MEDIA_WIDTHS = {
  upToExtraSmall: 500,
  upToSmall: 720,
  upToMedium: 960,
  upToLarge: 1280,
}

const mediaWidthTemplates: { [width in keyof typeof MEDIA_WIDTHS]: typeof css } = Object.keys(MEDIA_WIDTHS).reduce(
  (accumulator, size) => {
    ;(accumulator as any)[size] = (a: any, b: any, c: any) => css`
      @media (max-width: ${(MEDIA_WIDTHS as any)[size]}px) {
        ${css(a, b, c)}
      }
    `
    return accumulator
  },
  {}
) as any

const white = '#FFFFFF'
const black = '#000000'

export function colors(darkMode: boolean): Colors {
  return {
    // base
    white,
    black,

    // text
    text1: '#ffffff',
    text2: '#9A9C9D',
    text3: 'rgba(255, 255, 255, 0.3)',

    // backgrounds
    bg1: 'rgba(0, 86, 71, 0.6)',
    bg2: 'rgba(0, 86, 71, 0.84)',
    buttonBg1: 'linear-gradient(119.42deg, #F89800 7.07%, #004A56 78.91%)',
    buttonBg2: 'linear-gradient(136.13deg, #207375 12.9%, #004A56 100%)',
    payFormBg: 'rgba(0, 86, 71, 0.6)',
    registerFormBg: 'rgba(0, 86, 71, 0.84)',
    formFieldBg: 'rgba(33, 33, 33, 0.6)',

    //specialty colors
    modalBG: 'rgba(0,0,0,0.3)',

    //primary colors
    primary1: '#8878C3',
    primary2: '#FF8CC3',
    primary3: '#FF99C9',
    primary4: '#F6DDE8',
    primary5: '#E3DFF3',

    // color text
    primaryText1: '#ffffff',

    // other
    red1: '#FD4040',
    red2: '#F82D3A',
    red3: '#D60000',
  }
}

export function theme(darkMode: boolean): DefaultTheme {
  return {
    ...colors(darkMode),

    grids: {
      sm: 8,
      md: 12,
      lg: 24,
    },

    //shadows
    shadow1: 'rgba(0, 0, 0, 0.15)',

    // media queries
    mediaWidth: mediaWidthTemplates,

    // css snippets
    flexColumnNoWrap: css`
      display: flex;
      flex-flow: column nowrap;
    `,
    flexRowNoWrap: css`
      display: flex;
      flex-flow: row nowrap;
    `,
  }
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeObject = useMemo(() => theme(false), [false])

  return <StyledComponentsThemeProvider theme={themeObject}>{children}</StyledComponentsThemeProvider>
}

const TextWrapper = styled(Text)<{ color: keyof Colors }>`
  color: ${({ color, theme }) => (theme as any)[color]};
`

export const TYPE = {
  main(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'text2'} {...props} />
  },
  link(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'primary1'} {...props} />
  },
  black(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'text1'} {...props} />
  },
  white(props: TextProps) {
    return <TextWrapper fontWeight={500} color={'white'} {...props} />
  },
  body(props: TextProps) {
    return <TextWrapper fontWeight={400} fontSize={16} color={'text1'} {...props} />
  },
  h1(props: TextProps) {
    return <TextWrapper fontWeight={600} fontSize={48} {...props} />
  },
  h2(props: TextProps) {
    return <TextWrapper fontWeight={600} fontSize={36} {...props} />
  },
  h3(props: TextProps) {
    return <TextWrapper fontWeight={600} fontSize={32} {...props} />
  },
  h4(props: TextProps) {
    return <TextWrapper fontWeight={600} fontSize={28} {...props} />
  },
  h5(props: TextProps) {
    return <TextWrapper fontWeight={600} fontSize={24} {...props} />
  },
  h6(props: TextProps) {
    return <TextWrapper fontWeight={600} fontSize={18} {...props} />
  },
  label(props: TextProps) {
    return <TextWrapper fontWeight={600} fontSize={11} {...props} />
  },
  small(props: TextProps) {
    return <TextWrapper fontWeight={500} fontSize={9} {...props} />
  },
  error({ error, ...props }: { error: boolean } & TextProps) {
    return <TextWrapper fontWeight={500} color={error ? 'red1' : 'text2'} {...props} />
  },
}

export const FixedGlobalStyle = createGlobalStyle`
html, input, textarea, button {
  font-family: 'Inter', sans-serif;
  font-display: fallback;
}

html,
body {
  margin: 0;
  padding: 0;
}

 a {
   color: ${colors(false).white}; 
 }

* {
  box-sizing: border-box;
}

button {
  user-select: none;
}

html {
  font-size: 16px;
  font-variant: none;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0);
  font-feature-settings: 'ss01' on, 'ss02' on, 'cv01' on, 'cv03' on;
}
`

export const ThemedGlobalStyle = createGlobalStyle`
html {
  color: ${({ theme }) => theme.text1};
  background-color: ${({ theme }) => theme.bg2};
}

body {
  min-height: 100vh;
  background-position: 0 -30vh;
  background-repeat: no-repeat;
  background-image: ${({ theme }) =>
    `radial-gradient(50% 50% at 50% 50%, ${transparentize(0.9, theme.primary1)} 0%, ${transparentize(
      1,
      theme.bg1
    )} 100%)`};
}
`
