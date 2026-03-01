import React, { useEffect, useState } from "react";
import { portalApi } from "@/components/services/portalApi";
import { createPageUrl } from "@/utils";
import { getInternalPortalUrl, getClientPortalUrl } from "@/components/utils/subdomainHelpers";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const isAuth = await portalApi.auth.isAuthenticated();
        
        if (isAuth) {
          const user = await portalApi.auth.me();
          
          // Notify admins of new user signup (if this is first login)
          const params = new URLSearchParams(window.location.search);
          if (params.get('message') === 'complete_registration') {
            try {
              const adminUsers = await portalApi.entities.User.filter({ role: 'admin' });
              for (const admin of adminUsers) {
                await portalApi.entities.Notification.create({
                  recipient_email: admin.email,
                  type: 'user_signup',
                  title: 'New User Registered',
                  message: `${user.full_name} (${user.email}) just completed their registration`,
                  link: `/UserManagement`,
                  priority: 'normal',
                  read: false,
                  metadata: { user_email: user.email, user_role: user.role }
                });
              }
            } catch (notifError) {
              console.error("Error creating notifications:", notifError);
            }
          }
          
          // Redirect based on role
          if (user.role === 'admin' || user.role === 'user') {
            window.location.href = getInternalPortalUrl(createPageUrl("InternalDashboard"));
          } else {
            window.location.href = getClientPortalUrl(createPageUrl("ClientPortal"));
          }
        } else {
          portalApi.auth.redirectToLogin(window.location.href);
        }
      } catch (error) {
        console.error("Auth error:", error);
        portalApi.auth.redirectToLogin(window.location.href);
      } finally {
        setChecking(false);
      }
    };

    checkAuth();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return null;
}