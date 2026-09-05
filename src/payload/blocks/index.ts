import type { Block } from 'payload'

import {
  ArticleListBlock,
  CommitmentListBlock,
  FeaturedArticleBlock,
  FeaturedProjectBlock,
  ProjectGridBlock,
  ServiceListBlock,
} from './collections'
import {
  ImageBlock,
  ImageTextBlock,
  NoticeNoteBlock,
  QuoteBlock,
  RichTextBlock,
  SpacerBlock,
} from './content'
import {
  GalleryBlock,
  GalleryFourBlock,
  MetricsBlock,
  TimelineBlock,
  ValuesListBlock,
} from './gallery'
import { HeroBlock, PageIntroBlock, StatementBlock } from './hero'
import {
  AuthPrototypeBlock,
  ContactFormBlock,
  ContactInfoBlock,
  CtaBlock,
  LegalContentBlock,
  NewsletterFormBlock,
} from './interactive'

/**
 * Palette complète des blocs de mise en page, dans l'ordre proposé aux éditeurs
 * dans l'admin : structure, contenu, listes, médias, puis formulaires.
 */
export const layoutBlocks: Block[] = [
  // Structure
  HeroBlock,
  PageIntroBlock,
  StatementBlock,
  // Contenu
  RichTextBlock,
  ImageBlock,
  ImageTextBlock,
  QuoteBlock,
  // Listes alimentées par les collections
  ProjectGridBlock,
  FeaturedProjectBlock,
  ServiceListBlock,
  ArticleListBlock,
  FeaturedArticleBlock,
  CommitmentListBlock,
  // Médias et mise en avant
  GalleryFourBlock,
  GalleryBlock,
  MetricsBlock,
  TimelineBlock,
  ValuesListBlock,
  // Conversion et formulaires
  CtaBlock,
  ContactInfoBlock,
  ContactFormBlock,
  NewsletterFormBlock,
  // Pages spécifiques
  LegalContentBlock,
  AuthPrototypeBlock,
  NoticeNoteBlock,
  SpacerBlock,
]

/** Sous-ensemble autorisé à l'intérieur du corps d'un article. */
export const articleBlocks: Block[] = [
  RichTextBlock,
  ImageBlock,
  QuoteBlock,
  GalleryBlock,
  MetricsBlock,
  CtaBlock,
  NewsletterFormBlock,
  NoticeNoteBlock,
  SpacerBlock,
]

export * from './collections'
export * from './content'
export * from './gallery'
export * from './hero'
export * from './interactive'
