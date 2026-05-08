export const CV_DESIGN = {
  colors: {
    accent:        '#0E7C7B',
    dark:          '#1A1A2E',
    mid:           '#444444',
    muted:         '#777777',
    light:         '#F0F7F7',
    rewrite:       '#FFF9E6',
    rewriteBorder: '#F5A623',
  },
  fonts: {
    primary: 'Arial',
    // pt — CSS: `${n}pt`, DOCX half-points: n * 2
    sizes: {
      name:     26,
      heading:  12,
      body:     10,
      jobTitle: 11,
      meta:      8,
      small:     9,
    },
  },
  spacing: {
    sectionGap: '14px',
    bulletGap:  '3px',
    companyGap: '12px',
  },
  // docx-js layout units: DXA (1440 = 1 inch)
  docx: {
    pageWidth:    12240,
    margins:      1080,
    contentWidth: 10080,
  },
} as const
