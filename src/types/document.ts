export interface CardStyle {
  width: number
  padding: number
  fontFamilyId: string
  fontSize: number
  lineHeight: number
  textColor: string
  accentColor: string
  backgroundId: string
  backgroundColor: string
  radius: number
  shadowId: string
  codeThemeId: string
}
export interface CardDocument {
  schemaVersion: 1
  id: string
  markdown: string
  templateId: string
  styleOverrides: Partial<CardStyle>
  signature: { visible: boolean; author: string; source: string; dateText: string }
  assetIds: string[]
  updatedAt: string
}
export interface LocalAsset {
  id: string
  mime: 'image/png' | 'image/jpeg' | 'image/webp'
  name: string
  blob: Blob
  width: number
  height: number
}
