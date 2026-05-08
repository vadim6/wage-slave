import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  FileChild,
  LevelFormat,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { CV_DESIGN as D } from './design'
import type { ResolvedCV, ResolvedExperience, ResolvedProject } from '@/types/cv'

const ACCENT = D.colors.accent
const DARK   = D.colors.dark
const MID    = D.colors.mid
const MUTED  = D.colors.muted
const FONT   = D.fonts.primary

function hexColor(hex: string): string {
  return hex.replace('#', '')
}

function hyperlinkRun(text: string, opts: { font: string; size: number }): TextRun {
  return new TextRun({ ...opts, text, color: hexColor(ACCENT), underline: {} })
}

function inlineRuns(text: string, baseOpts: { font: string; size: number; color: string }): (TextRun | ExternalHyperlink)[] {
  const parts = text.split(/(\[[^\]]+\]\([^)]+\))/g)
  return parts.map(part => {
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/)
    if (m) {
      return new ExternalHyperlink({
        link: m[2],
        children: [hyperlinkRun(m[1], { font: baseOpts.font, size: baseOpts.size })],
      })
    }
    return new TextRun({ ...baseOpts, text: part })
  })
}

function spacer(size = 40): Paragraph {
  return new Paragraph({ spacing: { before: size, after: 0 }, children: [] })
}

function accentRule(): Paragraph {
  return new Paragraph({
    border: { bottom: { color: hexColor(ACCENT), size: 6, style: BorderStyle.SINGLE } },
    spacing: { before: 0, after: 60 },
    children: [],
  })
}

function sectionHeading(text: string): Paragraph[] {
  return [
    new Paragraph({
      spacing: { before: 160, after: 0 },
      children: [
        new TextRun({
          text: text.toUpperCase(),
          font: FONT,
          size: D.fonts.sizes.heading * 2,
          bold: true,
          color: hexColor(ACCENT),
        }),
      ],
    }),
    accentRule(),
  ]
}

function toAbsoluteUrl(val: string): string {
  return val.startsWith('http') ? val : `https://${val}`
}

function buildHeader(meta: ResolvedCV['meta']): Paragraph[] {
  const contactSize = D.fonts.sizes.contact * 2
  const sep = new TextRun({ text: '  |  ', font: FONT, size: contactSize, color: hexColor(MID) })

  const plainParts = [meta.email, meta.phone, meta.location].filter(Boolean)
  const contactChildren: (TextRun | ExternalHyperlink)[] = [
    new TextRun({ text: plainParts.join('  |  '), font: FONT, size: contactSize, color: hexColor(MID) }),
  ]
  if (meta.linkedin) {
    contactChildren.push(sep, new ExternalHyperlink({
      link: toAbsoluteUrl(meta.linkedin),
      children: [hyperlinkRun(meta.linkedin, { font: FONT, size: contactSize })],
    }))
  }
  if (meta.github) {
    contactChildren.push(sep, new ExternalHyperlink({
      link: toAbsoluteUrl(meta.github),
      children: [hyperlinkRun(meta.github, { font: FONT, size: contactSize })],
    }))
  }

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 40 },
      children: [
        new TextRun({
          text: meta.name,
          font: FONT,
          size: D.fonts.sizes.name * 2,
          bold: true,
          color: hexColor(DARK),
        }),
      ],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 20 },
      children: contactChildren,
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 0, after: 20 },
      children: [
        new TextRun({
          text: meta.languages.join('  ·  '),
          font: FONT,
          size: D.fonts.sizes.meta * 2,
          color: hexColor(MUTED),
          italics: true,
        }),
      ],
    }),
    accentRule(),
  ]
}

function buildSummary(summary: string): Paragraph[] {
  return [
    ...sectionHeading('Professional Summary'),
    new Paragraph({
      spacing: { before: 0, after: 80 },
      children: [
        new TextRun({
          text: summary,
          font: FONT,
          size: D.fonts.sizes.body * 2,
          color: hexColor(DARK),
        }),
      ],
    }),
  ]
}

