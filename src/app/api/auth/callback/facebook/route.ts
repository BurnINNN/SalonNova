import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma'; 

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const salonId = searchParams.get('state');

  if (!code || !salonId) {
    return NextResponse.redirect(new URL('/dashboard/settings?error=missing_parameters', request.url));
  }

  try {
    // 1. Échange du code temporaire contre un jeton utilisateur courte durée
    const shortLivedResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.META_APP_ID}&redirect_uri=${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/facebook&client_secret=${process.env.META_APP_SECRET}&code=${code}`
    );
    const shortLivedData = await shortLivedResponse.json();
    if (!shortLivedResponse.ok) throw new Error(shortLivedData.error?.message || 'Error fetching short-lived token');
    
    const shortLivedToken = shortLivedData.access_token;

    // 2. Échange immédiat du jeton courte durée contre un jeton utilisateur longue durée
    const longLivedResponse = await fetch(
      `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${shortLivedToken}`
    );
    const longLivedData = await longLivedResponse.json();
    if (!longLivedResponse.ok) throw new Error(longLivedData.error?.message || 'Error fetching long-lived token');

    const longLivedToken = longLivedData.access_token;

    // 3. Récupération des Pages Facebook ou comptes Instagram administrés par cet utilisateur
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedToken}`
    );
    const pagesData = await pagesResponse.json();
    if (!pagesResponse.ok) throw new Error(pagesData.error?.message || 'Error fetching pages');

    const accountsData = pagesData.data;
    
    for (const page of accountsData) {
      const permanentPageToken = page.access_token;
      const pageId = page.id;

      await prisma.integration.upsert({
        where: { metaPageId: pageId },
        update: {
          permanentToken: permanentPageToken,
          isActive: true,
          salonId: salonId
        },
        create: {
          salonId: salonId,
          platform: 'MESSENGER',
          metaPageId: pageId,
          permanentToken: permanentPageToken,
        }
      });
    }

    return NextResponse.redirect(new URL('/dashboard/settings?success=true', request.url));

  } catch (error: any) {
    console.error("Erreur critique d'échange OAuth Meta:", error.message);
    return NextResponse.redirect(new URL('/dashboard/settings?error=oauth_failed', request.url));
  }
}
