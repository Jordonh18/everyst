import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Clock, 
  Download, 
  HardDrive, 
  Bell,
  Settings,
  Info
} from 'lucide-react';
import { apiClient } from '@/utils/apiClient';

interface UpdateSettings {
  autoUpdate: boolean;
  updateChannel: 'stable' | 'beta' | 'alpha';
  autoBackup: boolean;
  updateNotifications: boolean;
  updateTime: string;
  maxBackups: number;
  downloadOnly: boolean;
}

export default function UpdateSettings() {
  const [settings, setSettings] = useState<UpdateSettings>({
    autoUpdate: false,
    updateChannel: 'stable',
    autoBackup: true,
    updateNotifications: true,
    updateTime: '02:00',
    maxBackups: 5,
    downloadOnly: false
  });
  
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await apiClient.get('/system/update-settings/');
      if (response.data) {
        setSettings(response.data as UpdateSettings);
      }
    } catch (error) {
      console.error('Failed to load update settings:', error);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await apiClient.post('/system/update-settings/', settings);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save update settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key: keyof UpdateSettings, value: unknown) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const getChannelDescription = (channel: string) => {
    switch (channel) {
      case 'stable':
        return 'Recommended for production use. Only stable, tested releases.';
      case 'beta':
        return 'Pre-release versions with new features. May contain bugs.';
      case 'alpha':
        return 'Cutting-edge versions. Not recommended for production use.';
      default:
        return '';
    }
  };

  const getChannelBadge = (channel: string) => {
    switch (channel) {
      case 'stable':
        return <Badge variant="default">Stable</Badge>;
      case 'beta':
        return <Badge variant="secondary">Beta</Badge>;
      case 'alpha':
        return <Badge variant="destructive">Alpha</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Update Channel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Update Channel
          </CardTitle>
          <CardDescription>
            Choose which type of updates to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="update-channel">Release Channel</Label>
            <div className="flex items-center gap-3">
              <Select
                value={settings.updateChannel}
                onValueChange={(value: 'stable' | 'beta' | 'alpha') => updateSetting('updateChannel', value)}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="beta">Beta</SelectItem>
                  <SelectItem value="alpha">Alpha</SelectItem>
                </SelectContent>
              </Select>
              {getChannelBadge(settings.updateChannel)}
            </div>
            <p className="text-sm text-muted-foreground">
              {getChannelDescription(settings.updateChannel)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Automatic Updates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Automatic Updates
          </CardTitle>
          <CardDescription>
            Configure automatic update behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Automatic Updates</Label>
              <p className="text-sm text-muted-foreground">
                Automatically download and install updates
              </p>
            </div>
            <Switch
              checked={settings.autoUpdate}
              onCheckedChange={(checked) => updateSetting('autoUpdate', checked)}
            />
          </div>

          {settings.autoUpdate && (
            <>
              <Separator />
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Download Only</Label>
                    <p className="text-sm text-muted-foreground">
                      Download updates but require manual installation
                    </p>
                  </div>
                  <Switch
                    checked={settings.downloadOnly}
                    onCheckedChange={(checked) => updateSetting('downloadOnly', checked)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="update-time">Update Time</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <input
                      type="time"
                      id="update-time"
                      value={settings.updateTime}
                      onChange={(e) => updateSetting('updateTime', e.target.value)}
                      className="px-3 py-2 border rounded-md bg-background text-foreground"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Updates will be checked and installed at this time daily
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Backup Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Backup Settings
          </CardTitle>
          <CardDescription>
            Configure backup behavior before updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Automatic Backup</Label>
              <p className="text-sm text-muted-foreground">
                Create backup before applying updates
              </p>
            </div>
            <Switch
              checked={settings.autoBackup}
              onCheckedChange={(checked) => updateSetting('autoBackup', checked)}
            />
          </div>

          {settings.autoBackup && (
            <>
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="max-backups">Maximum Backups</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    id="max-backups"
                    min="1"
                    max="20"
                    value={settings.maxBackups}
                    onChange={(e) => updateSetting('maxBackups', parseInt(e.target.value))}
                    className="w-20 px-3 py-2 border rounded-md bg-background text-foreground"
                  />
                  <span className="text-sm text-muted-foreground">backups to keep</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Older backups will be automatically deleted
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>
            Configure update notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Update Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications when updates are available
              </p>
            </div>
            <Switch
              checked={settings.updateNotifications}
              onCheckedChange={(checked) => updateSetting('updateNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
            <Shield className="h-5 w-5" />
            Security Notice
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3">
            <Info className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5" />
            <div className="text-sm text-orange-800 dark:text-orange-200">
              <p className="mb-2">
                Automatic updates help keep your system secure by applying security patches promptly.
              </p>
              <p>
                For production environments, consider using "Download Only" mode to review updates before installation.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Settings */}
      <div className="flex items-center justify-between">
        <div>
          {lastSaved && (
            <p className="text-sm text-muted-foreground">
              Last saved: {lastSaved.toLocaleString()}
            </p>
          )}
        </div>
        <Button onClick={saveSettings} disabled={isSaving}>
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
