"use client"

import { useState, useRef } from "react"
import { Camera, Link2, Trash2, User, X, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type ProfilePictureProps = {
  imageUrl?: string | null
  onImageChange: (url: string | null) => void
  className?: string
}

export function ProfilePicture({
  imageUrl,
  onImageChange,
  className,
}: ProfilePictureProps) {
  const [isUrlMode, setIsUrlMode] = useState(false)
  const [urlInput, setUrlInput] = useState("")
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB")
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // For now, create a local object URL
      // In production, this would upload to Supabase Storage
      const url = URL.createObjectURL(file)
      onImageChange(url)
    } catch {
      setError("Failed to upload image")
    } finally {
      setIsUploading(false)
    }
  }

  const handleUrlSubmit = () => {
    if (!urlInput.trim()) {
      setError("Please enter a URL")
      return
    }

    try {
      new URL(urlInput)
      onImageChange(urlInput)
      setUrlInput("")
      setIsUrlMode(false)
      setError(null)
    } catch {
      setError("Please enter a valid URL")
    }
  }

  const handleRemove = () => {
    onImageChange(null)
    setError(null)
  }

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="group relative">
        <div
          className={cn(
            "relative flex size-28 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-muted-foreground/30 transition-all duration-700",
            imageUrl && "border-solid border-accent/50"
          )}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="Profile"
              className="size-full object-cover"
            />
          ) : (
            <User className="size-12 text-muted-foreground/50" />
          )}

          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80">
              <Loader2 className="size-6 animate-spin text-accent" />
            </div>
          )}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute -bottom-1 -right-1 size-8 rounded-full shadow-md transition-all duration-700 hover:scale-110"
            >
              <Camera className="size-4" />
              <span className="sr-only">Change profile picture</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="center">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Profile Picture</p>
              
              {isUrlMode ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="https://..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="h-8 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleUrlSubmit}
                      className="h-8 px-2"
                    >
                      Add
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsUrlMode(false)
                      setUrlInput("")
                      setError(null)
                    }}
                    className="h-7 w-full text-xs"
                  >
                    <X className="mr-1 size-3" />
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="justify-start"
                  >
                    <Camera className="mr-2 size-4" />
                    Upload image
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsUrlMode(true)}
                    className="justify-start"
                  >
                    <Link2 className="mr-2 size-4" />
                    Use URL
                  </Button>
                  {imageUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemove}
                      className="justify-start text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-2 size-4" />
                      Remove
                    </Button>
                  )}
                </div>
              )}

              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>
          </PopoverContent>
        </Popover>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {imageUrl ? "Click camera to change" : "Add a profile picture (optional)"}
      </p>
    </div>
  )
}
