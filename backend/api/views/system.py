"""
System-related views for the everyst API.
"""
import json
import os
import subprocess
import tempfile
import zipfile
from pathlib import Path

import requests
from django.conf import settings
from django.http import JsonResponse
from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from api.models.system import SystemMetrics, Alert, SecurityStatus
from api.serializers.system import SystemMetricsSerializer, AlertSerializer, SecurityStatusSerializer
from api.utils import get_system_metrics


class SystemMetricsViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for system metrics
    """
    queryset = SystemMetrics.objects.all().order_by('-timestamp')
    serializer_class = SystemMetricsSerializer
    permission_classes = [IsAuthenticated]


class AlertViewSet(viewsets.ModelViewSet):
    """
    API endpoint for system alerts
    """
    queryset = Alert.objects.all().order_by('-timestamp')
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]


class SecurityStatusViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for security status
    """
    queryset = SecurityStatus.objects.all().order_by('-timestamp')
    serializer_class = SecurityStatusSerializer
    permission_classes = [IsAuthenticated]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_current_metrics(request):
    """
    Get the current system metrics
    """
    metrics = get_system_metrics()
    return Response(metrics)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_updates(request):
    """
    Check for available updates from GitHub releases
    """
    try:
        # Get current version from package.json
        package_json_path = os.path.join(settings.BASE_DIR, '..', 'package.json')
        current_version = "1.0.0"  # Default fallback
        
        if os.path.exists(package_json_path):
            with open(package_json_path, 'r') as f:
                package_data = json.load(f)
                current_version = package_data.get('version', '1.0.0')
        
        # Fetch releases from GitHub
        response = requests.get(
            'https://api.github.com/repos/Jordonh18/everyst/releases',
            timeout=10
        )
        response.raise_for_status()
        
        releases = response.json()
        
        # Filter stable releases
        stable_releases = [
            release for release in releases 
            if not release.get('prerelease', False) and not release.get('draft', False)
        ]
        
        if not stable_releases:
            return Response({
                'current_version': current_version,
                'latest_version': None,
                'update_available': False,
                'releases': []
            })
        
        latest_release = stable_releases[0]
        latest_version = latest_release['tag_name'].lstrip('v')
        
        # Simple version comparison
        def version_compare(v1, v2):
            v1_parts = [int(x) for x in v1.split('.')]
            v2_parts = [int(x) for x in v2.split('.')]
            
            # Pad with zeros
            max_len = max(len(v1_parts), len(v2_parts))
            v1_parts += [0] * (max_len - len(v1_parts))
            v2_parts += [0] * (max_len - len(v2_parts))
            
            for i in range(max_len):
                if v1_parts[i] > v2_parts[i]:
                    return 1
                elif v1_parts[i] < v2_parts[i]:
                    return -1
            return 0
        
        update_available = version_compare(latest_version.lstrip('v'), current_version.lstrip('v')) > 0
        
        return Response({
            'current_version': current_version,
            'latest_version': latest_version,
            'update_available': update_available,
            'releases': stable_releases[:5],  # Return top 5 releases
            'changelog': latest_release.get('body', ''),
        })
        
    except requests.RequestException as e:
        return Response(
            {'error': f'Failed to check for updates: {str(e)}'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except Exception as e:
        return Response(
            {'error': f'Unexpected error: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def perform_update(request):
    """
    Perform system update (download and apply)
    """
    try:
        target_version = request.data.get('version')
        if not target_version:
            return Response(
                {'error': 'Target version is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user has admin permissions
        if not request.user.is_superuser:
            return Response(
                {'error': 'Admin privileges required for updates'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get current version from package.json
        package_json_path = os.path.join(settings.BASE_DIR, '..', 'package.json')
        current_version = "1.0.0"  # Default fallback
        
        if os.path.exists(package_json_path):
            with open(package_json_path, 'r') as f:
                package_data = json.load(f)
                current_version = package_data.get('version', '1.0.0')
        
        # Get the release info
        response = requests.get(
            f'https://api.github.com/repos/Jordonh18/everyst/releases/tags/v{target_version}',
            timeout=10
        )
        response.raise_for_status()
        
        release_data = response.json()
        
        # Find the source code zipball
        zipball_url = release_data.get('zipball_url')
        if not zipball_url:
            return Response(
                {'error': 'No downloadable assets found for this release'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create backup directory
        backup_dir = os.path.join(settings.BASE_DIR, '..', 'backups')
        os.makedirs(backup_dir, exist_ok=True)
        
        backup_path = os.path.join(backup_dir, f'backup_{current_version}_{int(time.time())}.tar.gz')
        
        # Create backup (simplified - in production you'd want more robust backup)
        import shutil
        import time
        
        project_root = os.path.join(settings.BASE_DIR, '..')
        
        # Create a tar.gz backup
        subprocess.run([
            'tar', '-czf', backup_path,
            '--exclude=node_modules',
            '--exclude=venv',
            '--exclude=__pycache__',
            '--exclude=.git',
            '-C', os.path.dirname(project_root),
            os.path.basename(project_root)
        ], check=True)
        
        # Download the update
        with tempfile.NamedTemporaryFile(suffix='.zip', delete=False) as tmp_file:
            update_response = requests.get(zipball_url, timeout=300, stream=True)
            update_response.raise_for_status()
            
            for chunk in update_response.iter_content(chunk_size=8192):
                tmp_file.write(chunk)
            
            tmp_file_path = tmp_file.name
        
        # Extract and apply update (simplified)
        with tempfile.TemporaryDirectory() as extract_dir:
            with zipfile.ZipFile(tmp_file_path, 'r') as zip_ref:
                zip_ref.extractall(extract_dir)
            
            # Find the extracted directory (GitHub creates a directory with random suffix)
            extracted_dirs = [d for d in os.listdir(extract_dir) if os.path.isdir(os.path.join(extract_dir, d))]
            if not extracted_dirs:
                raise Exception("No extracted directory found")
            
            source_dir = os.path.join(extract_dir, extracted_dirs[0])
            
            # Copy updated files (excluding certain directories)
            exclude_dirs = {'node_modules', 'venv', '__pycache__', '.git', 'backups', 'media'}
            
            for item in os.listdir(source_dir):
                if item not in exclude_dirs:
                    source_path = os.path.join(source_dir, item)
                    dest_path = os.path.join(project_root, item)
                    
                    if os.path.isfile(source_path):
                        shutil.copy2(source_path, dest_path)
                    elif os.path.isdir(source_path):
                        if os.path.exists(dest_path):
                            shutil.rmtree(dest_path)
                        shutil.copytree(source_path, dest_path)
        
        # Clean up
        os.unlink(tmp_file_path)
        
        # Update package.json version
        package_json_path = os.path.join(settings.BASE_DIR, '..', 'package.json')
        if os.path.exists(package_json_path):
            with open(package_json_path, 'r') as f:
                package_data = json.load(f)
            
            package_data['version'] = target_version
            
            with open(package_json_path, 'w') as f:
                json.dump(package_data, f, indent=2)
        
        return Response({
            'success': True,
            'message': f'Successfully updated to version {target_version}',
            'backup_path': backup_path,
            'requires_restart': True
        })
        
    except requests.RequestException as e:
        return Response(
            {'error': f'Failed to download update: {str(e)}'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    except subprocess.CalledProcessError as e:
        return Response(
            {'error': f'Backup creation failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        return Response(
            {'error': f'Update failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rollback_update(request):
    """
    Rollback to a previous version using backup
    """
    try:
        backup_path = request.data.get('backup_path')
        if not backup_path or not os.path.exists(backup_path):
            return Response(
                {'error': 'Valid backup path is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user has admin permissions
        if not request.user.is_superuser:
            return Response(
                {'error': 'Admin privileges required for rollback'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        project_root = os.path.join(settings.BASE_DIR, '..')
        
        # Extract backup
        subprocess.run([
            'tar', '-xzf', backup_path, '-C', os.path.dirname(project_root)
        ], check=True)
        
        return Response({
            'success': True,
            'message': 'Successfully rolled back to previous version',
            'requires_restart': True
        })
        
    except subprocess.CalledProcessError as e:
        return Response(
            {'error': f'Rollback failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    except Exception as e:
        return Response(
            {'error': f'Rollback failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
