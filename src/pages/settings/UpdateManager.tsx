import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { apiClient } from '@/utils/apiClient';
import { VersionManager } from '@/utils/versionManager';
import { 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Clock,
  GitBranch,
  Calendar,
  User,
  ExternalLink,
  ChevronDown,
  ChevronUp
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
  const [showChangelog, setShowChangelog] = useState(false);
  const [isDataFromCache, setIsDataFromCache] = useState(false);

  // Check for updates
  const checkForUpdates = useCallback(async (forceRefresh = false) => {
    setUpdateState(prev => ({ ...prev, isChecking: true, error: null }));
    
    try {
      const endpoint = forceRefresh 
        ? '/system/updates/check/?force=true' 
        : '/system/updates/check/';
      const response = await apiClient.get(endpoint);
      
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
      setIsDataFromCache(!data.is_fresh_data);
      
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
  }, []);

  // Perform update
  const performUpdate = async () => {
    if (!updateState.latestVersion) return;
    
    setUpdateState(prev => ({ ...prev, isUpdating: true, updateProgress: 0, error: null }));
    
    try {
      setUpdateState(prev => ({ ...prev, updateProgress: 10 }));
      
      const response = await apiClient.post('/system/updates/perform/', {
        version: updateState.latestVersion
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
          currentVersion: prev.latestVersion!,
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
    checkForUpdates(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getUpdateTypeInfo = () => {
    if (!updateState.latestVersion || !updateState.currentVersion) return null;
    
    const updateType = VersionManager.getUpdateType(updateState.currentVersion, updateState.latestVersion);
    if (!updateType) return null;
    
    return VersionManager.getUpdateRecommendation(updateType);
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
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            System Updates
          </CardTitle>
          <CardDescription>
            Manage application updates and view release information
          </CardDescription>
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
                  <span className="text-sm font-medium">Latest Version:</span>
                  <Badge variant={updateState.updateAvailable ? "default" : "secondary"}>
                    {VersionManager.formatVersion(updateState.latestVersion)}
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
                  {isDataFromCache && (
                    <span className="text-blue-600 dark:text-blue-400" title="Data from cache">
                      (cached)
                    </span>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => checkForUpdates(false)}
                disabled={updateState.isChecking || updateState.isUpdating}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${updateState.isChecking ? 'animate-spin' : ''}`} />
                Check Updates
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => checkForUpdates(true)}
                disabled={updateState.isChecking || updateState.isUpdating}
                title="Force refresh (ignore cache)"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${updateState.isChecking ? 'animate-spin' : ''}`} />
                Force Refresh
              </Button>
              
              {updateState.updateAvailable && !updateState.isUpdating && (
                <Button onClick={performUpdate}>
                  <Download className="h-4 w-4 mr-2" />
                  Update Now
                </Button>
              )}
            </div>
          </div>

          {/* Status Messages */}
          {updateState.updateAvailable && !updateState.isUpdating && updateInfo && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
              <Download className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                  {updateInfo.message}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Version {VersionManager.formatVersion(updateState.latestVersion!)} is available
                </p>
              </div>
            </div>
          )}

          {!updateState.updateAvailable && updateState.latestVersion && !updateState.isChecking && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-800 dark:text-green-200">
                Your application is up to date.
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
                <span>Updating to {VersionManager.formatVersion(updateState.latestVersion!)}...</span>
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

      {/* Changelog */}
      {releases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Changelog
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChangelog(!showChangelog)}
              >
                {showChangelog ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CardTitle>
            <CardDescription>
              Release notes and changes for each version
            </CardDescription>
          </CardHeader>
          {showChangelog && (
            <CardContent>
              <div className="space-y-6 max-h-96 overflow-y-auto">
                {releases.slice(0, 10).map((release) => {
                  const isCurrent = updateState.currentVersion.replace(/^v/, '') === release.tag_name.replace(/^v/, '');
                  const isLatest = updateState.latestVersion === release.tag_name.replace(/^v/, '');
                  
                  return (
                    <div key={release.id} className="border-l-2 border-muted pl-4 pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={release.prerelease ? "destructive" : isLatest ? "default" : "secondary"}>
                          {VersionManager.formatVersion(release.tag_name)}
                        </Badge>
                        <span className="font-semibold">{release.name}</span>
                        {isCurrent && <Badge variant="outline" className="text-xs">Current</Badge>}
                        {isLatest && <Badge variant="outline" className="text-xs">Latest</Badge>}
                        {release.prerelease && <Badge variant="outline" className="text-xs">Pre-release</Badge>}
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {release.author.login}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(release.published_at)}
                        </div>
                        <a 
                          href={release.html_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View on GitHub
                        </a>
                      </div>
                      
                      {release.body && (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <div className="text-sm bg-muted/30 rounded-lg p-4 border whitespace-pre-wrap">
                            {release.body.slice(0, 500)}{release.body.length > 500 ? '...' : ''}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {releases.length > 10 && (
                <div className="text-center pt-4 border-t">
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
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Recent Releases */}
      {releases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Recent Releases
            </CardTitle>
            <CardDescription>
              Latest stable and pre-release versions with quick overview
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {releases.slice(0, 5).map((release, index) => {
                const isLatest = index === 0 && updateState.latestVersion === release.tag_name.replace(/^v/, '');
                const isCurrent = updateState.currentVersion.replace(/^v/, '') === release.tag_name.replace(/^v/, '');
                
                return (
                  <div key={release.id} className="flex flex-col gap-3 p-4 border rounded-lg hover:bg-muted/30 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={release.prerelease ? "destructive" : index === 0 ? "default" : "secondary"}>
                            {VersionManager.formatVersion(release.tag_name)}
                          </Badge>
                          <span className="font-medium">{release.name}</span>
                          {isLatest && <Badge variant="outline" className="text-xs">Latest</Badge>}
                          {isCurrent && <Badge variant="outline" className="text-xs">Current</Badge>}
                          {release.prerelease && <Badge variant="outline" className="text-xs">Pre-release</Badge>}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {release.author.login}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(release.published_at)}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={release.html_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                    
                    {release.body && (
                      <div className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
                        {release.body.split('\n').slice(0, 3).join('\n')}
                        {release.body.split('\n').length > 3 && '...'}
                      </div>
                    )}
                  </div>
                );
              })}
              
              <div className="text-center pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowChangelog(true)}
                  className="w-full"
                >
                  <GitBranch className="h-4 w-4 mr-2" />
                  View Full Changelog
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Always show something - even if API fails */}
      {releases.length === 0 && !updateState.isChecking && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Release Information
            </CardTitle>
            <CardDescription>
              Unable to load release information from GitHub
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Could not fetch release information. This may be due to network issues or API limits.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" onClick={() => checkForUpdates(false)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
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
