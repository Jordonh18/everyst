import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { apiClient } from '@/utils/apiClient';
import { 
  Download, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Clock,
  Shield,
  GitBranch,
  Calendar,
  User,
  ExternalLink,
  Info
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

export default function UpdateManager() {
  const [updateState, setUpdateState] = useState<UpdateState>({
    currentVersion: '1.0.0', // This should be read from package.json or environment
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

  // Check for updates
  const checkForUpdates = useCallback(async () => {
    setUpdateState(prev => ({ ...prev, isChecking: true, error: null }));
    
    try {
      const response = await apiClient.get('/system/updates/check/');
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      const data = response.data as {
        current_version: string;
        latest_version: string | null;
        update_available: boolean;
        releases: Release[];
        changelog: string;
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
  }, []);

  // Simulate update process
  const performUpdate = async () => {
    if (!updateState.latestVersion) return;
    
    setUpdateState(prev => ({ ...prev, isUpdating: true, updateProgress: 0, error: null }));
    
    try {
      // Simulate initial progress
      setUpdateState(prev => ({ ...prev, updateProgress: 10 }));
      
      const response = await apiClient.post('/system/updates/perform/', {
        version: updateState.latestVersion
      });
      
      // Simulate progress during request
      const progressInterval = setInterval(() => {
        setUpdateState(prev => ({
          ...prev,
          updateProgress: Math.min(prev.updateProgress + 10, 90)
        }));
      }, 1000);
      
      clearInterval(progressInterval);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      const data = response.data as {
        success: boolean;
        message: string;
        backup_path: string;
        requires_restart: boolean;
      };
      
      // Complete progress
      setUpdateState(prev => ({ ...prev, updateProgress: 100 }));
      
      // Wait a moment then update state
      setTimeout(() => {
        setUpdateState(prev => ({
          ...prev,
          currentVersion: prev.latestVersion!,
          updateAvailable: false,
          isUpdating: false,
          updateProgress: 0
        }));
        
        // Show success message
        if (data.requires_restart) {
          alert('Update completed successfully! The application will need to be restarted to apply changes.');
        } else {
          alert('Update completed successfully!');
        }
      }, 1000);
      
    } catch (error) {
      setUpdateState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Update failed',
        isUpdating: false,
        updateProgress: 0
      }));
    }
  };

  // Check for updates on component mount
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

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            System Updates
          </CardTitle>
          <CardDescription>
            Keep your application up to date with the latest features and security patches
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Current Version:</span>
                <Badge variant="outline">{updateState.currentVersion}</Badge>
              </div>
              {updateState.latestVersion && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Latest Version:</span>
                  <Badge variant={updateState.updateAvailable ? "default" : "secondary"}>
                    {updateState.latestVersion}
                  </Badge>
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
                onClick={checkForUpdates}
                disabled={updateState.isChecking || updateState.isUpdating}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${updateState.isChecking ? 'animate-spin' : ''}`} />
                Check for Updates
              </Button>
              
              {updateState.updateAvailable && !updateState.isUpdating && (
                <Button onClick={performUpdate}>
                  <Download className="h-4 w-4 mr-2" />
                  Update Now
                </Button>
              )}
            </div>
          </div>

          {/* Update Status */}
          {updateState.updateAvailable && !updateState.isUpdating && (
            <Alert>
              <Download className="h-4 w-4" />
              <AlertDescription>
                A new version ({updateState.latestVersion}) is available for download.
              </AlertDescription>
            </Alert>
          )}

          {!updateState.updateAvailable && updateState.latestVersion && !updateState.isChecking && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your application is up to date.
              </AlertDescription>
            </Alert>
          )}

          {updateState.error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {updateState.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Update Progress */}
          {updateState.isUpdating && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Updating to version {updateState.latestVersion}...</span>
                <span>{updateState.updateProgress}%</span>
              </div>
              <Progress value={updateState.updateProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Changelog Card */}
      {updateState.changelog && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Release Notes
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChangelog(!showChangelog)}
              >
                <Info className="h-4 w-4 mr-2" />
                {showChangelog ? 'Hide' : 'Show'} Details
              </Button>
            </CardTitle>
          </CardHeader>
          {showChangelog && (
            <CardContent>
              <div className="h-48 w-full rounded-md border p-4 overflow-y-auto">
                <div className="whitespace-pre-wrap text-sm">
                  {updateState.changelog}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Release History */}
      {releases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Release History
            </CardTitle>
            <CardDescription>
              Recent stable releases
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 overflow-y-auto">
              <div className="space-y-4">
                {releases.slice(0, 5).map((release, index) => (
                  <div key={release.id}>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            {release.tag_name}
                          </Badge>
                          <span className="font-medium">{release.name}</span>
                          {index === 0 && updateState.latestVersion === release.tag_name.replace(/^v/, '') && (
                            <Badge variant="outline" className="text-xs">
                              Latest
                            </Badge>
                          )}
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
                    {index < releases.slice(0, 5).length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Update Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Update Settings
          </CardTitle>
          <CardDescription>
            Configure how updates are handled
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Automatic Updates</div>
                <div className="text-xs text-muted-foreground">
                  Automatically download and install stable updates
                </div>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Pre-release Updates</div>
                <div className="text-xs text-muted-foreground">
                  Include beta and pre-release versions
                </div>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="text-sm font-medium">Backup Before Update</div>
                <div className="text-xs text-muted-foreground">
                  Create automatic backups before applying updates
                </div>
              </div>
              <Button variant="outline" size="sm">
                Configure
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
