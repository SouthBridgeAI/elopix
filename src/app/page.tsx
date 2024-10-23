
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function Home() {
  const router = useRouter();
  const [datasets, setDatasets] = useState<string[]>([]);
  const [showInstructions, setShowInstructions] = useState(true);

  useEffect(() => {
    fetch('/datasets')
      .then(res => res.json())
      .then(data => setDatasets(data.datasets))
      .catch(() => setDatasets([]));
  }, []);

  const handleDatasetSelect = (dataset: string) => {
    localStorage.setItem('selected_dataset', dataset);
    router.push('/rate');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
      {/* Welcome Dialog */}
      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Welcome to Image Comparison</DialogTitle>
            <DialogDescription className="space-y-4">
                <div>Before starting, please ensure you have:</div>
                <ol className="list-decimal ml-4 space-y-2">
                    <li>Created a folder with your dataset name in: <br/>
                    <code className="bg-muted p-1 rounded text-sm">
                        /public/comparison-images/your_dataset_name/
                    </code>
                    </li>
                    <li>Placed all your images (.png, .jpg, etc.) in this folder</li>
                </ol>
                <Button 
                    className="w-full mt-4" 
                    onClick={() => setShowInstructions(false)}
                >
                    I understand
                </Button>
                </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-center mb-8">Pick a Dataset!</h1>
        
        {datasets.length === 0 ? (
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">No datasets found.</p>
            <p className="text-sm">
              Please add your images to:<br/>
              <code className="bg-muted p-2 rounded block mt-2">
                /public/comparison-images/your_dataset_name/
              </code>
            </p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Refresh
            </Button>
          </div>
        ) : (
          <ScrollArea className="h-[400px] border rounded-lg p-4">
            <div className="space-y-2">
              {datasets.map((dataset) => (
                <Button
                  key={dataset}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => handleDatasetSelect(dataset)}
                >
                  {dataset}
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}