'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Pennant } from '@/components/Pennant'

interface SportFavorite {
  id: string
  sportName: string
  school: {
    id: string
    name: string
    logo_url: string | null
    primary_color: string
    secondary_color: string
  }
  bannerColorScheme: 'primary' | 'alternate'
}

interface ProfileBannerCollectionProps {
  favorites: SportFavorite[]
  featuredId: string | null
  userId: string
}

export function ProfileBannerCollection({ favorites: initialFavorites, featuredId: initialFeaturedId, userId }: ProfileBannerCollectionProps) {
  const [favorites, setFavorites] = useState(initialFavorites)
  const [featuredId, setFeaturedId] = useState(initialFeaturedId)
  const [updating, setUpdating] = useState(false)
  const supabase = createClient()

  const handleClick = async (fav: SportFavorite) => {
    if (updating) return

    if (fav.id === featuredId) {
      // Toggle color scheme on the featured banner
      const newScheme = fav.bannerColorScheme === 'primary' ? 'alternate' : 'primary'
      setFavorites(prev => prev.map(f =>
        f.id === fav.id ? { ...f, bannerColorScheme: newScheme } : f
      ))

      setUpdating(true)
      await supabase
        .from('user_sport_favorites')
        .update({ banner_color_scheme: newScheme })
        .eq('id', fav.id)
      setUpdating(false)
    } else {
      // Set as featured
      setFeaturedId(fav.id)
      setUpdating(true)

      await supabase
        .from('profiles')
        .update({
          featured_favorite_id: fav.id,
          favorite_school_id: fav.school.id,
        })
        .eq('id', userId)

      setUpdating(false)
    }
  }

  if (favorites.length === 0) return null

  return (
    <div>
      <span className="text-text-muted text-xs mb-2 block">
        {favorites.length === 1 ? 'Your Team' : 'Your Teams'}
      </span>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {favorites.map(fav => {
          const isFeatured = fav.id === featuredId

          return (
            <div key={fav.id} className="flex flex-col items-center gap-1 shrink-0">
              <div className={`relative rounded-lg p-1 transition-all ${
                isFeatured
                  ? 'ring-2 ring-brand shadow-lg shadow-brand/20'
                  : 'opacity-75 hover:opacity-100'
              }`}>
                <Pennant
                  school={fav.school}
                  variant="banner"
                  size="sm"
                  colorScheme={fav.bannerColorScheme}
                  onClick={() => handleClick(fav)}
                  interactive
                />
                {isFeatured && (
                  <div className="absolute -top-1 -right-1 bg-brand text-text-inverse text-[8px] font-bold px-1 rounded">
                    Featured
                  </div>
                )}
              </div>
              <span className="text-text-muted text-[10px]">{fav.sportName}</span>
              {isFeatured && (
                <span className="text-text-muted text-[9px]">Click to swap colors</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
