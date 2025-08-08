import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui';
import { Activity, Server } from 'lucide-react';
import ApplicationLogsTab from '../../components/log_page/ApplicationLogsTab';
import SystemLogsTab from '../../components/log_page/SystemLogsTab';
import PermissionGate from '../../components/auth/PermissionGate';

const ActivityLogs: React.FC = () => {
  return (
    <div className="container mx-auto p-6">
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
