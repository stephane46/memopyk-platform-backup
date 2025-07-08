import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Upload, Server, Settings, AlertCircle, CheckCircle, Copy, Clock, History } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DeploymentConfig {
  host: string;
  username: string;
  deployPath: string;
  domain: string;
}

export function DeploymentManagement() {
  const [config, setConfig] = useState<DeploymentConfig>({
    host: '82.29.168.136',
    username: 'root',
    deployPath: '/var/www/memopyk',
    domain: 'new.memopyk.com'
  });
  
  // Production config for memopyk.com
  const [prodConfig, setProdConfig] = useState<DeploymentConfig>({
    host: '82.29.168.136',
    username: 'root',
    deployPath: '/var/www/memopyk-prod',
    domain: 'memopyk.com'
  });
  
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [deploymentProgress, setDeploymentProgress] = useState(0);
  const [showConfig, setShowConfig] = useState(false);
  const [isDeploymentInProgress, setIsDeploymentInProgress] = useState(false);
  const [deploymentStartTime, setDeploymentStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  const { toast } = useToast();

  // Update elapsed time every second during deployment
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isDeploymentInProgress && deploymentStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - deploymentStartTime.getTime()) / 1000));
      }, 1000);
    } else {
      setElapsedTime(0);
    }
    return () => clearInterval(interval);
  }, [isDeploymentInProgress, deploymentStartTime]);

  // Check deployment status on component mount
  const statusQuery = useQuery({
    queryKey: ['/api/deploy/status'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/deploy/status');
      return response.json();
    },
    onSuccess: (data) => {
      setIsDeploymentInProgress(data.inProgress);
    }
  });

  // Get deployment history
  const historyQuery = useQuery({
    queryKey: ['/api/deployment-history'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/deployment-history');
      return response.json();
    }
  });

  const resetDeploymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/deploy/reset');
      return response.json();
    },
    onSuccess: () => {
      setIsDeploymentInProgress(false);
      setDeploymentProgress(0);
      setDeploymentLogs([]);
      toast({
        title: "État de déploiement réinitialisé",
        description: "Vous pouvez maintenant commencer un nouveau déploiement",
      });
    }
  });

  const nginxSetupMutation = useMutation({
    mutationFn: async (nginxConfig: { host: string; username: string; domain: string }) => {
      setDeploymentLogs([]);
      setDeploymentProgress(0);
      
      const response = await fetch('/api/deploy/setup-nginx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nginxConfig),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Nginx setup failed: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n').filter(line => line.trim());
          
          for (const line of lines) {
            try {
              const logData = JSON.parse(line);
              if (logData.type === 'progress') {
                setDeploymentProgress(logData.percentage || 0);
                setDeploymentLogs(prev => [...prev, `PROGRESS: ${logData.message} (${logData.percentage}%)`]);
              } else if (logData.type === 'log') {
                setDeploymentLogs(prev => [...prev, logData.message]);
              } else if (logData.type === 'error') {
                setDeploymentLogs(prev => [...prev, `ERROR: ${logData.message}`]);
                throw new Error(logData.message);
              } else if (logData.type === 'success') {
                setDeploymentLogs(prev => [...prev, `SUCCESS: ${logData.message}`]);
                setDeploymentProgress(100);
              } else if (logData.type === 'warning') {
                setDeploymentLogs(prev => [...prev, `WARNING: ${logData.message}`]);
              }
            } catch (e) {
              setDeploymentLogs(prev => [...prev, line]);
            }
          }
        }
      }
      
      return { success: true };
    },
    onSuccess: () => {
      setIsDeploymentInProgress(false);
      setDeploymentProgress(100);
      
      toast({
        title: "Configuration nginx réussie",
        description: "Le serveur web et SSL ont été configurés avec succès",
      });
      
      statusQuery.refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de configuration nginx",
        description: error.message || "La configuration nginx a échoué. Vérifiez les logs pour plus de détails.",
        variant: "destructive",
      });
      setDeploymentProgress(0);
      setIsDeploymentInProgress(false);
    }
  });

  const deployMutation = useMutation({
    mutationFn: async () => {
      setDeploymentLogs(['🚀 Starting MEMOPYK deployment via Coolify API...']);
      setDeploymentProgress(10);
      
      // Use the established Coolify API deployment process
      const response = await apiRequest('POST', '/api/deploy/coolify');
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Deployment failed');
      }
      
      setDeploymentLogs(prev => [...prev, '✅ Deployment triggered successfully']);
      setDeploymentProgress(25);
      
      // Monitor deployment progress
      setDeploymentLogs(prev => [...prev, '📦 Building application from GitHub repository...']);
      setDeploymentProgress(50);
      
      // Simulate monitoring the deployment status
      const monitorDeployment = async () => {
        let attempts = 0;
        const maxAttempts = 24; // 12 minutes max
        
        while (attempts < maxAttempts) {
          attempts++;
          setDeploymentProgress(50 + (attempts / maxAttempts) * 45);
          
          try {
            // Check if site is responding
            const siteCheck = await fetch('https://new.memopyk.com/api/health', { 
              method: 'HEAD',
              signal: AbortSignal.timeout(5000)
            });
            
            if (siteCheck.ok) {
              setDeploymentLogs(prev => [...prev, '✅ Site is responding - deployment complete']);
              setDeploymentProgress(100);
              return true;
            }
          } catch (error) {
            // Site not ready yet, continue monitoring
          }
          
          if (attempts % 4 === 0) {
            setDeploymentLogs(prev => [...prev, `⏳ Still building... (${attempts * 30}s elapsed)`]);
          }
          
          await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
        }
        
        setDeploymentLogs(prev => [...prev, '⚠️ Deployment taking longer than expected - check Coolify dashboard']);
        return false;
      };
      
      const success = await monitorDeployment();
      
      if (success) {
        setDeploymentLogs(prev => [...prev, '🎉 MEMOPYK platform deployed successfully!']);
        setDeploymentLogs(prev => [...prev, '🔗 Access: https://new.memopyk.com']);
        setDeploymentLogs(prev => [...prev, '🔐 Admin: https://new.memopyk.com/admin']);
      }
      
      return { success };
    },
    onSuccess: () => {
      // Reset deployment state
      setIsDeploymentInProgress(false);
      setDeploymentProgress(100);
      
      toast({
        title: "Déploiement réussi",
        description: "L'application a été déployée avec succès sur votre VPS",
      });
      
      // Refresh deployment status from server
      statusQuery.refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erreur de déploiement",
        description: error.message || "Le déploiement a échoué. Vérifiez les logs pour plus de détails.",
        variant: "destructive",
      });
      setDeploymentProgress(0);
    }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (testConfig: DeploymentConfig) => {
      const response = await apiRequest('POST', '/api/deploy/test', testConfig);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Connexion réussie",
        description: "La connexion au VPS a été établie avec succès",
      });
    },
    onError: () => {
      toast({
        title: "Erreur de connexion",
        description: "Impossible de se connecter au VPS. Vérifiez vos paramètres.",
        variant: "destructive",
      });
    }
  });

  const handleDeploy = () => {
    setDeploymentStartTime(new Date());
    setIsDeploymentInProgress(true);
    deployMutation.mutate();
  };

  const copyLogsToClipboard = () => {
    const logsText = deploymentLogs.join('\n');
    navigator.clipboard.writeText(logsText).then(() => {
      toast({
        title: "Logs copiés",
        description: "Les logs ont été copiés dans le presse-papiers",
      });
    }).catch(() => {
      toast({
        title: "Erreur de copie",
        description: "Impossible de copier les logs",
        variant: "destructive",
      });
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('fr-FR');
  };

  const handleNginxSetup = () => {
    if (!config.host || !config.username || !config.domain) {
      toast({
        title: "Configuration incomplète", 
        description: "Veuillez remplir tous les champs requis pour la configuration nginx",
        variant: "destructive",
      });
      return;
    }
    
    nginxSetupMutation.mutate({
      host: config.host,
      username: config.username,
      domain: config.domain
    });
  };

  const handleTestConnection = () => {
    if (!config.host || !config.username) {
      toast({
        title: "Configuration incomplète",
        description: "Veuillez remplir l'adresse IP et le nom d'utilisateur",
        variant: "destructive",
      });
      return;
    }
    
    testConnectionMutation.mutate(config);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-memopyk-navy">Déploiement VPS</h2>
        <Button
          onClick={() => setShowConfig(!showConfig)}
          variant="outline"
          className="border-memopyk-navy text-memopyk-navy"
        >
          <Settings className="h-4 w-4 mr-2" />
          {showConfig ? 'Masquer la config' : 'Configuration'}
        </Button>
      </div>

      {showConfig && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Configuration du serveur VPS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="host">Adresse IP du VPS *</Label>
                <Input
                  id="host"
                  value={config.host}
                  onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="82.29.168.136"
                  required
                />
              </div>
              <div>
                <Label htmlFor="username">Nom d'utilisateur SSH *</Label>
                <Input
                  id="username"
                  value={config.username}
                  onChange={(e) => setConfig(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="root"
                  required
                />
              </div>
            </div>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="deployPath">Chemin de déploiement</Label>
                <Input
                  id="deployPath"
                  value={config.deployPath}
                  onChange={(e) => setConfig(prev => ({ ...prev, deployPath: e.target.value }))}
                  placeholder="/var/www/memopyk"
                />
              </div>
              <div>
                <Label htmlFor="domain">Domaine</Label>
                <Input
                  id="domain"
                  value={config.domain}
                  onChange={(e) => setConfig(prev => ({ ...prev, domain: e.target.value }))}
                  placeholder="new.memopyk.com"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleTestConnection}
                variant="outline"
                disabled={testConnectionMutation.isPending}
              >
                {testConnectionMutation.isPending ? "Test en cours..." : "Tester la connexion"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Déploiement rapide
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                  Déploiement automatique vers {config.domain || 'new.memopyk.com'}
                </p>
                <p className="text-blue-600 dark:text-blue-300">
                  Cette action va construire l'application, l'envoyer sur votre VPS et redémarrer le service.
                  Assurez-vous que vos clés SSH sont configurées correctement.
                </p>
              </div>
            </div>
          </div>

          {deploymentProgress > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progression du déploiement</span>
                <span>{deploymentProgress}%</span>
              </div>
              <Progress value={deploymentProgress} className="w-full" />
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  setDeploymentStartTime(new Date());
                  setIsDeploymentInProgress(true);
                  deployMutation.mutate();
                }}
                disabled={isDeploymentInProgress || deployMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {deployMutation.isPending || isDeploymentInProgress ? (
                  "Déploiement en cours..."
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Déployer via Coolify API (new.memopyk.com)
                  </>
                )}
              </Button>

              <Button
                onClick={() => window.open('https://new.memopyk.com', '_blank')}
                variant="outline"
                className="border-memopyk-highlight text-memopyk-highlight hover:bg-orange-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Voir le site déployé
              </Button>
            </div>
            
            <Button
              onClick={handleNginxSetup}
              disabled={isDeploymentInProgress || nginxSetupMutation.isPending || !config.host || !config.username || !config.domain}
              variant="outline"
              className="w-full border-green-600 text-green-700 hover:bg-green-50"
            >
              {nginxSetupMutation.isPending || isDeploymentInProgress ? (
                "Configuration nginx en cours..."
              ) : (
                <>
                  <Server className="h-4 w-4 mr-2" />
                  Configurer nginx & SSL
                </>
              )}
            </Button>
            
            {isDeploymentInProgress && (
              <Button
                onClick={() => resetDeploymentMutation.mutate()}
                disabled={resetDeploymentMutation.isPending}
                variant="outline"
                className="w-full"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Réinitialiser le déploiement
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {deploymentLogs.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Logs de déploiement</CardTitle>
              {isDeploymentInProgress && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatDuration(elapsedTime)}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copyLogsToClipboard}
                disabled={deploymentLogs.length === 0}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copier
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeploymentLogs([])}
                disabled={deployMutation.isPending}
              >
                Effacer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div 
              className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto"
              style={{ scrollBehavior: 'smooth' }}
              ref={(el) => {
                if (el) {
                  el.scrollTop = el.scrollHeight;
                }
              }}
            >
              {deploymentLogs.map((log, index) => (
                <div key={index} className="mb-1 flex">
                  <span className="text-gray-500 mr-2 flex-shrink-0">
                    [{new Date().toLocaleTimeString()}]
                  </span>
                  <span className={`
                    ${log.startsWith('ERROR:') ? 'text-red-400' : ''}
                    ${log.startsWith('SUCCESS:') ? 'text-green-400' : ''}
                    ${log.startsWith('WARNING:') ? 'text-yellow-400' : ''}
                  `}>
                    {log}
                  </span>
                </div>
              ))}
              {deployMutation.isPending && (
                <div className="mb-1 flex">
                  <span className="text-gray-500 mr-2">
                    [{new Date().toLocaleTimeString()}]
                  </span>
                  <span className="text-blue-400 animate-pulse">
                    En cours...
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deployment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Historique des déploiements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <div className="text-center py-4 text-muted-foreground">
              Chargement de l'historique...
            </div>
          ) : historyQuery.data?.length > 0 ? (
            <div className="space-y-3">
              {historyQuery.data.slice(0, 5).map((deployment: any) => (
                <div key={deployment.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      deployment.status === 'success' ? 'bg-green-500' :
                      deployment.status === 'failed' ? 'bg-red-500' : 
                      'bg-yellow-500'
                    }`} />
                    <div>
                      <div className="font-medium capitalize">
                        {deployment.type === 'deployment' ? 'Déploiement' : 'Configuration Nginx'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(deployment.startTime)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-medium capitalize ${
                      deployment.status === 'success' ? 'text-green-600' :
                      deployment.status === 'failed' ? 'text-red-600' : 
                      'text-yellow-600'
                    }`}>
                      {deployment.status === 'success' ? 'Réussi' :
                       deployment.status === 'failed' ? 'Échoué' : 'En cours'}
                    </div>
                    {deployment.duration && (
                      <div className="text-sm text-muted-foreground">
                        {formatDuration(deployment.duration)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              Aucun déploiement dans l'historique
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}