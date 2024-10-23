"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from "framer-motion";
import Zoom from "react-medium-image-zoom";
import "react-medium-image-zoom/dist/styles.css";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Ranker, RankableItem, ComparisonResult } from "eloranker";
import {
  ComparisonContainer,
  TopBar,
  MainContent,
  ComparisonArea,
  ImageContainer,
  ImageWrapper,
  TieButtonContainer,
} from "@/components/comparison-layout";
import { CollapsibleRankingSidebar } from "@/components/collapsible-sidebar";

interface ImageMapping {
  newFilename: string;
}

type ProgressParamsState = {
  ratingChangeThreshold: number;
  stableComparisonsThreshold: number;
}

let ranker: Ranker | null = null;

export default function PairwiseComparison() {
  const router = useRouter();
  const [datasetLabel, setDatasetLabel] = useState<string | null>(null);
  const [currentPair, setCurrentPair] = useState<[string, string] | null>(null);
  const initializing = useRef(false);
  const [progress, setProgress] = useState(0);
  const [comparisons, setComparisons] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [showInstructions, setShowInstructions] = useState(true);
  const [progressParams, setProgressParams] = useState<ProgressParamsState>({
    ratingChangeThreshold: 50,
    stableComparisonsThreshold: 3,
  });

  const updateProgress = useCallback(() => {
    if (ranker) {
      if (comparisons < totalItems) {
        const nLogN = totalItems * Math.log2(totalItems);
        const earlyProgress = (comparisons / nLogN) * 100;
        setProgress(Math.min(earlyProgress, 100));
      } else {
        const currentProgress = ranker.getProgress(progressParams);
        setProgress(currentProgress * 100);
      }
    }
  }, [comparisons, totalItems, progressParams]);

  const setNextComparison = useCallback(() => {
    if (ranker) {
      const nextPair = ranker.getNextComparison();
      setCurrentPair(nextPair);
    }
  }, []);

  const initializeRanker = useCallback(async () => {
    if (!datasetLabel) return;
    
    console.log("Loading dataset ", datasetLabel);

    try {
      const storedComparisons = localStorage.getItem(
        `comparisons_${datasetLabel}`
      );
      const storedItems = localStorage.getItem(`ranker_${datasetLabel}`);

      if (storedItems && storedComparisons) {
        console.log("Loading data from localStorage");
        const parsedItems = JSON.parse(storedItems);
        console.log("Stored items:", parsedItems);
        console.log("Stored comparisons:", JSON.parse(storedComparisons));

        ranker = new Ranker(parsedItems, { kFactor: 32 });
        JSON.parse(storedComparisons).forEach((comparison: ComparisonResult) => {
          ranker?.addComparisonResult(comparison);
        });
        setComparisons(JSON.parse(storedComparisons).length);
        setTotalItems(parsedItems.length);
      } else {
        console.log("No stored data found, initializing new ranker");
        const imageMappings: ImageMapping[] = await fetch(
          `/comparison-images/${datasetLabel}/image-mappings.json`
        ).then((res) => res.json());

        const initialItems: RankableItem[] = imageMappings.map((mapping) => ({
          id: mapping.newFilename,
          initialRating: 1500,
          currentRating: 1500,
          wins: 0,
          losses: 0,
          ties: 0,
          comparisons: 0,
          lastComparisonTime: null,
          ratingHistory: [],
        }));

        console.log(
          "Loaded ",
          initialItems.length,
          " items for dataset ",
          datasetLabel
        );

        ranker = new Ranker(initialItems, { kFactor: 32 });
        setTotalItems(initialItems.length);
      }

      updateProgress();
      setNextComparison();
    } catch (error) {
      console.error("Error initializing ranker:", error);
      alert("Error loading dataset. Please check if the dataset exists and is properly formatted.");
      router.push('/');
      return;
    }
  }, [datasetLabel, router, updateProgress, setNextComparison]);

  const handleComparison = useCallback((result: "win" | "loss" | "tie") => {
    if (!ranker || !currentPair || !datasetLabel) return;

    const comparisonResult: ComparisonResult = {
      itemId1: currentPair[0],
      itemId2: currentPair[1],
      result: result,
      timestamp: Date.now(),
    };

    const ratingDelta = ranker.addComparisonResult(comparisonResult);
    console.log("Rating delta:", ratingDelta);
    updateProgress();
    setNextComparison();
    setComparisons((prev) => prev + 1);

    // Persist data to localStorage
    const updatedItems = ranker.getAllItems();
    localStorage.setItem(
      `ranker_${datasetLabel}`,
      JSON.stringify(updatedItems)
    );

    // Save comparison to localStorage
    const storedComparisons = localStorage.getItem(
      `comparisons_${datasetLabel}`
    );
    const comparisons = storedComparisons ? JSON.parse(storedComparisons) : [];
    comparisons.push(comparisonResult);
    localStorage.setItem(
      `comparisons_${datasetLabel}`,
      JSON.stringify(comparisons)
    );
  }, [currentPair, datasetLabel, setNextComparison, updateProgress]);

  const handleImageError = useCallback(() => {
    alert("Error loading images. Please check if the dataset exists and contains valid images.");
    router.push('/');
  }, [router]);

  const downloadRankings = useCallback(() => {
    if (!ranker || !datasetLabel) return;

    const rankings = ranker.getRankings().map((item, index) => ({
      rank: index + 1,
      id: item.id,
      rating: item.currentRating,
    }));

    const jsonContent = JSON.stringify(rankings, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `rankings_${datasetLabel}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [datasetLabel]);

  const downloadWinLoss = useCallback(() => {
    if (!datasetLabel) return;
    
    const storedComparisons = localStorage.getItem(
      `comparisons_${datasetLabel}`
    );
    if (!storedComparisons) return;

    const comparisons = JSON.parse(storedComparisons);
    const jsonContent = JSON.stringify(comparisons, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `win_loss_${datasetLabel}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [datasetLabel]);

  // Dataset selection effect
  useEffect(() => {
    const selectedDataset = localStorage.getItem('selected_dataset');
    if (!selectedDataset) {
      router.push('/');
      return;
    }
    setDatasetLabel(selectedDataset);
  }, [router]);

  // Initialize ranker effect
  useEffect(() => {
    if (!initializing.current && datasetLabel) {
      initializing.current = true;
      initializeRanker();
    }
  }, [datasetLabel, initializeRanker]);

  // Keyboard controls effect
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!currentPair) return;
      
      switch(e.key) {
        case 'ArrowUp':
          handleComparison('win');
          break;
        case 'ArrowDown':
          handleComparison('loss');
          break;
        case 'ArrowLeft':
          handleComparison('tie');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentPair, handleComparison]);

  if (!datasetLabel) {
    return <div className="flex items-center justify-center h-screen">Loading dataset...</div>;
  }

  if (!ranker || !currentPair) {
    return <div className="flex items-center justify-center h-screen">Initializing comparison...</div>;
  }

  const topImageUrl = `/comparison-images/${datasetLabel}/${currentPair[0]}`;
  const bottomImageUrl = `/comparison-images/${datasetLabel}/${currentPair[1]}`;

  return (
    <ComparisonContainer>
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>How to Compare Images</DialogTitle>
            <DialogDescription className="space-y-4">
              <p>Choose the better image between each pair:</p>
              <ul className="list-disc ml-4 space-y-2">
                <li>Press <kbd className="px-2 py-1 bg-muted rounded">↑</kbd> or click &ldquo;Win&rdquo; under top image</li>
                <li>Press <kbd className="px-2 py-1 bg-muted rounded">↓</kbd> or click &ldquo;Win&rdquo; under bottom image</li>
                <li>Press <kbd className="px-2 py-1 bg-muted rounded">←</kbd> or click &ldquo;Tie&rdquo; for equal quality</li>
              </ul>
              <Button 
                className="w-full mt-4" 
                onClick={() => setShowInstructions(false)}
              >
                Start Comparing
              </Button>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      <TopBar>
        <div className="text-sm font-medium">Comparisons: {comparisons}</div>
        <Popover>
          <PopoverTrigger asChild>
            <div className="flex-1 cursor-pointer">
              <Progress value={progress} className="w-full" />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80">
            <div className="grid gap-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">
                  Adjust Progress Parameters
                </h4>
                <p className="text-sm text-muted-foreground">
                  These parameters affect how progress is calculated.
                </p>
              </div>
              <div className="grid gap-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="ratingChangeThreshold">Rating Change</Label>
                  <Slider
                    id="ratingChangeThreshold"
                    min={10}
                    max={500}
                    step={1}
                    value={[progressParams.ratingChangeThreshold]}
                    onValueChange={([value]) =>
                      setProgressParams((prev) => ({
                        ...prev,
                        ratingChangeThreshold: value,
                      }))
                    }
                    className="col-span-2"
                  />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="stableComparisonsThreshold">Stable Comparisons</Label>
                  <Slider
                    id="stableComparisonsThreshold"
                    min={1}
                    max={12}
                    step={1}
                    value={[progressParams.stableComparisonsThreshold]}
                    onValueChange={([value]) =>
                      setProgressParams((prev) => ({
                        ...prev,
                        stableComparisonsThreshold: value,
                      }))
                    }
                    className="col-span-2"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <Button onClick={downloadRankings}>Download Rankings</Button>
        <Button onClick={downloadWinLoss}>Download Win/Loss</Button>
      </TopBar>

      <MainContent>
        <ComparisonArea>
          <AnimatePresence mode="wait">
            <motion.div
              key={`top-${currentPair[0]}`}
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ duration: 0.3 }}
            >
              <ImageContainer side="top">
                <Zoom>
                  <ImageWrapper>
                    <img
                      src={topImageUrl}
                      alt="Top comparison image"
                        className="max-h-[calc(50vh-60px)] w-auto object-scale-down cursor-zoom-in"
                      onError={handleImageError}
                    />
                  </ImageWrapper>
                </Zoom>
              </ImageContainer>
            </motion.div>
          </AnimatePresence>

          <TieButtonContainer>
            <div className="flex space-x-2">
              <Button onClick={() => handleComparison("win")}>
                Top Wins
              </Button>
              <Button variant="outline" onClick={() => handleComparison("tie")}>
                Tie
              </Button>
              <Button onClick={() => handleComparison("loss")}>
                Bottom Wins
              </Button>
            </div>
          </TieButtonContainer>
          <AnimatePresence mode="wait">
            <motion.div
              key={`down-${currentPair[1]}`}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.3 }}
            >
              <ImageContainer side="bottom">
                <Zoom>
                  <ImageWrapper>
                    <img
                      src={bottomImageUrl}
                      alt="Bottom comparison image"
                        className="max-h-[calc(50vh-60px)] w-auto object-scale-down cursor-zoom-in"
                      onError={handleImageError}
                    />
                  </ImageWrapper>
                </Zoom>
              </ImageContainer>
            </motion.div>
          </AnimatePresence>
        </ComparisonArea>

        <CollapsibleRankingSidebar>
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <h2 className="font-semibold text-lg mb-2">Rankings</h2>
              {ranker.getRankings().map((item, index) => (
                <div key={item.id} className="flex items-center space-x-2">
                  <div className="w-16 h-12 bg-background rounded overflow-hidden">
                    <img
                      src={`/comparison-images/${datasetLabel}/${item.id}`}
                      alt={`Ranked image ${index + 1}`}
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                    />
                  </div>
                  <div>
                    <div className="text-sm font-medium">
                      Rank {index + 1}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Rating: {Math.round(item.currentRating)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
</CollapsibleRankingSidebar>
      </MainContent>
    </ComparisonContainer>
  );
}