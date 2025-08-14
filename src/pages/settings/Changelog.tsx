import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Edit, 
  AlertTriangle, 
  Trash2, 
  Bug, 
  Shield,
  Calendar,
  User,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useState } from 'react';
import { VersionManager } from '@/utils/versionManager';

interface ChangelogProps {
  releases: Array<{
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
  }>;
  currentVersion: string;
}

export default function Changelog({ releases, currentVersion }: ChangelogProps) {
  const [expandedReleases, setExpandedReleases] = useState<Set<number>>(new Set([releases[0]?.id]));

  const toggleExpanded = (releaseId: number) => {
    const newExpanded = new Set(expandedReleases);
    if (newExpanded.has(releaseId)) {
      newExpanded.delete(releaseId);
    } else {
      newExpanded.add(releaseId);
    }
    setExpandedReleases(newExpanded);
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'added': return <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'changed': return <Edit className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'deprecated': return <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'removed': return <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'fixed': return <Bug className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'security': return <Shield className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
      default: return null;
    }
  };

  const getSectionColor = (type: string) => {
    switch (type) {
      case 'added': return 'text-green-800 dark:text-green-200';
      case 'changed': return 'text-blue-800 dark:text-blue-200';
      case 'deprecated': return 'text-yellow-800 dark:text-yellow-200';
      case 'removed': return 'text-red-800 dark:text-red-200';
      case 'fixed': return 'text-purple-800 dark:text-purple-200';
      case 'security': return 'text-orange-800 dark:text-orange-200';
      default: return 'text-foreground';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getVersionBadgeVariant = (version: string) => {
    const cleanVersion = version.replace(/^v/, '');
    const cleanCurrent = currentVersion.replace(/^v/, '');
    
    if (cleanVersion === cleanCurrent) return 'default';
    
    const updateType = VersionManager.getUpdateType(cleanCurrent, cleanVersion);
    switch (updateType) {
      case 'major': return 'destructive';
      case 'minor': return 'secondary';
      case 'patch': return 'outline';
      default: return 'outline';
    }
  };

  if (!releases || releases.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Changelog</CardTitle>
          <CardDescription>No release information available</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Changelog
        </CardTitle>
        <CardDescription>
          Detailed release notes and version history
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {releases.slice(0, 10).map((release, index) => {
            const isExpanded = expandedReleases.has(release.id);
            const changelog = VersionManager.parseChangelog(release.body);
            const hasChanges = Object.values(changelog).some(items => items.length > 0);

            return (
              <div key={release.id} className="border rounded-lg">
                <div 
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleExpanded(release.id)}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={getVersionBadgeVariant(release.tag_name)}>
                      {VersionManager.formatVersion(release.tag_name)}
                    </Badge>
                    <div>
                      <h3 className="font-medium">{release.name}</h3>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
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
                    {index === 0 && release.tag_name.replace(/^v/, '') === currentVersion.replace(/^v/, '') && (
                      <Badge variant="outline" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={release.html_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4">
                    <Separator className="mb-4" />
                    
                    {hasChanges ? (
                      <div className="space-y-4">
                        {Object.entries(changelog).map(([type, items]) => {
                          if (items.length === 0) return null;
                          
                          return (
                            <div key={type}>
                              <div className="flex items-center gap-2 mb-2">
                                {getSectionIcon(type)}
                                <h4 className={`font-medium capitalize ${getSectionColor(type)}`}>
                                  {type}
                                </h4>
                              </div>
                              <ul className="space-y-1 ml-6">
                                {items.map((item, itemIndex) => (
                                  <li key={itemIndex} className="text-sm text-muted-foreground">
                                    • {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        <div className="whitespace-pre-wrap">
                          {release.body || 'No release notes available.'}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