function buildSkills(skills: { category: string; value: string }[]): FileChild[] {
  if (skills.length === 0) return []

  const rows: TableRow[] = []
  for (let i = 0; i < skills.length; i += 2) {
    const left = skills[i]
    const right = skills[i + 1]

    const makeCell = (skill: { category: string; value: string } | undefined): TableCell => {
      if (!skill) return new TableCell({ children: [], width: { size: 50, type: WidthType.PERCENTAGE } })
      return new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
        children: [
          new Paragraph({
            spacing: { before: 20, after: 20 },
            children: [
              new TextRun({ text: `${skill.category}: `, font: FONT, size: D.fonts.sizes.body * 2, bold: true, color: hexColor(DARK) }),
              new TextRun({ text: skill.value, font: FONT, size: D.fonts.sizes.body * 2, color: hexColor(MID) }),
            ],
          }),
        ],
      })
    }

    rows.push(new TableRow({ children: [makeCell(left), makeCell(right)] }))
  }

  return [
    ...sectionHeading('Core Competencies'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
      rows,
    }),
    spacer(80),
  ]
}

function buildExperience(experience: ResolvedExperience[]): FileChild[] {
  const paras: Paragraph[] = [...sectionHeading('Professional Experience')]

  for (const job of experience) {
    const includedBullets = job.bullets.filter(b => b.included)

    paras.push(
      new Paragraph({
        spacing: { before: 120, after: 0 },
        children: [
          new TextRun({ text: job.company, font: FONT, size: D.fonts.sizes.heading * 2, bold: true, color: hexColor(DARK) }),
          ...(job.companyMeta ? [
            new TextRun({ text: `  —  ${job.companyMeta}`, font: FONT, size: D.fonts.sizes.body * 2, color: hexColor(MUTED), italics: true }),
          ] : []),
        ],
      }),
    )

    paras.push(
      new Paragraph({
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({ text: job.title, font: FONT, size: D.fonts.sizes.jobTitle * 2, bold: true, color: hexColor(ACCENT) }),
          new TextRun({ text: `   ${job.period}   ${job.location}`, font: FONT, size: D.fonts.sizes.meta * 2, color: hexColor(MUTED) }),
        ],
      }),
    )

    if (job.award) {
      paras.push(
        new Paragraph({
          spacing: { before: 20, after: 0 },
          children: [
            new TextRun({ text: job.award, font: FONT, size: D.fonts.sizes.small * 2, color: hexColor(ACCENT), italics: true }),
          ],
        }),
      )
    }

    if (job.note) {
      paras.push(
        new Paragraph({
          spacing: { before: 20, after: 0 },
          children: [
            new TextRun({ text: job.note, font: FONT, size: D.fonts.sizes.body * 2, color: hexColor(MID), italics: true }),
          ],
        }),
      )
    }

    for (const bullet of includedBullets) {
      paras.push(
        new Paragraph({
          numbering: { reference: 'cv-bullets', level: 0 },
          spacing: { before: 20, after: 20 },
          children: inlineRuns(bullet.text, { font: FONT, size: D.fonts.sizes.body * 2, color: hexColor(DARK) }),
        }),
      )
    }
  }

  return paras
}

function buildProjects(projects: ResolvedProject[]): FileChild[] {
  if (projects.length === 0) return []

  const paras: Paragraph[] = [...sectionHeading('Projects')]

  for (const proj of projects) {
    const titleRun = proj.url
      ? new ExternalHyperlink({ link: proj.url, children: [new TextRun({ text: proj.title, font: FONT, size: D.fonts.sizes.body * 2, bold: true, color: hexColor(ACCENT), underline: {} })] })
      : new TextRun({ text: proj.title, font: FONT, size: D.fonts.sizes.body * 2, bold: true, color: hexColor(DARK) })
    paras.push(
      new Paragraph({
        spacing: { before: 80, after: 0 },
        children: [
          titleRun,
          new TextRun({ text: `  [${proj.status}]`, font: FONT, size: D.fonts.sizes.small * 2, color: hexColor(MUTED) }),
        ],
      }),
    )
    paras.push(
      new Paragraph({
        spacing: { before: 20, after: 0 },
        children: inlineRuns(proj.text, { font: FONT, size: D.fonts.sizes.body * 2, color: hexColor(MID) }),
      }),
    )
  }

  return paras
}

export async function generateDocx(cv: ResolvedCV): Promise<Buffer> {
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'cv-bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 360, hanging: 180 },
                },
                run: {
                  font: FONT,
                  size: D.fonts.sizes.body * 2,
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: D.docx.pageWidth, height: 15840 },
            margin: {
              top: D.docx.margins,
              bottom: D.docx.margins,
              left: D.docx.margins,
              right: D.docx.margins,
            },
          },
        },
        children: [
          ...buildHeader(cv.meta),
          ...buildSummary(cv.summary),
          ...buildSkills(cv.skills),
          ...buildExperience(cv.experience),
          ...buildProjects(cv.projects),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  return Buffer.from(buffer)
}
