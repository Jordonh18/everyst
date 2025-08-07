import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui';
import { Activity, Server } from 'lucide-react';
import ApplicationLogsTab from '../../components/logs/ApplicationLogsTab';
import SystemLogsTab from '../../components/logs/SystemLogsTab';
import PermissionGate from '../../components/auth/PermissionGate';

const ActivityLogs: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Activity Logs</h1>
        <p className="text-muted-foreground">
          Monitor user activities and system events with advanced filtering and real-time updates.
        </p>
      </div>

      <Tabs defaultValue="application" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="application" className="flex items-center gap-2">
            <Activity size={16} />
            Application Logs
          </TabsTrigger>
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Server size={16} />
            System Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value="application" className="space-y-6">
          <ApplicationLogsTab />
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <PermissionGate permission="canViewLogs">
            <SystemLogsTab />
          </PermissionGate>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ActivityLogs;
