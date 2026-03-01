import React, { useState, useEffect } from "react";
import { portalApi } from "@/components/services/portalApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, LogOut, RefreshCw, ShieldAlert, Clock } from "lucide-react";
import { isClientPortal, isInternalPortal, getInternalPortalUrl, getClientPortalUrl } from "@/components/utils/subdomainHelpers";
import { toast } from "sonner";

export default function PortalGuard({ 
  children, 
  requiredRole = null, 
  portalType = 'client', // 'client' or 'internal'
  allowedRoles = []
}) {
  const [authState, setAuthState] = useState({
    loading: true,
    error: null,
    user: null,
    isAuthenticated: false
  });
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    checkAuth();
  }, [retryCount]);

  const checkAuth = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const isAuth = await portalApi.auth.isAuthenticated();
      
      if (!isAuth) {
        setAuthState({
          loading: false,
          error: 'session_expired',
          user: null,
          isAuthenticated: false
        });
        return;
      }

      const user = await portalApi.auth.me();
      
      if (!user) {
        setAuthState({
          loading: false,
          error: 'session_expired',
          user: null,
          isAuthenticated: false
        });
        return;
      }

      // Check portal type routing
      if (portalType === 'internal' && user.role !== 'admin') {
        setAuthState({
          loading: false,
          error: 'wrong_portal',
          user,
          isAuthenticated: true
        });
        
        // Redirect client to client portal
        setTimeout(() => {
          window.location.href = getClientPortalUrl();
        }, 2000);
        return;
      }

      if (portalType === 'client' && user.role === 'admin' && isInternalPortal()) {
        // Admin accidentally on internal portal, redirect
        setAuthState({
          loading: false,
          error: 'wrong_portal',
          user,
          isAuthenticated: true
        });
        
        setTimeout(() => {
          window.location.href = getInternalPortalUrl();
        }, 2000);
        return;
      }

      // Check role-based access
      if (requiredRole && user.role !== requiredRole) {
        setAuthState({
          loading: false,
          error: 'access_denied',
          user,
          isAuthenticated: true
        });
        return;
      }

      if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        setAuthState({
          loading: false,
          error: 'access_denied',
          user,
          isAuthenticated: true
        });
        return;
      }

      // Success
      setAuthState({
        loading: false,
        error: null,
        user,
        isAuthenticated: true
      });

    } catch (error) {
      console.error('Auth check error:', error);
      
      // Retry on transient errors
      if (retryCount < MAX_RETRIES && (
        error.message?.includes('network') || 
        error.message?.includes('timeout') ||
        error.message?.includes('fetch')
      )) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
        
        setAuthState(prev => ({
          ...prev,
          loading: true,
          error: null
        }));
      } else {
        setAuthState({
          loading: false,
          error: 'auth_error',
          user: null,
          isAuthenticated: false
        });
      }
    }
  };

  const handleLogout = () => {
    portalApi.auth.logout();
  };

  const handleRetry = () => {
    setRetryCount(0);
    checkAuth();
  };

  if (authState.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center">
        <Card className="p-12 text-center border-0 shadow-2xl">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Verifying Authentication</h3>
          {retryCount > 0 && (
            <p className="text-sm text-gray-600">Retry attempt {retryCount} of {MAX_RETRIES}...</p>
          )}
        </Card>
      </div>
    );
  }

  if (authState.error === 'session_expired') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center border-0 shadow-2xl">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Session Expired</h2>
          <p className="text-gray-600 mb-6">
            Your session has expired for security reasons. Please log in again to continue.
          </p>
          <Button
            onClick={() => portalApi.auth.redirectToLogin(window.location.pathname)}
            className="w-full bg-red-600 hover:bg-red-700"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Go to Login
          </Button>
        </Card>
      </div>
    );
  }

  if (authState.error === 'access_denied') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center border-0 shadow-2xl">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-orange-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this area. Please contact your administrator if you believe this is an error.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="flex-1"
            >
              Log Out
            </Button>
            <Button
              onClick={() => window.history.back()}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              Go Back
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (authState.error === 'wrong_portal') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center border-0 shadow-2xl">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-purple-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Wrong Portal</h2>
          <p className="text-gray-600 mb-6">
            You're trying to access the {portalType === 'internal' ? 'internal admin' : 'client'} portal, 
            but you should be using the {portalType === 'internal' ? 'client' : 'internal admin'} portal.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Redirecting you to the correct portal...
          </p>
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
        </Card>
      </div>
    );
  }

  if (authState.error === 'auth_error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center border-0 shadow-2xl">
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Authentication Error</h2>
          <p className="text-gray-600 mb-6">
            We're having trouble verifying your identity. This might be due to network issues or server problems.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={handleRetry}
              variant="outline"
              className="flex-1"
              disabled={retryCount >= MAX_RETRIES}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry {retryCount >= MAX_RETRIES && '(Max reached)'}
            </Button>
            <Button
              onClick={handleLogout}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Log Out
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}