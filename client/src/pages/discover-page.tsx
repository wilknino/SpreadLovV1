import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSocket } from "@/hooks/use-socket";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Filter, MapPin, Calendar, Heart, X, Check, ChevronsUpDown } from "lucide-react";
import { User } from "@shared/schema";
import { PhotoCarousel } from "@/components/ui/photo-carousel";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function DiscoverPage() {
  const { user } = useAuth();
  const { isConnected } = useSocket();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);
  
  const countries = [
    "India", "USA", "UK", "Canada", "Australia",
    "Germany", "France", "Spain", "Italy", "Japan",
    "South Korea", "Brazil", "Mexico", "Netherlands", "Sweden",
    "China", "Russia", "Argentina", "Chile", "Colombia",
    "Peru", "Portugal", "Belgium", "Switzerland", "Austria"
  ];
  
  // Applied filters (what's currently filtering the data)
  const [appliedFilters, setAppliedFilters] = useState({
    gender: "",
    location: "",
    ageMin: 20,
    ageMax: 40,
  });
  
  // Temporary filters (what's being edited in the filter panel)
  const [tempFilters, setTempFilters] = useState({
    gender: "",
    location: "",
    ageMin: 20,
    ageMax: 40,
  });

  const fetchUsers = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (appliedFilters.gender) queryParams.set("gender", appliedFilters.gender);
      if (appliedFilters.location) queryParams.set("location", appliedFilters.location);
      queryParams.set("ageMin", appliedFilters.ageMin.toString());
      queryParams.set("ageMax", appliedFilters.ageMax.toString());

      const response = await fetch(`/api/users/online?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedFilters = async () => {
    try {
      const response = await fetch("/api/user/filters");
      if (response.ok) {
        const savedFilters = await response.json();
        setAppliedFilters(savedFilters);
        setTempFilters(savedFilters);
      }
    } catch (error) {
      console.error("Failed to load saved filters:", error);
    }
  };

  useEffect(() => {
    loadSavedFilters();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [appliedFilters]);
  
  // Sync temp filters when filter panel opens
  useEffect(() => {
    if (filterOpen) {
      setTempFilters(appliedFilters);
    }
  }, [filterOpen, appliedFilters]);
  
  const handleApplyFilters = async () => {
    try {
      const response = await fetch("/api/user/filters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tempFilters),
      });
      
      if (response.ok) {
        setAppliedFilters(tempFilters);
        setFilterOpen(false);
      }
    } catch (error) {
      console.error("Failed to save filters:", error);
    }
  };
  
  const handleResetFilters = async () => {
    try {
      const response = await fetch("/api/user/filters", {
        method: "DELETE",
      });
      
      if (response.ok) {
        const defaultFilters = { gender: "", location: "", ageMin: 20, ageMax: 40 };
        setTempFilters(defaultFilters);
        setAppliedFilters(defaultFilters);
        setFilterOpen(false);
      }
    } catch (error) {
      console.error("Failed to reset filters:", error);
    }
  };
  
  const hasActiveFilters = appliedFilters.gender || appliedFilters.location || appliedFilters.ageMin !== 20 || appliedFilters.ageMax !== 40;
  
  const removeFilter = async (filterType: 'gender' | 'location' | 'age') => {
    let updatedFilters = { ...appliedFilters };
    
    if (filterType === 'gender') {
      updatedFilters.gender = "";
    } else if (filterType === 'location') {
      updatedFilters.location = "";
    } else if (filterType === 'age') {
      updatedFilters.ageMin = 20;
      updatedFilters.ageMax = 40;
    }
    
    try {
      const response = await fetch("/api/user/filters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFilters),
      });
      
      if (response.ok) {
        setAppliedFilters(updatedFilters);
      }
    } catch (error) {
      console.error("Failed to update filters:", error);
    }
  };

  // Listen for real-time online status changes
  useEffect(() => {
    const handleOnlineStatusChanged = () => {
      fetchUsers();
    };

    window.addEventListener('onlineStatusChanged', handleOnlineStatusChanged);
    return () => window.removeEventListener('onlineStatusChanged', handleOnlineStatusChanged);
  }, []);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen pb-16">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Finding amazing people near you...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 pb-20">
      {/* Filter Modal Dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
          {/* Header */}
          <DialogHeader className="flex-shrink-0 p-6 pb-4 bg-gradient-to-r from-primary/5 to-primary/10 border-b">
            <DialogTitle className="text-2xl font-bold">Filter Profiles</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              Customize your search to find the perfect match
            </DialogDescription>
          </DialogHeader>
          
          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 min-h-0">
            {/* Age Range Filter */}
            <div className="space-y-4 p-5 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Age Range
                </label>
                <div className="text-xl font-bold text-primary">
                  {tempFilters.ageMin} - {tempFilters.ageMax}
                </div>
              </div>
              
              <div className="pt-2 px-1">
                <Slider
                  value={[tempFilters.ageMin, tempFilters.ageMax]}
                  onValueChange={([min, max]) => {
                    setTempFilters({...tempFilters, ageMin: min, ageMax: max});
                  }}
                  min={18}
                  max={80}
                  step={1}
                  className="py-4"
                  minStepsBetweenThumbs={1}
                />
                
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>18</span>
                  <span>80</span>
                </div>
              </div>
            </div>

            {/* Gender Preference Filter */}
            <div className="space-y-3 p-5 rounded-xl bg-gradient-to-br from-blue-500/5 to-purple-500/10 border border-blue-500/20 shadow-sm">
              <label className="text-sm font-semibold flex items-center gap-2">
                <Heart className="h-5 w-5 text-blue-500" />
                Gender Preference
              </label>
              <RadioGroup 
                value={tempFilters.gender} 
                onValueChange={(value) => setTempFilters({...tempFilters, gender: value})}
                className="space-y-2"
              >
                <div className="flex items-center space-x-3 rounded-lg border bg-background/50 p-4 hover:bg-accent/50 transition-all cursor-pointer hover:border-primary/50">
                  <RadioGroupItem value="" id="all" className="h-5 w-5" />
                  <Label htmlFor="all" className="flex-1 cursor-pointer font-medium">All Genders</Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border bg-background/50 p-4 hover:bg-accent/50 transition-all cursor-pointer hover:border-primary/50">
                  <RadioGroupItem value="male" id="male" className="h-5 w-5" />
                  <Label htmlFor="male" className="flex-1 cursor-pointer font-medium">Male</Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border bg-background/50 p-4 hover:bg-accent/50 transition-all cursor-pointer hover:border-primary/50">
                  <RadioGroupItem value="female" id="female" className="h-5 w-5" />
                  <Label htmlFor="female" className="flex-1 cursor-pointer font-medium">Female</Label>
                </div>
                <div className="flex items-center space-x-3 rounded-lg border bg-background/50 p-4 hover:bg-accent/50 transition-all cursor-pointer hover:border-primary/50">
                  <RadioGroupItem value="other" id="other" className="h-5 w-5" />
                  <Label htmlFor="other" className="flex-1 cursor-pointer font-medium">Other</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Location Filter */}
            <div className="space-y-3 p-5 rounded-xl bg-gradient-to-br from-green-500/5 to-emerald-500/10 border border-green-500/20 shadow-sm">
              <label className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5 text-green-500" />
                Location
              </label>
              <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={locationOpen}
                    className="w-full justify-between rounded-lg h-12 bg-background/50 hover:bg-accent/50 border-green-500/30"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-green-500" />
                      <span className={cn(!tempFilters.location && "text-muted-foreground")}>
                        {tempFilters.location || "Any location"}
                      </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search country..." className="h-12" />
                    <CommandList>
                      <CommandEmpty>No country found.</CommandEmpty>
                      <CommandGroup>
                        <CommandItem
                          value=""
                          onSelect={() => {
                            setTempFilters({...tempFilters, location: ""});
                            setLocationOpen(false);
                          }}
                          className="py-3"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              !tempFilters.location ? "opacity-100" : "opacity-0"
                            )}
                          />
                          Any location
                        </CommandItem>
                        {countries.map((country) => (
                          <CommandItem
                            key={country}
                            value={country}
                            onSelect={() => {
                              setTempFilters({...tempFilters, location: country});
                              setLocationOpen(false);
                            }}
                            className="py-3"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                tempFilters.location === country ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {country}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          
          {/* Footer with Action Buttons */}
          <div className="flex-shrink-0 p-6 pt-4 border-t bg-background space-y-3">
            <Button 
              className="w-full h-12 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all"
              onClick={handleApplyFilters}
            >
              Apply Filters
            </Button>
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl font-semibold text-base hover:bg-destructive/10 hover:text-destructive hover:border-destructive/50 transition-all"
              onClick={handleResetFilters}
            >
              Reset All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Header */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between p-3 sm:p-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Discover
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">{users.length} {users.length === 1 ? 'person' : 'people'} online now</p>
          </div>
          
          {/* Filter Button - Top Right */}
          <Button 
            variant="outline" 
            size="icon" 
            className="relative h-10 w-10 rounded-xl hover:bg-primary/10 hover:border-primary/50 transition-all"
            onClick={() => setFilterOpen(true)}
          >
            <Filter className="h-5 w-5" />
            {hasActiveFilters && (
              <div className="absolute -top-1 -right-1 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                <span className="text-[10px] text-primary-foreground font-bold">
                  {[appliedFilters.gender, appliedFilters.location, (appliedFilters.ageMin !== 20 || appliedFilters.ageMax !== 40) ? 'age' : ''].filter(Boolean).length}
                </span>
              </div>
            )}
          </Button>
        </div>
        
        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <div className="px-3 sm:px-4 pb-3 flex flex-wrap gap-2">
            {appliedFilters.gender && (
              <Badge 
                variant="secondary" 
                className="rounded-full px-3 py-1.5 cursor-pointer hover:bg-secondary/80 transition-all"
                onClick={() => removeFilter('gender')}
              >
                <span className="capitalize">{appliedFilters.gender}</span>
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {appliedFilters.location && (
              <Badge 
                variant="secondary" 
                className="rounded-full px-3 py-1.5 cursor-pointer hover:bg-secondary/80 transition-all"
                onClick={() => removeFilter('location')}
              >
                <MapPin className="h-3 w-3 mr-1" />
                {appliedFilters.location}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
            {(appliedFilters.ageMin !== 20 || appliedFilters.ageMax !== 40) && (
              <Badge 
                variant="secondary" 
                className="rounded-full px-3 py-1.5 cursor-pointer hover:bg-secondary/80 transition-all"
                onClick={() => removeFilter('age')}
              >
                <Calendar className="h-3 w-3 mr-1" />
                Age {appliedFilters.ageMin}-{appliedFilters.ageMax}
                <X className="h-3 w-3 ml-1" />
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* User Grid */}
      <div className="p-2 sm:p-4">
        {users.length === 0 ? (
          <div className="text-center py-8 sm:py-12 px-4">
            <Heart className="h-8 w-8 sm:h-12 sm:w-12 text-muted-foreground mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">No one found</h3>
            <p className="text-sm sm:text-base text-muted-foreground">Try adjusting your filters to see more people</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-1.5 sm:gap-2">
            {users.map((profile) => (
              <Card key={profile.id} className="overflow-hidden hover:shadow-lg active:scale-95 transition-all duration-300 group cursor-pointer">
                <CardContent className="p-0">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <PhotoCarousel
                      photos={[profile.profilePhoto, ...(profile.photos && Array.isArray(profile.photos) ? profile.photos : [])].filter(Boolean)}
                      fallbackInitials={`${profile.firstName[0]}${profile.lastName[0]}`}
                      aspectRatio="landscape"
                      showDots={false}
                      showArrows={false}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {profile.isOnline && (
                      <div className="absolute top-2 right-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                      </div>
                    )}
                  </div>

                  <div className="p-1.5 space-y-1">
                    <div>
                      <h3 className="font-semibold text-xs leading-tight">
                        {profile.firstName} {profile.lastName}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <span>{profile.age}</span>
                        <span>•</span>
                        <span className="capitalize">{profile.gender}</span>
                        {profile.location && (
                          <>
                            <span>•</span>
                            <span className="truncate text-xs">{profile.location}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-0.5 pt-0.5">
                      <Button 
                        size="sm" 
                        className="flex-1 text-xs px-1 py-0.5 h-6"
                        onClick={() => setLocation(`/profile/${profile.id}`)}
                      >
                        Profile
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1 text-xs px-1 py-0.5 h-6"
                        onClick={() => setLocation(`/chat/${profile.id}`)}
                      >
                        Chat
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
