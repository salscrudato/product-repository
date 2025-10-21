/**
 * Article Sharing & Favorites Utility
 * Handle bookmarking, sharing, and article management
 */

import { Timestamp } from 'firebase/firestore';

export interface FavoriteArticle {
  id: string;
  articleId: string;
  title: string;
  description: string;
  link: string;
  source: string;
  category: string;
  summary?: string;
  savedAt: Timestamp | Date;
  tags: string[];
  notes?: string;
}

export interface ShareOptions {
  email?: string;
  subject?: string;
  message?: string;
  includeLink: boolean;
  includeSummary: boolean;
  platform?: 'email' | 'twitter' | 'linkedin' | 'facebook' | 'copy';
}

/**
 * Create a favorite article
 */
export function createFavoriteArticle(
  articleId: string,
  title: string,
  description: string,
  link: string,
  source: string,
  category: string,
  summary?: string,
  tags: string[] = []
): FavoriteArticle {
  return {
    id: `fav_${articleId}_${Date.now()}`,
    articleId,
    title,
    description,
    link,
    source,
    category,
    summary,
    savedAt: new Date(),
    tags,
    notes: ''
  };
}

/**
 * Add note to favorite
 */
export function addNoteToFavorite(
  favorite: FavoriteArticle,
  note: string
): FavoriteArticle {
  return {
    ...favorite,
    notes: note
  };
}

/**
 * Add tags to favorite
 */
export function addTagsToFavorite(
  favorite: FavoriteArticle,
  newTags: string[]
): FavoriteArticle {
  const uniqueTags = [...new Set([...favorite.tags, ...newTags])];
  return {
    ...favorite,
    tags: uniqueTags
  };
}

/**
 * Remove tags from favorite
 */
export function removeTagsFromFavorite(
  favorite: FavoriteArticle,
  tagsToRemove: string[]
): FavoriteArticle {
  const tags = favorite.tags.filter(tag => !tagsToRemove.includes(tag));
  return {
    ...favorite,
    tags
  };
}

/**
 * Generate email share content
 */
export function generateEmailShareContent(
  title: string,
  description: string,
  link: string,
  summary?: string,
  source?: string
): { subject: string; body: string } {
  const subject = `Check out: ${title}`;

  let body = `I found this interesting article about insurance:\n\n`;
  body += `Title: ${title}\n`;
  body += `Source: ${source || 'Insurance News'}\n\n`;

  if (summary) {
    body += `Summary:\n${summary}\n\n`;
  }

  body += `Description:\n${description}\n\n`;
  body += `Read more: ${link}\n`;

  return { subject, body };
}

/**
 * Generate Twitter share text
 */
export function generateTwitterShareText(
  title: string,
  link: string,
  hashtags: string[] = ['insurance', 'news']
): string {
  const maxLength = 280;
  const hashtagString = hashtags.map(tag => `#${tag}`).join(' ');
  let text = `${title} ${link} ${hashtagString}`;

  if (text.length > maxLength) {
    const truncatedTitle = title.substring(0, maxLength - link.length - hashtagString.length - 5);
    text = `${truncatedTitle}... ${link} ${hashtagString}`;
  }

  return text;
}

/**
 * Generate LinkedIn share text
 */
export function generateLinkedInShareText(
  title: string,
  description: string,
  link: string
): string {
  return `${title}\n\n${description}\n\n${link}`;
}

/**
 * Generate Facebook share text
 */
export function generateFacebookShareText(
  title: string,
  description: string
): string {
  return `${title}\n\n${description}`;
}

/**
 * Create share URL for email
 */
export function createEmailShareUrl(
  email: string,
  subject: string,
  body: string
): string {
  const encodedSubject = encodeURIComponent(subject);
  const encodedBody = encodeURIComponent(body);
  return `mailto:${email}?subject=${encodedSubject}&body=${encodedBody}`;
}

/**
 * Create share URL for Twitter
 */
export function createTwitterShareUrl(
  text: string,
  url: string
): string {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);
  return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
}

/**
 * Create share URL for LinkedIn
 */
export function createLinkedInShareUrl(url: string): string {
  const encodedUrl = encodeURIComponent(url);
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
}

/**
 * Create share URL for Facebook
 */
