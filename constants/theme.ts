// OWODE Design System — single source of truth.
// Every screen should pull colours, spacing and radii from here.

export const colors = {
  // Brand
  navy:        '#0d47a1',
  navyLight:   '#1565c0',
  navyDeep:    '#0a0a2e',
  gold:        '#f5a623',
  goldDark:    '#e8940f',

  // Surfaces
  bg:          '#f4f6fb',   // app background
  card:        '#ffffff',   // every card
  tint:        '#eaf2ff',   // light blue surface (icon circles, banners)
  track:       '#f0f2f7',   // progress tracks, dividers
  border:      '#e6eaf2',   // input borders, outlines

  // Text
  text:        '#1a2b4a',   // headings, values
  textMuted:   '#7c8aa5',   // labels, subtitles
  textFaint:   '#9aa5b8',   // placeholders, disabled
  onNavy:      '#ffffff',

  // Semantic
  success:     '#22c55e',   // money in, verified
  danger:      '#ef4444',   // money out, errors
  warning:     '#f5a623',   // pending, unverified
  successTint: '#e8f5e9',
  dangerTint:  '#ffebee',
  warningTint: '#fff8e1',
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 }

export const radius = { chip: 10, card: 16, hero: 20, pill: 100, circle: 999 }

export const font = {
  h1: 24, h2: 20, h3: 17, body: 15, small: 13, tiny: 11,
  bold: '700' as const, semi: '600' as const, heavy: '800' as const,
}

// Reusable style fragments — spread these into StyleSheet entries
export const shadow = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  hero: {
    shadowColor: colors.navy,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 6,
  },
}

export const card = {
  backgroundColor: colors.card,
  borderRadius: radius.card,
  padding: spacing.lg,
  ...shadow.card,
}

export const sectionTitle = {
  fontSize: font.body,
  fontWeight: font.bold,
  color: colors.text,
  marginBottom: spacing.md,
}

export const listRow = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: spacing.md,
  paddingVertical: 14,
}

export const divider = {
  borderBottomWidth: 1,
  borderBottomColor: colors.track,
}

export default { colors, spacing, radius, font, shadow, card, sectionTitle, listRow, divider }
