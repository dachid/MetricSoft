import React, { useEffect, useState } from 'react';
import { Server, Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';

interface DatabaseStatusProps {
  onStatusChange?: (status: 'connected' | 'disconnected' | 'checking') => void;
}

export const DatabaseStatus: React.FC<DatabaseStatusProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkDatabaseStatus = async () => {
    try {
      setStatus('checking');
      setError(null);
      
      const response = await fetch('/api/health', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (data.success && data.data?.services?.database?.status === 'up') {
        setStatus('connected');
        setError(null);
      } else {
        setStatus('disconnected');
        setError(data.data?.services?.database?.error || 'Database is unavailable');
      }
      
      setLastCheck(new Date());
      onStatusChange?.(status);
    } catch (err) {
      setStatus('disconnected');
      setError('Unable to check database status');
      setLastCheck(new Date());
      onStatusChange?.('disconnected');
    }
  };

  useEffect(() => {
    checkDatabaseStatus();
    
    // Check every 30 seconds
    const interval = setInterval(checkDatabaseStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      case 'checking':
        return <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'checking':
        return 'Checking...';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'disconnected':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'checking':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
      <Server className="h-3 w-3 mr-1" />
      {getStatusIcon()}
      <span className="ml-1">{getStatusText()}</span>
      {lastCheck && (
        <span className="ml-2 text-xs opacity-75">
          {lastCheck.toLocaleTimeString()}
        </span>
      )}
      {error && status === 'disconnected' && (
        <div className="ml-2" title={error}>
          <span className="sr-only">{error}</span>
          <AlertCircle className="h-3 w-3" />
        </div>
      )}
    </div>
  );
};

// Notification banner for database issues
export const DatabaseStatusBanner: React.FC = () => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  const [dismissed, setDismissed] = useState(false);

  if (status === 'connected' || dismissed) {
    return null;
  }

  return (
    <div className={`relative ${
      status === 'disconnected' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200'
    } border-b px-4 py-3`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {status === 'disconnected' ? (
              <WifiOff className="h-5 w-5 text-red-400" />
            ) : (
              <Wifi className="h-5 w-5 text-yellow-400" />
            )}
          </div>
          <div className="ml-3">
            <p className={`text-sm font-medium ${
              status === 'disconnected' ? 'text-red-800' : 'text-yellow-800'
            }`}>
              {status === 'disconnected' ? 
                'Database connection lost. Some features may be unavailable.' :
                'Checking database connection...'
              }
            </p>
            <p className={`text-xs ${
              status === 'disconnected' ? 'text-red-600' : 'text-yellow-600'
            } mt-1`}>
              We're working to restore full functionality. Please try refreshing the page.
            </p>
          </div>
        </div>
        <div className="flex">
          <DatabaseStatus onStatusChange={setStatus} />
          <button
            onClick={() => setDismissed(true)}
            className={`ml-4 text-sm ${
              status === 'disconnected' ? 'text-red-600 hover:text-red-500' : 'text-yellow-600 hover:text-yellow-500'
            }`}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseStatus;
