'use client'

import { useState, useRef, useEffect } from 'react'
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
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Close picker when clicking outside
  useEffect(() => {
    if (!pickerOpen) return
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [pickerOpen])

  const handleSelect = async (fav: SportFavorite) => {
    if (updating) return

    if (fav.id === featuredId) {
      // Toggle color scheme
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
      setPickerOpen(false)
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

  const featured = favorites.find(f => f.id === featuredId) || favorites[0]

  return (
    <div className="relative" ref={pickerRef}>
      <span className="text-text-muted text-xs mb-1 block">Your Team</span>
      <button
        type="button"
        onClick={() => setPickerOpen(!pickerOpen)}
        className="cursor-pointer hover:scale-105 transition-transform"
        title={favorites.length > 1 ? 'Click to change your featured banner' : 'Your team banner'}
      >
        <Pennant
          school={featured.school}
          variant="banner"
          size="sm"
          colorScheme={featured.bannerColorScheme}
        />
      </button>

      {/* Banner picker dropdown */}
      {pickerOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-surface border border-border rounded-lg shadow-xl p-4 min-w-[200px]">
          <p className="text-text-secondary text-xs font-medium mb-3">
            {favorites.length > 1 ? 'Choose your featured banner' : 'Your banner'}
          </p>
          <div className="flex flex-col gap-3">
            {favorites.map(fav => {
              const isFeatured = fav.id === featuredId

              return (
                <button
                  key={fav.id}
                  type="button"
                  onClick={() => handleSelect(fav)}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                    isFeatured
                      ? 'bg-surface-subtle'
                      : 'hover:bg-surface-subtle'
                  }`}
                >
                  <Pennant
                    school={fav.school}
                    variant="banner"
                    size="xs"
                    colorScheme={fav.bannerColorScheme}
                  />
                  <div className="flex flex-col">
                    <span className="text-text-primary text-sm font-medium">{fav.school.name}</span>
                    <span className="text-text-muted text-[10px]">{fav.sportName}</span>
                    {isFeatured && (
                      <span className="text-text-muted text-[9px] mt-0.5">Tap to swap colors</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
