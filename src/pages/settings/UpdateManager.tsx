import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiClient } from '@/utils/apiClient';
import { VersionManager } from '@/utils/versionManager';
import { 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Clock,
  GitBranch,
  ExternalLink,
  Filter
} from 'lucide-react';

interface Release {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  author: {
    login: string;
    avatar_url: string;
  };
  prerelease: boolean;
  draft: boolean;
}

interface UpdateState {
  currentVersion: string;
  latestVersion: string | null;
  updateAvailable: boolean;
  isChecking: boolean;
  isUpdating: boolean;
  updateProgress: number;
  error: string | null;
  lastChecked: Date | null;
  changelog: string | null;
}

function UpdateManager() {
  const [updateState, setUpdateState] = useState<UpdateState>({
    currentVersion: '1.0.0-alpha.2',
    latestVersion: null,
    updateAvailable: false,
    isChecking: false,
    isUpdating: false,
    updateProgress: 0,
    error: null,
    lastChecked: null,
    changelog: null
  });
  
  const [releases, setReleases] = useState<Release[]>([]);
  const [selectedRelease, setSelectedRelease] = useState<Release | null>(null);
  const [showChangelogModal, setShowChangelogModal] = useState(false);
  const [releaseChannel, setReleaseChannel] = useState<'stable' | 'prerelease' | 'all'>('stable');

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    setUpdateState(prev => ({ ...prev, isChecking: true, error: null }));
    
    try {
      const response = await apiClient.get(`/system/updates/check/?channel=${releaseChannel}`);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      const data = response.data as {
        current_version: string;
        latest_version: string | null;
        update_available: boolean;
        releases: Release[];
        changelog: string;
        is_fresh_data: boolean;
      };
      
      setReleases(data.releases || []);
      
      setUpdateState(prev => ({
        ...prev,
        currentVersion: data.current_version,
        latestVersion: data.latest_version,
        updateAvailable: data.update_available,
        lastChecked: new Date(),
        changelog: data.changelog
      }));
      
    } catch (error) {
      setUpdateState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        lastChecked: new Date()
      }));
    } finally {
      setUpdateState(prev => ({ ...prev, isChecking: false }));
    }
  }, [releaseChannel]);

  // Perform update
  const performUpdate = async () => {
    const versionToUpdate = getFilteredLatestVersion();
    if (!versionToUpdate) return;
    
    setUpdateState(prev => ({ ...prev, isUpdating: true, updateProgress: 0, error: null }));
    
    try {
      setUpdateState(prev => ({ ...prev, updateProgress: 10 }));
      
      const response = await apiClient.post('/system/updates/perform/', {
        version: versionToUpdate
      });
      
      const progressInterval = setInterval(() => {
        setUpdateState(prev => ({
          ...prev,
          updateProgress: Math.min(prev.updateProgress + 15, 90)
        }));
      }, 800);
      
      setTimeout(() => clearInterval(progressInterval), 5000);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setUpdateState(prev => ({ ...prev, updateProgress: 100 }));
      
        setTimeout(() => {
        setUpdateState(prev => ({
          ...prev,
          currentVersion: versionToUpdate,
          updateAvailable: false,
          isUpdating: false,
          updateProgress: 0
        }));
      }, 1000);    } catch (error) {
      setUpdateState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Update failed',
        isUpdating: false,
        updateProgress: 0
      }));
    }
  };

  // Check for updates on mount
  useEffect(() => {
    checkForUpdates();
  }, [checkForUpdates]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Filter releases based on selected channel
  const getFilteredReleases = () => {
    if (releaseChannel === 'all') return releases;
    if (releaseChannel === 'stable') return releases.filter(release => !release.prerelease);
    if (releaseChannel === 'prerelease') return releases.filter(release => release.prerelease);
    return releases;
  };

  // Get the appropriate release type badge
  const getReleaseTypeBadge = (release: Release) => {
    const version = release.tag_name.toLowerCase();
    
    if (version.includes('alpha')) {
      return { text: 'Alpha', variant: 'destructive' as const };
    } else if (version.includes('beta')) {
      return { text: 'Beta', variant: 'destructive' as const };
    } else if (version.includes('rc') || version.includes('pre')) {
      return { text: 'Pre-release', variant: 'destructive' as const };
    } else if (release.prerelease) {
      return { text: 'Pre-release', variant: 'destructive' as const };
    }
    
    return null;
  };

  // Parse release body to separate title from content
  const parseReleaseBody = (body: string, title: string) => {
    if (!body) return { preview: '', fullContent: body };
    
    // Split by lines and remove the title if it appears at the start
    const lines = body.split('\n');
    let contentStart = 0;
    
    // Check if the first few lines contain the title (case insensitive)
    const titleLower = title.toLowerCase();
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      if (lines[i].toLowerCase().includes(titleLower.replace(/[^\w\s]/g, '')) || 
          lines[i].toLowerCase().includes('alpha') || 
          lines[i].toLowerCase().includes('beta') ||
          lines[i].toLowerCase().includes('release')) {
        contentStart = i + 1;
        break;
      }
    }
    
    // Skip empty lines after title
    while (contentStart < lines.length && lines[contentStart].trim() === '') {
      contentStart++;
    }
    
    const content = lines.slice(contentStart).join('\n').trim();
    const preview = content.split('\n').slice(0, 2).join(' ').replace(/[#*`]/g, '').slice(0, 150);
    
    return { preview, fullContent: content };
  };

  // Enhanced markdown renderer for the modal
  const renderMarkdown = (markdown: string) => {
    if (!markdown) return '';
    
    return markdown
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mb-3 mt-6 text-foreground">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mb-4 mt-6 text-foreground">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mb-4 mt-6 text-foreground">$1</h1>')
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-foreground">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline">$1</a>')
      // Code blocks
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-muted border rounded-md p-4 text-sm overflow-x-auto my-4"><code class="text-foreground">$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code class="bg-muted px-2 py-1 rounded text-sm font-mono text-foreground">$1</code>')
      // Lists
      .replace(/^\* (.*$)/gm, '<li class="ml-6 mb-1 list-disc">$1</li>')
      .replace(/^- (.*$)/gm, '<li class="ml-6 mb-1 list-disc">$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-6 mb-1 list-decimal">$1</li>')
      // Wrap consecutive list items
      .replace(/(<li.*<\/li>\s*)+/g, '<ul class="mb-4">$&</ul>')
      // Line breaks and paragraphs
      .replace(/\n\n/g, '</p><p class="mb-4 text-muted-foreground">')
      .replace(/\n/g, '<br>')
      // Wrap in initial paragraph
      .replace(/^/, '<p class="mb-4 text-muted-foreground">')
      .replace(/$/, '</p>');
  };

  // Open changelog modal
  const openChangelogModal = (release: Release) => {
    setSelectedRelease(release);
    setShowChangelogModal(true);
  };

  const getUpdateTypeInfo = () => {
    if (!updateState.latestVersion || !updateState.currentVersion) return null;
    
    const updateType = VersionManager.getUpdateType(updateState.currentVersion, updateState.latestVersion);
    if (!updateType) return null;
    
    return VersionManager.getUpdateRecommendation(updateType);
  };

  // Get filtered latest version based on channel preference
  const getFilteredLatestVersion = () => {
    if (releases.length === 0) return null;
    
    const filtered = getFilteredReleases();
    if (filtered.length === 0) return null;
    
    return filtered[0].tag_name.replace(/^v/, '');
  };

  // Check if update is available based on channel preference
  const isUpdateAvailableForChannel = () => {
    const filteredLatest = getFilteredLatestVersion();
    if (!filteredLatest) return false;
    
    const currentClean = updateState.currentVersion.replace(/^v/, '');
    return filteredLatest !== currentClean && 
           VersionManager.compareVersions(filteredLatest, currentClean) > 0;
  };

  // Check if current version exists in releases (unreleased tag functionality)
  const isCurrentVersionReleased = () => {
    const currentVersionClean = updateState.currentVersion.replace(/^v/, '');
    return releases.some(release => release.tag_name.replace(/^v/, '') === currentVersionClean);
  };

  const updateInfo = getUpdateTypeInfo();

  return (
    <div className="space-y-6">
      {/* Main Update Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                System Updates
              </CardTitle>
              <CardDescription>
                Manage application updates and view release information. Choose your preferred update channel below.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={releaseChannel} onValueChange={(value: 'stable' | 'prerelease' | 'all') => setReleaseChannel(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="prerelease">Pre-release</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Current Version:</span>
                <Badge variant="outline">{VersionManager.formatVersion(updateState.currentVersion)}</Badge>
                {!isCurrentVersionReleased() && releases.length > 0 && (
                  <Badge variant="secondary" className="text-xs">Unreleased</Badge>
                )}
              </div>
              {updateState.latestVersion && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Latest {releaseChannel === 'stable' ? 'Stable' : releaseChannel === 'prerelease' ? 'Pre-release' : ''} Version:</span>
                  <Badge variant={isUpdateAvailableForChannel() ? "default" : "secondary"}>
                    {VersionManager.formatVersion(getFilteredLatestVersion() || updateState.latestVersion)}
                  </Badge>
                  {updateInfo && (
                    <Badge variant="outline" className={updateInfo.color}>
                      {updateInfo.priority.toUpperCase()}
                    </Badge>
                  )}
                </div>
              )}
              {updateState.lastChecked && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Last checked: {updateState.lastChecked.toLocaleString()}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => checkForUpdates()}
                disabled={updateState.isChecking || updateState.isUpdating}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${updateState.isChecking ? 'animate-spin' : ''}`} />
                Check Updates
              </Button>
              
              {isUpdateAvailableForChannel() && !updateState.isUpdating && (
                <Button onClick={performUpdate}>
                  <Download className="h-4 w-4 mr-2" />
                  Update Now
                </Button>
              )}
            </div>
          </div>

          {/* Status Messages */}
          {isUpdateAvailableForChannel() && !updateState.isUpdating && updateInfo && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <Download className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {updateInfo.message}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Version {VersionManager.formatVersion(getFilteredLatestVersion()!)} is available in your selected channel
                </p>
              </div>
            </div>
          )}

          {!isUpdateAvailableForChannel() && getFilteredLatestVersion() && !updateState.isChecking && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-800 dark:text-green-200">
                You're up to date with the latest {releaseChannel === 'stable' ? 'stable' : releaseChannel === 'prerelease' ? 'pre-release' : ''} version.
              </span>
            </div>
          )}

          {updateState.error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <div className="flex-1">
                <span className="text-sm text-red-800 dark:text-red-200">
                  {updateState.error}
                </span>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Unable to check for updates. You can still view release information below.
                </p>
              </div>
            </div>
          )}

          {/* Update Progress */}
          {updateState.isUpdating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Updating to {VersionManager.formatVersion(getFilteredLatestVersion()!)}...</span>
                <span>{updateState.updateProgress}%</span>
              </div>
              <Progress value={updateState.updateProgress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                This may take a few minutes. Do not close the application.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* What's New - Latest Updates */}
      {/* What's New - Latest Updates */}
      {releases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              What's New
            </CardTitle>
            <CardDescription>
              See the latest features, improvements, and bug fixes from all releases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {releases.slice(0, 3).map((release, index) => {
                  const isCurrent = updateState.currentVersion.replace(/^v/, '') === release.tag_name.replace(/^v/, '');
                  const isLatest = updateState.latestVersion === release.tag_name.replace(/^v/, '');
                  const releaseType = getReleaseTypeBadge(release);
                  const { preview } = parseReleaseBody(release.body, release.name);
                  
                  return (
                    <div key={release.id} className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant={release.prerelease ? "destructive" : index === 0 ? "default" : "secondary"} className="text-sm">
                              {release.tag_name}
                            </Badge>
                            {isCurrent && <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">You're Here</Badge>}
                            {isLatest && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">Latest Available</Badge>}
                            {releaseType && <Badge variant="outline" className="text-xs">{releaseType.text}</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Released {formatDate(release.published_at)}
                          </p>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={release.html_url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                      
                      {release.body && (
                        <div className="text-sm text-muted-foreground">
                          <p className="line-clamp-3">
                            {preview}
                            {preview.length >= 150 && '...'}
                          </p>
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="h-auto p-0 mt-2 text-xs"
                            onClick={() => openChangelogModal(release)}
                          >
                            Read full changelog
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            
            <div className="text-center pt-4 border-t mt-6">
              <Button variant="outline" size="sm" asChild>
                <a 
                  href="https://github.com/Jordonh18/everyst/releases" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View All Releases on GitHub
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Changelog Modal */}
      <Dialog open={showChangelogModal} onOpenChange={setShowChangelogModal}>
        <DialogContent className="!max-w-5xl w-[85vw] max-h-[80vh] bg-background">
          <DialogHeader className="pb-4">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <GitBranch className="h-5 w-5" />
              {selectedRelease?.tag_name}
            </DialogTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Released {selectedRelease && formatDate(selectedRelease.published_at)}</span>
              <span>•</span>
              <span>by {selectedRelease?.author.login}</span>
            </div>
          </DialogHeader>
          <ScrollArea className="h-[50vh] w-full">
            <div 
              className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed pr-4"
              dangerouslySetInnerHTML={{
                __html: selectedRelease?.body ? renderMarkdown(selectedRelease.body) : ''
              }}
            />
          </ScrollArea>
          <div className="flex justify-end pt-4 border-t mt-4">
            <Button variant="outline" asChild>
              <a 
                href={selectedRelease?.html_url} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View on GitHub
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>



      {/* No releases available */}
      {releases.length === 0 && !updateState.isChecking && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Release Information
            </CardTitle>
            <CardDescription>
              Stay up to date with the latest features and improvements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No Release Information Available</h3>
              <p className="text-muted-foreground mb-6 text-sm">
                We couldn't load the latest release information. This might be due to a temporary network issue.
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" onClick={() => checkForUpdates()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button variant="outline" asChild>
                  <a 
                    href="https://github.com/Jordonh18/everyst/releases" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on GitHub
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default UpdateManager;
