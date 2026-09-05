import type { ReactNode } from 'react'

import type { Page } from '@/payload-types'

import {
  ArticleList,
  CommitmentList,
  FeaturedArticle,
  FeaturedProject,
  ProjectGrid,
  ServiceList,
} from './collections'
import { ImageSection, ImageText, NoticeNote, Quote, RichTextSection, Spacer } from './content'
import { Gallery, GalleryFour, Metrics, Timeline, ValuesList } from './gallery'
import { Hero, PageIntro, Statement } from './hero'
import {
  AuthPrototype,
  ContactForm,
  ContactInfo,
  Cta,
  LegalContent,
  NewsletterSection,
} from './interactive'

export type LayoutBlock = NonNullable<Page['layout']>[number]

/** Blocs rendus côte à côte dans la grille `.contact-layout`. */
const CONTACT_BLOCKS = new Set(['contactInfo', 'contactForm'])

const renderOne = (block: LayoutBlock, key: string): ReactNode => {
  switch (block.blockType) {
    case 'hero':
      return <Hero key={key} block={block} />
    case 'pageIntro':
      return <PageIntro key={key} block={block} />
    case 'statement':
      return <Statement key={key} block={block} />
    case 'richText':
      return <RichTextSection key={key} block={block} />
    case 'image':
      return <ImageSection key={key} block={block} />
    case 'imageText':
      return <ImageText key={key} block={block} />
    case 'quote':
      return <Quote key={key} block={block} />
    case 'projectGrid':
      return <ProjectGrid key={key} block={block} />
    case 'featuredProject':
      return <FeaturedProject key={key} block={block} />
    case 'serviceList':
      return <ServiceList key={key} block={block} />
    case 'articleList':
      return <ArticleList key={key} block={block} />
    case 'featuredArticle':
      return <FeaturedArticle key={key} block={block} />
    case 'commitmentList':
      return <CommitmentList key={key} block={block} />
    case 'galleryFour':
      return <GalleryFour key={key} block={block} />
    case 'gallery':
      return <Gallery key={key} block={block} />
    case 'metrics':
      return <Metrics key={key} block={block} />
    case 'timeline':
      return <Timeline key={key} block={block} />
    case 'valuesList':
      return <ValuesList key={key} block={block} />
    case 'cta':
      return <Cta key={key} block={block} />
    case 'contactInfo':
      return <ContactInfo key={key} block={block} />
    case 'contactForm':
      return <ContactForm key={key} block={block} />
    case 'newsletterForm':
      return <NewsletterSection key={key} block={block} />
    case 'legalContent':
      return <LegalContent key={key} block={block} />
    case 'authPrototype':
      return <AuthPrototype key={key} block={block} />
    case 'noticeNote':
      return <NoticeNote key={key} block={block} />
    case 'spacer':
      return <Spacer key={key} block={block} />
    default:
      return null
  }
}

/**
 * Rend la mise en page d'un document.
 *
 * Les sections masquées (« Section visible » décochée) sont retirées avant le
 * rendu : leur contenu n'atteint jamais le HTML public.
 *
 * Les blocs de contact consécutifs sont regroupés dans `.contact-layout`, la
 * grille à deux colonnes du design plaçant les coordonnées à côté du
 * formulaire. Le regroupement reste transparent pour l'éditeur, qui continue
 * de réordonner et masquer chaque bloc indépendamment.
 */
export const RenderBlocks = ({ blocks }: { blocks?: LayoutBlock[] | null }) => {
  const visible = (blocks ?? []).filter((block) => block.visible !== false)
  const output: ReactNode[] = []

  for (let index = 0; index < visible.length; index += 1) {
    const block = visible[index]
    const key = block.id ?? `${block.blockType}-${index}`

    if (CONTACT_BLOCKS.has(block.blockType)) {
      const group: LayoutBlock[] = [block]
      while (index + 1 < visible.length && CONTACT_BLOCKS.has(visible[index + 1].blockType)) {
        index += 1
        group.push(visible[index])
      }
      output.push(
        <section className="contact-layout shell" key={`contact-${key}`}>
          {group.map((item, groupIndex) =>
            renderOne(item, item.id ?? `${item.blockType}-${index}-${groupIndex}`),
          )}
        </section>,
      )
      continue
    }

    output.push(renderOne(block, key))
  }

  return <>{output}</>
}
