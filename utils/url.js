// Valida URL da Ads Library e extrai params básicos
import { URL } from 'url';

function isAdLibraryUrl(raw) {
  try {
    const u = new URL(raw);
    return u.hostname.includes('facebook.com') && u.pathname.includes('/ads/library');
  } catch { 
    return false; 
  }
}

function adLibUrlFromPage(country, pageId) {
  const c = (country || 'PT').toUpperCase();
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${encodeURIComponent(c)}&view_all_page_id=${encodeURIComponent(pageId)}`;
}

export { isAdLibraryUrl, adLibUrlFromPage };
