import semver from 'semver';

export interface VersionInfo {
  current: string;
  latest: string | null;
  isUpdateAvailable: boolean;
  updateType: 'major' | 'minor' | 'patch' | null;
  releaseNotes: string;
  publishedAt: string;
  author: string;
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: {
    added: string[];
    changed: string[];
    deprecated: string[];
    removed: string[];
    fixed: string[];
    security: string[];
  };
}

export class VersionManager {
  /**
   * Compare two semantic versions
   */
  static compareVersions(version1: string, version2: string): number {
    return semver.compare(semver.clean(version1) || '0.0.0', semver.clean(version2) || '0.0.0');
  }

  /**
   * Determine update type between two versions
   */
  static getUpdateType(currentVersion: string, latestVersion: string): 'major' | 'minor' | 'patch' | null {
    const current = semver.clean(currentVersion);
    const latest = semver.clean(latestVersion);
    
    if (!current || !latest) return null;
    
    if (semver.major(latest) > semver.major(current)) return 'major';
    if (semver.minor(latest) > semver.minor(current)) return 'minor';
    if (semver.patch(latest) > semver.patch(current)) return 'patch';
    
    return null;
  }

  /**
   * Check if a version is valid semantic version
   */
  static isValidVersion(version: string): boolean {
    return semver.valid(version) !== null;
  }

  /**
   * Parse changelog from GitHub release body
   */
  static parseChangelog(releaseBody: string): ChangelogEntry['changes'] {
    const changes: ChangelogEntry['changes'] = {
      added: [],
      changed: [],
      deprecated: [],
      removed: [],
      fixed: [],
      security: []
    };

    if (!releaseBody) return changes;

    const lines = releaseBody.split('\n');
    let currentSection: keyof ChangelogEntry['changes'] | '' = '';

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Detect section headers
      if (trimmedLine.toLowerCase().includes('### added') || trimmedLine.toLowerCase().includes('## added')) {
        currentSection = 'added';
        continue;
      } else if (trimmedLine.toLowerCase().includes('### changed') || trimmedLine.toLowerCase().includes('## changed')) {
        currentSection = 'changed';
        continue;
      } else if (trimmedLine.toLowerCase().includes('### deprecated') || trimmedLine.toLowerCase().includes('## deprecated')) {
        currentSection = 'deprecated';
        continue;
      } else if (trimmedLine.toLowerCase().includes('### removed') || trimmedLine.toLowerCase().includes('## removed')) {
        currentSection = 'removed';
        continue;
      } else if (trimmedLine.toLowerCase().includes('### fixed') || trimmedLine.toLowerCase().includes('## fixed')) {
        currentSection = 'fixed';
        continue;
      } else if (trimmedLine.toLowerCase().includes('### security') || trimmedLine.toLowerCase().includes('## security')) {
        currentSection = 'security';
        continue;
      }

      // Parse list items
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        const item = trimmedLine.substring(2).trim();
        if (item && currentSection) {
          changes[currentSection].push(item);
        }
      }
    }

    return changes;
  }

  /**
   * Format version for display
   */
  static formatVersion(version: string): string {
    const cleaned = semver.clean(version);
    return cleaned ? `v${cleaned}` : version;
  }

  /**
   * Get version recommendation based on update type
   */
  static getUpdateRecommendation(updateType: 'major' | 'minor' | 'patch'): {
    priority: 'high' | 'medium' | 'low';
    message: string;
    color: string;
  } {
    switch (updateType) {
      case 'major':
        return {
          priority: 'high',
          message: 'Major update available with significant changes',
          color: 'text-orange-600 dark:text-orange-400'
        };
      case 'minor':
        return {
          priority: 'medium',
          message: 'New features and improvements available',
          color: 'text-blue-600 dark:text-blue-400'
        };
      case 'patch':
        return {
          priority: 'low',
          message: 'Bug fixes and security updates available',
          color: 'text-green-600 dark:text-green-400'
        };
    }
  }
}
