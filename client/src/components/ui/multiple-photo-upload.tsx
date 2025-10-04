import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Upload, X, Plus, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface MultiplePhotoUploadProps {
  currentPhotos?: string[];
  children: React.ReactNode;
  onPhotosUpdated?: (photos: string[]) => void;
}

export function MultiplePhotoUpload({ currentPhotos = [], children, onPhotosUpdated }: MultiplePhotoUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const availableSlots = 5 - currentPhotos.length;

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('photos', file);
      });
      
      const res = await fetch('/api/upload/photos', {
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
      onPhotosUpdated?.(data.photos);
      toast({
        title: "Photos uploaded",
        description: `Successfully uploaded ${data.newPhotos.length} photo(s)`,
      });
      setIsOpen(false);
      clearSelection();
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (photoUrl: string) => {
      const res = await fetch('/api/photos', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ photoUrl }),
        credentials: 'include',
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Delete failed');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], data.user);
      onPhotosUpdated?.(data.photos);
      toast({
        title: "Photo deleted",
        description: "Photo has been removed from your gallery",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearSelection = () => {
    setSelectedFiles([]);
    setPreviewUrls([]);
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    
    for (const file of fileArray) {
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a valid image format`,
          variant: "destructive",
        });
        continue;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 5MB`,
          variant: "destructive",
        });
        continue;
      }
      
      validFiles.push(file);
    }

    if (currentPhotos.length + validFiles.length > 5) {
      toast({
        title: "Too many photos",
        description: `Maximum 5 photos allowed. You have ${currentPhotos.length} photos.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFiles(validFiles);
    
    const urls = validFiles.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  }, [currentPhotos.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeSelectedFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newUrls = previewUrls.filter((_, i) => i !== index);
    
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newUrls);
  };

  const deleteCurrentPhoto = (photoUrl: string) => {
    deleteMutation.mutate(photoUrl);
  };

  const handleUpload = () => {
    if (selectedFiles.length === 0) return;
    uploadMutation.mutate(selectedFiles);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] md:max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-4 py-4 md:px-6 md:py-5 border-b sticky top-0 bg-background z-10 rounded-t-2xl md:rounded-t-3xl">
          <DialogTitle>Manage Photos</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto px-4 py-5 md:px-6 md:py-6 space-y-6">
          {/* Photo Counter */}
          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/50">
            <div>
              <p className="font-semibold">{currentPhotos.length} of 5 photos</p>
              <p className="text-sm text-muted-foreground">
                {availableSlots > 0 ? `${availableSlots} slot${availableSlots > 1 ? 's' : ''} available` : 'Photo limit reached'}
              </p>
            </div>
            {currentPhotos.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Hover to delete
              </div>
            )}
          </div>

          {/* Current Photos Grid */}
          {currentPhotos.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <span>Your Gallery</span>
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {currentPhotos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-xl overflow-hidden bg-secondary/20 shadow-md hover:shadow-xl transition-all duration-300">
                      <img
                        src={photo}
                        alt={`Gallery photo ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-lg hover:scale-110"
                      onClick={() => deleteCurrentPhoto(photo)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                {/* Upload Card */}
                {availableSlots > 0 && (
                  <label 
                    htmlFor="add-photo-upload"
                    className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 bg-secondary/10 hover:bg-primary/5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-300 hover:scale-105 group"
                  >
                    <div className="bg-primary/10 p-3 rounded-full group-hover:bg-primary/20 transition-colors">
                      <Plus className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-xs font-medium text-center px-2">Add Photo</p>
                    <input
                      id="add-photo-upload"
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e.target.files)}
                    />
                  </label>
                )}
              </div>
            </div>
          )}

          {/* Upload Area - Show when no photos */}
          {currentPhotos.length === 0 && (
            <div
              className={cn(
                "border-2 border-dashed border-muted-foreground/25 rounded-2xl p-8 text-center transition-all duration-300",
                "hover:border-primary/50 hover:bg-primary/5"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="bg-primary/10 p-4 rounded-full">
                  <Upload className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <label htmlFor="photo-upload" className="cursor-pointer text-primary hover:underline font-medium">
                    Click to upload
                  </label>
                  <span className="text-muted-foreground"> or drag and drop</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, GIF, WebP up to 5MB each (max 5 photos)
                </p>
                <input
                  id="photo-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
              </div>
            </div>
          )}

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold">Ready to Upload ({selectedFiles.length})</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {previewUrls.map((url, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-xl overflow-hidden bg-secondary/20 shadow-md">
                      <img
                        src={url}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                      onClick={() => removeSelectedFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1 rounded-full transition-all hover:scale-105"
              onClick={() => {
                clearSelection();
                setIsOpen(false);
              }}
            >
              {selectedFiles.length > 0 ? 'Cancel' : 'Close'}
            </Button>
            
            {selectedFiles.length > 0 && (
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                className="flex-1 rounded-full bg-primary hover:bg-primary/90 transition-all hover:scale-105 shadow-lg"
              >
                {uploadMutation.isPending ? "Uploading..." : `Upload ${selectedFiles.length} Photo${selectedFiles.length > 1 ? 's' : ''}`}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
