import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { HeroVideoManagement } from "@/components/admin/hero-video-management";
import { GalleryManagement } from "@/components/admin/gallery-management";
import { FaqManagement } from "@/components/admin/faq-management";
import { ContactManagement } from "@/components/admin/contact-management";
import { DeploymentManagement } from "@/components/admin/deployment-management";
import { LegalManagement } from "@/components/admin/legal-management";
import { TestsManagement } from "@/components/admin/tests-management";
import { apiRequest } from "@/lib/queryClient";
import { LogIn, LogOut, Video, Images, MessageCircle, Users, Upload, Eye, EyeOff, FileText, TestTube } from "lucide-react";

export default function Admin() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [activeSection, setActiveSection] = useState("videos");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load saved password and remember me preference on component mount
  useEffect(() => {
    const savedPassword = localStorage.getItem('memopyk_admin_password');
    const savedRememberMe = localStorage.getItem('memopyk_admin_remember') === 'true';
    
    if (savedRememberMe && savedPassword) {
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const { data: authStatus, refetch: refetchAuth } = useQuery<{ isAuthenticated: boolean }>({
    queryKey: ['/api/auth/status'],
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 5000 // Check auth status every 5 seconds
  });

  const loginMutation = useMutation({
    mutationFn: async (loginData: { password: string }) => {
      const response = await apiRequest('POST', '/api/auth/login', loginData);
      return await response.json();
    },
    onSuccess: (data) => {
      // Save token to localStorage
      if (data.token) {
        localStorage.setItem('memopyk-admin-token', data.token);
      }
      
      toast({
        title: "Connexion réussie", 
        description: "Bienvenue dans le panel d'administration MEMOPYK",
      });
      
      // Force immediate auth status refresh
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/status'] });
        refetchAuth();
      }, 100);
      
      setPassword("");
    },
    onError: () => {
      toast({
        title: "Erreur de connexion",
        description: "Mot de passe incorrect",
        variant: "destructive",
      });
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('memopyk-admin-token');
      const response = await apiRequest('POST', '/api/auth/logout', {}, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      return await response.json();
    },
    onSuccess: () => {
      // Remove token from localStorage
      localStorage.removeItem('memopyk-admin-token');
      
      toast({
        title: "Déconnexion réussie",
        description: "À bientôt !",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/status'] });
    }
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password) {
      loginMutation.mutate({ password });
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (!authStatus?.isAuthenticated) {
    return (
      <div className="min-h-screen bg-memopyk-cream flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="font-playfair text-3xl font-bold text-memopyk-navy">
              MEMOPYK<sup className="text-xs">™</sup>
            </CardTitle>
            <p className="text-memopyk-blue mt-2">Panel d'administration</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="password" className="text-memopyk-navy font-semibold">
                  Mot de passe
                </Label>
                <div className="relative mt-2">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10 focus:ring-memopyk-sky"
                    placeholder="Entrez le mot de passe admin"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-gray-500" />
                    ) : (
                      <Eye className="h-4 w-4 text-gray-500" />
                    )}
                  </Button>
                </div>
              </div>
              

              
              <Button 
                type="submit" 
                className="w-full bg-memopyk-highlight hover:bg-orange-600"
                disabled={loginMutation.isPending}
              >
                <LogIn className="h-4 w-4 mr-2" />
                {loginMutation.isPending ? 'Connexion...' : 'Se connecter'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const menuItems = [
    { id: "videos", label: "Vidéos Hero", icon: Video },
    { id: "gallery", label: "Galerie", icon: Images },
    { id: "faq", label: "FAQ", icon: MessageCircle },
    { id: "contacts", label: "Contacts", icon: Users },
    { id: "legal", label: "Documents Légaux", icon: FileText },
    { id: "tests", label: "Tests", icon: TestTube },
    { id: "deploy", label: "Déploiement", icon: Upload },
  ];

  const renderActiveContent = () => {
    switch (activeSection) {
      case "videos":
        return <HeroVideoManagement />;
      case "gallery":
        return <GalleryManagement />;
      case "faq":
        return <FaqManagement />;
      case "contacts":
        return <ContactManagement />;
      case "legal":
        return <LegalManagement />;
      case "tests":
        return <TestsManagement />;
      case "deploy":
        return <DeploymentManagement />;
      default:
        return <HeroVideoManagement />;
    }
  };

  return (
    <div className="min-h-screen bg-memopyk-cream flex">
      {/* Vertical Sidebar */}
      <div className="w-64 bg-memopyk-navy text-white flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-memopyk-blue">
          <h1 className="font-playfair text-xl font-bold">
            MEMOPYK<sup className="text-xs">™</sup>
          </h1>
          <p className="text-memopyk-cream text-sm mt-1">Panel d'administration</p>
        </div>
        
        {/* Navigation Menu */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors
                      ${
                        activeSection === item.id
                          ? "bg-memopyk-highlight text-white"
                          : "text-memopyk-cream hover:bg-memopyk-blue hover:text-white"
                      }
                    `}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        
        {/* Logout Button */}
        <div className="p-4 border-t border-memopyk-blue">
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-white text-white hover:bg-white hover:text-memopyk-navy"
            disabled={logoutMutation.isPending}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Content Header */}
        <div className="bg-white border-b p-6">
          <h2 className="text-2xl font-bold text-memopyk-navy">
            {menuItems.find(item => item.id === activeSection)?.label}
          </h2>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-6 overflow-auto">
          {renderActiveContent()}
        </div>
      </div>
    </div>
  );
}
