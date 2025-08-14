import UpdateManager from './UpdateManager';

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <UpdateManager />
        </div>
      </div>
    </div>
  );
}
