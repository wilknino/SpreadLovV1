import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  ArrowLeft,
  MapPin, 
  Calendar, 
  User2,
  MessageCircle,
  Heart,
  Camera,
  Cake,
  Users
} from "lucide-react";
import { User } from "@shared/schema";

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const [, setLocation] = useLocation();
  const { user: currentUser } = useAuth();
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  const fetchUserProfile = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setProfileUser(data);
      } else {
        console.error("Failed to fetch user profile");
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  useEffect(() => {
    const handleOnlineStatusChanged = (event: CustomEvent) => {
      const { userId: changedUserId } = event.detail || {};
      
      if (changedUserId === userId) {
        fetchUserProfile();
      }
    };

    window.addEventListener('onlineStatusChanged', handleOnlineStatusChanged as EventListener);
    return () => window.removeEventListener('onlineStatusChanged', handleOnlineStatusChanged as EventListener);
  }, [userId]);

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-16">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Profile not found</h3>
          <p className="text-muted-foreground mb-4">This user's profile could not be loaded.</p>
          <Button onClick={() => setLocation("/discover")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Discover
          </Button>
        </div>
      </div>
    );
  }

  const userPhotos = profileUser.photos && Array.isArray(profileUser.photos) ? profileUser.photos : [];
  const allPhotos = profileUser.profilePhoto 
    ? [profileUser.profilePhoto, ...userPhotos].filter(Boolean)
    : userPhotos;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="container max-w-5xl mx-auto flex items-center gap-4 p-4">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              {profileUser.firstName} {profileUser.lastName}
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              {profileUser.isOnline ? "Online now" : "Last seen recently"}
            </p>
          </div>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto p-4 space-y-6">
        <Card className="overflow-hidden rounded-2xl shadow-lg border-0 bg-gradient-to-br from-card to-card/80">
          <div className="relative">
            <div className="h-32 md:h-40 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10"></div>
            
            <div className="relative px-4 md:px-8 pb-6">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="relative -mt-16 md:-mt-20">
                    <div className="relative w-28 h-28 md:w-36 md:h-36 border-4 border-background shadow-2xl rounded-full overflow-hidden bg-secondary/20">
                      <Avatar className="w-full h-full">
                        <AvatarImage 
                          src={profileUser.profilePhoto || ""} 
                          alt="Profile Picture"
                          className="object-cover"
                        />
                        <AvatarFallback className="text-2xl md:text-3xl font-semibold">
                          {`${profileUser.firstName[0]}${profileUser.lastName[0]}`}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    {profileUser.isOnline && (
                      <div className="absolute bottom-2 right-2 bg-green-500 w-5 h-5 md:w-6 md:h-6 rounded-full border-4 border-background shadow-lg animate-pulse"></div>
                    )}
                  </div>

                  <div className="space-y-2 mb-2">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                        {profileUser.firstName} {profileUser.lastName}
                      </h2>
                      <p className="text-sm md:text-base text-muted-foreground">@{profileUser.username}</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                      <Badge variant="secondary" className="rounded-full px-3 py-1 capitalize">
                        {profileUser.gender}
                      </Badge>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Cake className="h-3 w-3 md:h-4 md:w-4" />
                        <span>{profileUser.age} years old</span>
                      </div>
                      {profileUser.location && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                          <span>{profileUser.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {profileUser.bio && (
                <div className="mt-4 bg-secondary/30 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                  <p className="text-sm md:text-base leading-relaxed">{profileUser.bio}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <Button 
            className="h-12 md:h-14 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105"
            onClick={() => setLocation(`/chat/${profileUser.id}`)}
          >
            <MessageCircle className="h-4 w-4 md:h-5 md:w-5 mr-2" />
            <span className="font-semibold">Start Chat</span>
          </Button>
          <Button 
            variant="outline"
            className="h-12 md:h-14 rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50"
          >
            <Heart className="h-4 w-4 md:h-5 md:w-5 mr-2" />
            <span className="font-semibold">Like Profile</span>
          </Button>
        </div>

        {allPhotos.length > 0 && (
          <Card className="rounded-2xl shadow-lg border-0">
            <div className="p-4 md:p-6">
              <div className="flex items-center gap-2 mb-6">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-base md:text-lg">Photos</h3>
                  <p className="text-xs text-muted-foreground">{allPhotos.length} {allPhotos.length === 1 ? 'photo' : 'photos'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                {allPhotos.map((photo, index) => (
                  <div 
                    key={index} 
                    className="aspect-square rounded-xl overflow-hidden bg-secondary/20 group relative shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer"
                    onClick={() => setSelectedPhotoIndex(index)}
                  >
                    <img 
                      src={photo} 
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                        <Camera className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        <Card className="rounded-2xl shadow-lg border-0">
          <div className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-primary/10 p-2 rounded-lg">
                <User2 className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg">About {profileUser.firstName}</h3>
            </div>

            <div className="grid gap-3 md:gap-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="bg-blue-500/10 p-3 rounded-lg">
                  <Cake className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground font-medium">Age</p>
                  <p className="text-sm md:text-base font-semibold">{profileUser.age} years old</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="bg-purple-500/10 p-3 rounded-lg">
                  <Users className="h-5 w-5 text-purple-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground font-medium">Gender</p>
                  <p className="text-sm md:text-base font-semibold capitalize">{profileUser.gender}</p>
                </div>
              </div>

              {profileUser.location && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="bg-green-500/10 p-3 rounded-lg">
                    <MapPin className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-muted-foreground font-medium">Location</p>
                    <p className="text-sm md:text-base font-semibold">{profileUser.location}</p>
                  </div>
                </div>
              )}

              {profileUser.createdAt && (
                <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <div className="bg-orange-500/10 p-3 rounded-lg">
                    <Calendar className="h-5 w-5 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-muted-foreground font-medium">Member since</p>
                    <p className="text-sm md:text-base font-semibold">
                      {new Date(profileUser.createdAt).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {selectedPhotoIndex !== null && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setSelectedPhotoIndex(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            onClick={() => setSelectedPhotoIndex(null)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center">
            <img
              src={allPhotos[selectedPhotoIndex]}
              alt={`Photo ${selectedPhotoIndex + 1}`}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            {allPhotos.length > 1 && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                {allPhotos.map((_, idx) => (
                  <button
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === selectedPhotoIndex ? 'bg-white w-8' : 'bg-white/50'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhotoIndex(idx);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
