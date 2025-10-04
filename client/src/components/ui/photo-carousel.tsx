import { useState } from "react";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhotoCarouselProps {
  photos: string[];
  fallbackInitials?: string;
  className?: string;
  aspectRatio?: "square" | "portrait" | "landscape";
  showDots?: boolean;
  showArrows?: boolean;
}

export function PhotoCarousel({
  photos = [],
  fallbackInitials = "",
  className = "",
  aspectRatio = "square",
  showDots = true,
  showArrows = true,
}: PhotoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // If no photos, show fallback
  if (photos.length === 0) {
    return (
      <div className={cn(
        "relative bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center",
        aspectRatio === "square" && "aspect-square",
        aspectRatio === "portrait" && "aspect-[3/4]",
        aspectRatio === "landscape" && "aspect-[4/3]",
        className
      )}>
        <div className="flex flex-col items-center text-muted-foreground">
          <User className="h-12 w-12 mb-2" />
          <span className="text-lg font-medium">{fallbackInitials}</span>
        </div>
      </div>
    );
  }

  const nextPhoto = () => {
    setCurrentIndex((prev) => (prev + 1) % photos.length);
  };

  const prevPhoto = () => {
    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const goToPhoto = (index: number) => {
    setCurrentIndex(index);
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Main Photo Display */}
      <div className={cn(
        "relative",
        aspectRatio === "square" && "aspect-square",
        aspectRatio === "portrait" && "aspect-[3/4]",
        aspectRatio === "landscape" && "aspect-[4/3]"
      )}>
        <img
          src={photos[currentIndex]}
          alt={`Photo ${currentIndex + 1}`}
          className="w-full h-full object-cover transition-opacity duration-300"
          onError={(e) => {
            // Fallback if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
        
        {/* Navigation Arrows */}
        {showArrows && photos.length > 1 && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
              onClick={prevPhoto}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white"
              onClick={nextPhoto}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Photo Counter */}
        {photos.length > 1 && (
          <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
            {currentIndex + 1} / {photos.length}
          </div>
        )}
      </div>

      {/* Dot Indicators */}
      {showDots && photos.length > 1 && (
        <div className="flex justify-center space-x-2 mt-3">
          {photos.map((_, index) => (
            <button
              key={index}
              className={cn(
                "w-2 h-2 rounded-full transition-colors",
                index === currentIndex 
                  ? "bg-primary" 
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              onClick={() => goToPhoto(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}