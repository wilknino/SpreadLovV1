import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { MultiplePhotoUpload } from "@/components/ui/multiple-photo-upload";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ProfileModal from "@/components/chat/profile-modal";
import { 
  Edit, 
  Camera, 
  MapPin, 
  Calendar, 
  User as UserIcon, 
  LogOut,
  Settings,
  Heart,
  MessageCircle,
  Mail,
  AtSign,
  UserCheck
} from "lucide-react";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const queryClient = useQueryClient();

  const profilePhotoUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profilePicture', file);
      const res = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data.user);
      toast({
        title: "Profile photo updated",
        description: "Your profile picture has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (!user) return null;

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const handleProfilePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please select a valid image file (JPEG, PNG, GIF, or WebP)",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please select an image smaller than 5MB",
          variant: "destructive",
        });
        return;
      }

      profilePhotoUploadMutation.mutate(file);
    }
    event.target.value = '';
  };

  const userPhotos = user.photos && Array.isArray(user.photos) ? user.photos : [];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-b">
        <div className="container max-w-5xl mx-auto flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Profile
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground">Manage your account</p>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
                <Settings className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetHeader>
                <SheetTitle>Settings</SheetTitle>
              </SheetHeader>
              
              <div className="space-y-3 mt-6">
                <Button 
                  variant="outline" 
                  className="w-full justify-start rounded-lg transition-all hover:bg-primary/10"
                  onClick={() => setShowEditModal(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
                
                <Button 
                  variant="destructive" 
                  className="w-full justify-start rounded-lg"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <div className="container max-w-5xl mx-auto p-4 space-y-6">
        {/* Profile Header Card */}
        <Card className="overflow-hidden rounded-2xl shadow-lg border-0 bg-gradient-to-br from-card to-card/80">
          <div className="relative">
            {/* Cover Background */}
            <div className="h-32 md:h-40 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10"></div>
            
            {/* Profile Content */}
            <div className="relative px-4 md:px-8 pb-6">
              {/* Profile Picture */}
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="relative -mt-16 md:-mt-20">
                    <div 
                      className="relative w-28 h-28 md:w-36 md:h-36 border-4 border-background shadow-2xl rounded-full overflow-hidden group cursor-pointer bg-secondary/20"
                      onClick={() => document.getElementById('profile-photo-upload')?.click()}
                    >
                      <Avatar className="w-full h-full">
                        <AvatarImage 
                          src={user.profilePhoto || ""} 
                          alt="Profile Picture"
                          className="object-cover"
                        />
                        <AvatarFallback className="text-2xl md:text-3xl font-semibold">
                          {`${user.firstName[0]}${user.lastName[0]}`}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <div className="text-center">
                          <Camera className="h-6 w-6 md:h-8 md:w-8 text-white mx-auto mb-1" />
                          <p className="text-xs text-white font-medium">Change</p>
                        </div>
                      </div>
                    </div>
                    {user.isOnline && (
                      <div className="absolute bottom-2 right-2 bg-green-500 w-5 h-5 md:w-6 md:h-6 rounded-full border-4 border-background shadow-lg"></div>
                    )}
                    <Input
                      id="profile-photo-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleProfilePhotoUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Name and Basic Info */}
                  <div className="space-y-2 mb-2">
                    <div>
                      <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                        {user.firstName} {user.lastName}
                      </h2>
                      <p className="text-sm md:text-base text-muted-foreground">@{user.username}</p>
                    </div>

                    {/* Quick Info Tags */}
                    <div className="flex flex-wrap items-center gap-2 text-xs md:text-sm">
                      <Badge variant="secondary" className="rounded-full px-3 py-1 capitalize">
                        {user.gender}
                      </Badge>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="h-3 w-3 md:h-4 md:w-4" />
                        <span>{user.age} years old</span>
                      </div>
                      {user.location && (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                          <span>{user.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Edit Profile Button - Desktop */}
                <div className="hidden md:block">
                  <Button 
                    variant="outline" 
                    className="rounded-full px-6"
                    onClick={() => setShowEditModal(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </div>
              </div>

              {/* Bio */}
              {user.bio && (
                <div className="mt-4 bg-secondary/30 backdrop-blur-sm rounded-xl p-4 border border-border/50">
                  <p className="text-sm md:text-base leading-relaxed">{user.bio}</p>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Quick Actions - Mobile Only */}
        <div className="grid grid-cols-2 gap-3 md:hidden">
          <Button 
            variant="outline" 
            className="h-auto py-4 rounded-xl hover:shadow-md transition-all hover:scale-105"
            onClick={() => setShowEditModal(true)}
          >
            <div className="text-center">
              <Edit className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="font-semibold text-sm">Edit Profile</p>
              <p className="text-xs text-muted-foreground">Update info</p>
            </div>
          </Button>

          <MultiplePhotoUpload 
            currentPhotos={userPhotos}
            onPhotosUpdated={(updatedPhotos: string[]) => {
              console.log("Photos updated:", updatedPhotos);
            }}
          >
            <Button 
              variant="outline" 
              className="h-auto py-4 rounded-xl hover:shadow-md transition-all hover:scale-105 w-full"
            >
              <div className="text-center">
                <Camera className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="font-semibold text-sm">Photos</p>
                <p className="text-xs text-muted-foreground">Manage ({userPhotos.length}/5)</p>
              </div>
            </Button>
          </MultiplePhotoUpload>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          <Card className="rounded-xl shadow-md border-0 bg-gradient-to-br from-red-500/10 to-red-500/5 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="bg-red-500/10 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3">
                <Heart className="h-5 w-5 md:h-6 md:w-6 text-red-500" />
              </div>
              <div className="text-xl md:text-2xl font-bold">0</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">Likes</div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-md border-0 bg-gradient-to-br from-blue-500/10 to-blue-500/5 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="bg-blue-500/10 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3">
                <MessageCircle className="h-5 w-5 md:h-6 md:w-6 text-blue-500" />
              </div>
              <div className="text-xl md:text-2xl font-bold">0</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">Chats</div>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-md border-0 bg-gradient-to-br from-green-500/10 to-green-500/5 hover:shadow-lg transition-all duration-300 hover:scale-105">
            <CardContent className="p-4 md:p-6 text-center">
              <div className="bg-green-500/10 w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-3">
                <UserCheck className="h-5 w-5 md:h-6 md:w-6 text-green-500" />
              </div>
              <div className="text-xl md:text-2xl font-bold">0</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">Matches</div>
            </CardContent>
          </Card>
        </div>

        {/* Photo Gallery */}
        <Card className="rounded-2xl shadow-lg border-0">
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Camera className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-base md:text-lg">Photo Gallery</h3>
                  <p className="text-xs text-muted-foreground">{userPhotos.length} of 5 photos</p>
                </div>
              </div>
              
              <MultiplePhotoUpload 
                currentPhotos={userPhotos}
                onPhotosUpdated={(updatedPhotos: string[]) => {
                  console.log("Photos updated:", updatedPhotos);
                }}
              >
                <Button variant="outline" size="sm" className="rounded-full hidden md:flex">
                  <Camera className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              </MultiplePhotoUpload>
            </div>

            {userPhotos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3">
                {userPhotos.map((photo, index) => (
                  <div 
                    key={index} 
                    className="aspect-square rounded-xl overflow-hidden bg-secondary/20 group relative shadow-md hover:shadow-xl transition-all duration-300"
                  >
                    <img 
                      src={photo} 
                      alt={`Gallery photo ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 cursor-pointer"
                      onClick={() => setSelectedPhotoIndex(index)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                  </div>
                ))}
              </div>
            ) : (
              <MultiplePhotoUpload 
                currentPhotos={userPhotos}
                onPhotosUpdated={(updatedPhotos: string[]) => {
                  console.log("Photos updated:", updatedPhotos);
                }}
              >
                <div className="border-2 border-dashed border-muted-foreground/30 rounded-2xl p-8 md:p-12 text-center hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 cursor-pointer group">
                  <div className="flex flex-col items-center gap-3">
                    <div className="bg-primary/10 p-4 rounded-full group-hover:bg-primary/20 transition-colors">
                      <Camera className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold mb-1">No photos yet</p>
                      <p className="text-sm text-muted-foreground">Click to add your first photo</p>
                    </div>
                  </div>
                </div>
              </MultiplePhotoUpload>
            )}
          </div>
        </Card>

        {/* Account Information */}
        <Card className="rounded-2xl shadow-lg border-0">
          <div className="p-4 md:p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-primary/10 p-2 rounded-lg">
                <UserIcon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-base md:text-lg">Account Information</h3>
            </div>

            <div className="grid gap-3 md:gap-4">
              {/* Email */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground font-medium">Email</p>
                  <p className="text-sm md:text-base font-semibold truncate">{user.email}</p>
                </div>
              </div>

              {/* Username */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="bg-blue-500/10 p-3 rounded-lg">
                  <AtSign className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground font-medium">Username</p>
                  <p className="text-sm md:text-base font-semibold">@{user.username}</p>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="bg-green-500/10 p-3 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground font-medium">Member since</p>
                  <p className="text-sm md:text-base font-semibold">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    }) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Profile Edit Modal */}
      <ProfileModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        user={user}
      />
    </div>
  );
}
