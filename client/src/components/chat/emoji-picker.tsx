import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

const emojiCategories = {
  recent: {
    name: "Recent",
    icon: "🕒",
    emojis: ["😊", "❤️", "👍", "😂", "🔥", "🎉"],
  },
  smileys: {
    name: "Smileys",
    icon: "😀",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂",
      "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩",
      "😘", "😗", "😚", "😙", "🥲", "😋", "😛", "😜",
      "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐",
      "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬",
      "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢",
      "🥵", "🥶", "🥴", "😵", "🤯", "🤠", "🥳", "🥸",
      "😎", "🤓", "🧐", "😕", "😟", "🙁", "😮", "😯",
    ],
  },
  hearts: {
    name: "Hearts",
    icon: "❤️",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
      "🤎", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
    ],
  },
  gestures: {
    name: "Gestures",
    icon: "👋",
    emojis: [
      "👍", "👎", "👌", "🤌", "🤏", "✌️", "🤞", "🤟",
      "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👋",
      "🤚", "🖐", "✋", "🖖", "👏", "🙌", "🤲", "🤝",
      "🙏", "✍️", "💅", "🤳", "💪", "🦾", "🦿",
    ],
  },
  celebration: {
    name: "Celebration",
    icon: "🎉",
    emojis: [
      "🎉", "🎊", "🎈", "🎁", "🎀", "🎂", "🍰", "🧁",
      "🔥", "💯", "💫", "⭐", "🌟", "✨", "⚡", "💥",
    ],
  },
};

export default function EmojiPicker({ onEmojiSelect, onClose }: EmojiPickerProps) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [activeCategory, setActiveCategory] = useState<keyof typeof emojiCategories>("smileys");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
  };

  return (
    <Card 
      ref={pickerRef}
      className="absolute bottom-14 sm:bottom-16 right-0 left-0 sm:left-auto w-full sm:w-[380px] md:w-[420px] max-w-[calc(100vw-1rem)] shadow-2xl border-border/50 z-50 overflow-hidden mx-2 sm:mx-0"
      data-testid="emoji-picker"
    >
      <div className="flex flex-col h-[280px] sm:h-[320px]">
        {/* Category Tabs */}
        <div className="flex items-center gap-1 px-2 py-2 border-b bg-muted/30">
          {Object.entries(emojiCategories).map(([key, category]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key as keyof typeof emojiCategories)}
              className={cn(
                "flex-1 py-2 px-2 sm:px-3 rounded-lg text-xl sm:text-2xl transition-all hover:bg-background/80",
                activeCategory === key 
                  ? "bg-background shadow-sm scale-110" 
                  : "opacity-50 hover:opacity-100"
              )}
              title={category.name}
            >
              {category.icon}
            </button>
          ))}
        </div>

        {/* Emoji Grid */}
        <ScrollArea className="flex-1 px-3 py-3">
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground px-1">
              {emojiCategories[activeCategory].name}
            </h3>
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
              {emojiCategories[activeCategory].emojis.map((emoji, index) => (
                <button
                  key={index}
                  className="aspect-square flex items-center justify-center text-xl sm:text-2xl hover:bg-muted/50 rounded-lg transition-all hover:scale-125 active:scale-95"
                  onClick={() => handleEmojiClick(emoji)}
                  data-testid={`emoji-${index}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </ScrollArea>
      </div>
    </Card>
  );
}
