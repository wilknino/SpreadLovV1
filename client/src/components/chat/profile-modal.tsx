import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
}

export default function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    gender: user.gender,
    bio: user.bio || "",
    location: user.location || "",
  });

  const profileUpdateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { username, email, gender, ...editableData } = data;
      const res = await apiRequest("PATCH", "/api/profile", editableData);
      return res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const imageUploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profilePicture', file);
      const res = await fetch('/api/upload/profile', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data.user);
      toast({
        title: "Profile picture updated",
        description: "Your profile picture has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to upload profile picture",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    profileUpdateMutation.mutate(formData);
  };

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      imageUploadMutation.mutate(file);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-2xl max-h-[85vh] md:max-h-[90vh] flex flex-col p-0 gap-0" 
        data-testid="profile-modal"
      >
        {/* Fixed Header */}
        <DialogHeader className="px-4 py-4 md:px-6 md:py-5 border-b sticky top-0 bg-background z-10 rounded-t-2xl md:rounded-t-3xl">
          <DialogTitle className="text-center sm:text-left">Profile Settings</DialogTitle>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-4 py-5 md:px-6 md:py-6 space-y-6">
          {/* Profile Picture Section */}
          <div className="flex flex-col items-center">
            <div className="relative group">
              <Avatar className="w-24 h-24 md:w-32 md:h-32 ring-4 ring-background shadow-xl transition-all duration-300 group-hover:ring-primary/20">
                <AvatarImage 
                  src={user.profilePhoto || undefined}
                  className="object-cover"
                />
                <AvatarFallback className="text-xl md:text-2xl font-semibold bg-gradient-to-br from-primary/20 to-primary/10">
                  {user.firstName[0]}{user.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center cursor-pointer"
                   onClick={handleFileUpload}>
                <Camera className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
            </div>
            
            <Button
              variant="outline"
              onClick={handleFileUpload}
              disabled={imageUploadMutation.isPending}
              className="mt-4 rounded-full px-6 transition-all hover:scale-105"
              data-testid="button-change-photo"
            >
              <Camera className="h-4 w-4 mr-2" />
              {imageUploadMutation.isPending ? "Uploading..." : "Change Photo"}
            </Button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
              data-testid="input-profile-picture"
            />
          </div>

          {/* Profile Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  required
                  className="rounded-xl border-2 focus:border-primary transition-all"
                  data-testid="input-first-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  required
                  className="rounded-xl border-2 focus:border-primary transition-all"
                  data-testid="input-last-name"
                />
              </div>
            </div>

            {/* Username (Disabled) */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Username</Label>
              <Input
                id="username"
                value={formData.username}
                disabled
                className="bg-secondary/50 rounded-xl border-2 cursor-not-allowed"
                data-testid="input-username"
              />
              <p className="text-xs text-muted-foreground">
                Username cannot be changed
              </p>
            </div>

            {/* Email (Disabled) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || "No email provided"}
                disabled
                className="bg-secondary/50 rounded-xl border-2 cursor-not-allowed"
                data-testid="input-email"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            {/* Gender (Disabled) */}
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-sm font-medium">Gender</Label>
              <Select value={formData.gender} disabled>
                <SelectTrigger 
                  data-testid="select-gender" 
                  className="bg-secondary/50 rounded-xl border-2 cursor-not-allowed"
                >
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Gender cannot be changed
              </p>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-medium">Location (Optional)</Label>
              <Input
                id="location"
                type="text"
                placeholder="Australia"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="rounded-xl border-2 focus:border-primary transition-all"
                data-testid="input-location"
                maxLength={100}
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-sm font-medium">Bio (Optional)</Label>
              <Textarea
                id="bio"
                placeholder="Hello, Welcome to my profile!"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                className="rounded-xl border-2 focus:border-primary transition-all min-h-[80px] resize-none"
                data-testid="textarea-bio"
                maxLength={500}
                rows={3}
              />
              <p className="text-xs text-muted-foreground text-right">
                {formData.bio.length}/500 characters
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-full transition-all hover:scale-105"
                onClick={onClose}
                data-testid="button-cancel-profile"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 rounded-full bg-primary hover:bg-primary/90 transition-all hover:scale-105 shadow-lg"
                disabled={profileUpdateMutation.isPending}
                data-testid="button-save-profile"
              >
                {profileUpdateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
