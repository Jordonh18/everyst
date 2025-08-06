# Climbers User Management

The Climbers module provides comprehensive user management capabilities, allowing you to create, edit, and manage user accounts and their permissions.

## Overview

Climbers is Everyst's user management system, offering role-based access control and detailed user administration in a clean, intuitive interface.

## User Management Interface

The Climbers interface consists of:

1. **User List**: Table of all users with key information
2. **Action Bar**: Controls for adding, editing, and managing users
3. **Filters**: Options to filter and search users
4. **User Details**: Detailed view of selected users

## User Roles

Everyst implements a role-based access control system with the following default roles:

### Owner
- System ownership role (only one per installation)
- Complete access to all system functions
- Ability to transfer ownership

### Administrator
- Full system management
- User administration
- Configuration access
- Cannot modify Owner account

### User
- Standard access to most features
- Limited administration functions
- Cannot access system configuration

### Viewer
- Read-only access to dashboards and data
- No modification capabilities
- Limited tool access

## Managing Users

### Viewing Users

The main Climbers interface displays a table of users with:
- Username
- Full name
- Role
- Status (Active/Inactive)
- Last login

### Adding a New User

1. Click the "Add User" button in the action bar
2. Fill in the user details:
   - Username (required)
   - Email address (required)
   - Password (required)
   - First name
   - Last name
   - Role selection
   - Status (Active/Inactive)
3. Click "Create User"

### Editing a User

1. Select a user from the list
2. Click "Edit" or click directly on the user row
3. Modify user details:
   - Name
   - Email
   - Role
   - Status
4. Click "Save Changes"

### Deactivating a User

1. Select a user from the list
2. Click "Deactivate"
3. Confirm the action
4. The user will be marked as inactive and unable to log in

### Deleting a User

1. Select a user from the list
2. Click "Delete"
3. Confirm the deletion
4. The user will be permanently removed

**Note:** Deletion is permanent and cannot be undone. Consider deactivating users instead of deleting them to preserve historical data.

## Transferring Ownership

The Owner role can be transferred to another user:

1. Select the user who will receive ownership
2. Click "Actions" and select "Transfer Ownership"
3. Enter your password to confirm
4. Confirm the transfer

**Note:** After transferring ownership, your account will be assigned the Administrator role.

## User Roles and Permissions

### Managing Roles

Administrators can view and modify role permissions:

1. Click the "Roles" tab
2. Select a role to view its permissions
3. Toggle permission switches to grant or revoke access
4. Click "Save" to apply changes

### Permission Categories

Permissions are organized into categories:

1. **Dashboard Permissions**
   - View system metrics
   - Access dashboards
   - View server information

2. **Network Permissions**
   - View network map
   - Scan network
   - Manage network devices

3. **Tool Permissions**
   - Use basic tools
   - Use advanced tools
   - Execute system commands

4. **User Management Permissions**
   - View users
   - Add/edit users
   - Manage roles

5. **System Permissions**
   - Configure system settings
   - Manage integrations
   - Access logs

## Bulk Operations

For managing multiple users simultaneously:

### Bulk Selection

1. Check the boxes next to multiple users
2. Use the bulk action dropdown in the action bar
3. Select the desired action:
   - Activate/Deactivate
   - Change role
   - Delete

### Bulk Import

To import multiple users at once:

1. Click the "Import" button
2. Download the template CSV file
3. Fill in user details in the template
4. Upload the completed CSV
5. Review and confirm the import

## User Authentication Options

### Password Management

1. **Reset Password**
   - Select a user
   - Click "Reset Password"
   - A temporary password will be generated
   - The user will be prompted to change it at next login

2. **Password Policy**
   - Access from the "Settings" tab
   - Configure password complexity requirements
   - Set password expiration
   - Configure account lockout settings

### Multi-Factor Authentication

If configured in your Everyst installation:

1. **Enabling MFA**
   - Select a user
   - Click "Enable MFA"
   - Select MFA method
   - Complete setup process

2. **Resetting MFA**
   - Select a user with MFA enabled
   - Click "Reset MFA"
   - Confirm the action

## User Activity and Auditing

### Activity Logs

View user activity:

1. Select a user
2. Click the "Activity" tab
3. View login history, actions, and changes

### Audit Reports

Generate audit reports:

1. Click the "Reports" button in the action bar
2. Select report type:
   - User activity
   - Permission changes
   - Login attempts
3. Set date range
4. Click "Generate Report"
5. Download or view the report

## User Settings and Preferences

### Global Settings

Configure global user settings:

1. Click the "Settings" tab
2. Modify options:
   - Session timeout
   - Default user role
   - Authentication requirements

### User Preferences

Individual users can manage their preferences:

1. Access your own user profile
2. Click "Preferences"
3. Customize options:
   - Interface language
   - Theme
   - Notification preferences

## Troubleshooting

### User Access Issues

If users can't access certain features:

1. Verify their role has the necessary permissions
2. Check if the feature requires additional permissions
3. Ensure the user account is active
4. Review activity logs for access attempts

### Authentication Problems

For login issues:

1. Check if the account is locked due to failed attempts
2. Verify the account is active
3. Reset the user's password if necessary
4. Check MFA configuration if applicable

### Role and Permission Issues

If permissions aren't applying correctly:

1. Logout and back in to refresh permissions
2. Clear browser cache and cookies
3. Verify role configuration
4. Check for permission conflicts
