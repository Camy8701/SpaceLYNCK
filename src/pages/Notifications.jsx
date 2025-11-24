import React from 'react';
import NotificationCenter from "@/components/notifications/NotificationCenter";

export default function Notifications() {
  return (
    <div className="pb-20">
       <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
       </div>
       {/* We reuse the logic but render it inline instead of in a popover */}
       <NotificationCenter inline={true} />
    </div>
  );
}