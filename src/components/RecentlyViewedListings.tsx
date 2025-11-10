import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getViewHistory, removeFromHistory, clearViewHistory } from '@/lib/viewHistory';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { History, X, Trash2, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Listing } from '@/types/listing';
import { Link } from 'wouter';

export function RecentlyViewed() {
  const [history, setHistory] = useState(getViewHistory());
  const [showAll, setShowAll] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Refresh history when component mounts or when storage changes
  useEffect(() => {
    const handleStorageChange = () => {
      setHistory(getViewHistory());
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for changes
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Fetch listing details for recently viewed items
  const listingIds = history.slice(0, showAll ? 20 : 3).map(item => item.listingId);
  
  const { data: listings = [] } = useQuery<Listing[]>({
    queryKey: ['/api/listings/batch', listingIds],
    queryFn: async () => {
      if (listingIds.length === 0) return [];
      
      // Fetch listings one by one
      const promises = listingIds.map(id => 
        apiRequest('GET', `/api/listings/${id}`).catch(() => null)
      );
      const results = await Promise.all(promises);
      return results.filter((l): l is Listing => l !== null);
    },
    enabled: listingIds.length > 0,
  });

  const handleRemove = (listingId: string) => {
    removeFromHistory(listingId);
    setHistory(getViewHistory());
  };

  const handleClearAll = () => {
    if (confirm('Clear all recently viewed listings?')) {
      clearViewHistory();
      setHistory([]);
    }
  };

  if (history.length === 0) {
    return null;
  }

  const displayCount = showAll ? history.length : Math.min(3, history.length);

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          <History className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Recently Viewed</h2>
          <Badge variant="secondary" className="text-xs">{history.length}</Badge>
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        {!isCollapsed && (
          <div className="flex gap-2">
            {history.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll ? 'Show Less' : `Show All (${history.length})`}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Clear All
            </Button>
          </div>
        )}
      </div>

      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {history.slice(0, displayCount).map((item) => {
            const listing = listings.find(l => l.id === item.listingId);
          
          if (!listing) {
            return (
              <Card key={item.listingId} className="opacity-50">
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">
                    Listing not found
                  </div>
                </CardContent>
              </Card>
            );
          }

          return (
            <Link key={item.listingId} href={`/listing/${item.listingId}`}>
              <Card className="group relative hover:shadow-md transition-shadow cursor-pointer">
                <button
                  onClick={(e) => { e.preventDefault(); handleRemove(item.listingId); }}
                  className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground"
                  title="Remove from history"
                >
                  <X className="w-4 h-4" />
                </button>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-12 h-12 bg-muted rounded-md flex items-center justify-center">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate mb-1">
                        {listing.name}
                      </h3>
                      {listing.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {listing.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(item.viewedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
        </div>
      )}
    </div>
  );
}