export function createFacebookShareUrl(url: string): string {
  const encodedUrl = encodeURIComponent(url);
  return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
}

/**
 * Copy to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Error copying to clipboard:', error);
    return false;
  }
}

/**
 * Share article
 */
export async function shareArticle(
  title: string,
  description: string,
  link: string,
  options: ShareOptions,
  summary?: string,
  source?: string
): Promise<boolean> {
  try {
    if (options.platform === 'email') {
      const { subject, body } = generateEmailShareContent(
        title,
        description,
        link,
        summary,
        source
      );
      const emailUrl = createEmailShareUrl(
        options.email || '',
        options.subject || subject,
        options.message || body
      );
      window.location.href = emailUrl;
      return true;
    }

    if (options.platform === 'twitter') {
      const text = generateTwitterShareText(title, link);
      const twitterUrl = createTwitterShareUrl(text, link);
      window.open(twitterUrl, '_blank', 'width=550,height=420');
      return true;
    }

    if (options.platform === 'linkedin') {
      const linkedInUrl = createLinkedInShareUrl(link);
      window.open(linkedInUrl, '_blank', 'width=550,height=420');
      return true;
    }

    if (options.platform === 'facebook') {
      const facebookUrl = createFacebookShareUrl(link);
      window.open(facebookUrl, '_blank', 'width=550,height=420');
      return true;
    }

    if (options.platform === 'copy') {
      let textToCopy = title;
      if (options.includeLink) textToCopy += `\n${link}`;
      if (options.includeSummary && summary) textToCopy += `\n\n${summary}`;
      return await copyToClipboard(textToCopy);
    }

    // Use native share API if available
    if (navigator.share) {
      await navigator.share({
        title,
        text: description,
        url: link
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error sharing article:', error);
    return false;
  }
}

/**
 * Check if native share is available
 */
export function isNativeShareAvailable(): boolean {
  return !!navigator.share;
}

/**
 * Get share platforms
 */
export function getAvailableSharePlatforms(): string[] {
  const platforms = ['email', 'copy'];

  if (isNativeShareAvailable()) {
    platforms.push('native');
  } else {
    platforms.push('twitter', 'linkedin', 'facebook');
  }

  return platforms;
}

/**
 * Format favorite for export
 */
export function formatFavoriteForExport(favorite: FavoriteArticle): string {
  const savedAt = favorite.savedAt instanceof Timestamp
    ? favorite.savedAt.toDate().toISOString()
    : new Date(favorite.savedAt).toISOString();

  return `
Title: ${favorite.title}
Source: ${favorite.source}
Category: ${favorite.category}
Link: ${favorite.link}
Saved: ${savedAt}
Tags: ${favorite.tags.join(', ')}
${favorite.notes ? `Notes: ${favorite.notes}` : ''}
${favorite.summary ? `Summary: ${favorite.summary}` : ''}
---
`;
}

/**
 * Export favorites as text
 */
export function exportFavoritesAsText(favorites: FavoriteArticle[]): string {
  let text = 'Saved Articles\n';
  text += `Exported: ${new Date().toISOString()}\n`;
  text += `Total: ${favorites.length}\n\n`;

  for (const favorite of favorites) {
    text += formatFavoriteForExport(favorite);
  }

  return text;
}

/**
 * Export favorites as JSON
 */
export function exportFavoritesAsJSON(favorites: FavoriteArticle[]): string {
  return JSON.stringify(favorites, null, 2);
}

/**
 * Export favorites as CSV
 */
export function exportFavoritesAsCSV(favorites: FavoriteArticle[]): string {
  const headers = ['Title', 'Source', 'Category', 'Link', 'Saved', 'Tags', 'Notes'];
  const rows = favorites.map(fav => [
    `"${fav.title.replace(/"/g, '""')}"`,
    `"${fav.source}"`,
    `"${fav.category}"`,
    `"${fav.link}"`,
    fav.savedAt instanceof Timestamp
      ? fav.savedAt.toDate().toISOString()
      : new Date(fav.savedAt).toISOString(),
    `"${fav.tags.join(', ')}"`,
    `"${(fav.notes || '').replace(/"/g, '""')}"`
  ]);

  return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
}

