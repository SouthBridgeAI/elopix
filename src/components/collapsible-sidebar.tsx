import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

interface RankingSidebarProps {
  children: React.ReactNode;
}

export const CollapsibleRankingSidebar: React.FC<RankingSidebarProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="relative flex h-full">
      <Button
        variant="outline"
        size="icon"
        className="absolute -left-4 top-1/2 -translate-y-1/2 z-10"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <ChevronRight /> : <ChevronLeft />}
      </Button>
      
      <motion.div
        initial={{ width: 256 }}
        animate={{ width: isOpen ? 256 : 0 }}
        transition={{ duration: 0.2 }}
        className="bg-muted border-l overflow-hidden"
      >
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {children}
          </div>
        </ScrollArea>
      </motion.div>
    </div>
  );
};

export default CollapsibleRankingSidebar;