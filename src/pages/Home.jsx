import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronDown, Folder, MessageSquare, BookOpen, Clock, GraduationCap, Link2, Users, BarChart3, Target, Brain, User, LogOut } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useAuth } from '@/lib/AuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export default function Home() {
  const [activeDropdown, setActiveDropdown] = useState(null);
  const { isAuthenticated, user, signOut, isLoadingAuth } = useAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  const products = [
    {
      category: "Project Management",
      icon: <Folder className="w-5 h-5" />,
      items: ["Projects", "Tasks", "Dashboards", "Board View"]
    },
    {
      category: "Communication",
      icon: <MessageSquare className="w-5 h-5" />,
      items: ["Team Chat"]
    },
    {
      category: "Knowledge Base",
      icon: <BookOpen className="w-5 h-5" />,
      items: ["Document Storage", "AI-Powered Search"]
    },
    {
      category: "Time Management",
      icon: <Clock className="w-5 h-5" />,
      items: ["Calendar", "Scheduling", "Time Tracking", "Automations"]
    },
    {
      category: "Learning",
      icon: <GraduationCap className="w-5 h-5" />,
      items: ["Self-Study with AI", "Course Generation"]
    },
    {
      category: "Integrations",
      icon: <Link2 className="w-5 h-5" />,
      items: ["Google Calendar", "Third-party Tools"]
    }
  ];

  const solutions = [
    { name: "Project Management", icon: <Folder className="w-5 h-5" /> },
    { name: "Marketing Teams", icon: <Target className="w-5 h-5" /> },
    { name: "Time & Task Management", icon: <Clock className="w-5 h-5" /> },
    { name: "Self-Study & Education", icon: <GraduationCap className="w-5 h-5" /> },
    { name: "Team Collaboration", icon: <Users className="w-5 h-5" /> }
  ];

  return (
    <div className="min-h-screen">
      {/* Navigation - Glassmorphism style matching the app */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-black/40 backdrop-blur-2xl rounded-full px-8 py-3 flex items-center justify-between border border-white/20 shadow-2xl">
            {/* Logo */}
            <div className="text-2xl font-black tracking-tight text-white">
              LYNCK <span className="text-white/90">SPACE</span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              <Link to={createPageUrl('AboutUs')} className="px-4 py-2 text-white hover:text-white font-medium transition-colors rounded-full hover:bg-white/10">
                About Us
              </Link>
              
              {/* Products Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setActiveDropdown('products')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button className="px-4 py-2 text-white hover:text-white font-medium transition-colors flex items-center gap-1 rounded-full hover:bg-white/10">
                  Products <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'products' ? 'rotate-180' : ''}`} />
                </button>
                
                {activeDropdown === 'products' && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[600px]">
                    <div className="bg-black/50 backdrop-blur-2xl rounded-2xl border border-white/20 p-6 grid grid-cols-2 gap-6 shadow-2xl">
                      {products.map((product, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center gap-2 text-white font-semibold text-sm">
                            {product.icon}
                            {product.category}
                          </div>
                          <ul className="space-y-1 pl-7">
                            {product.items.map((item, i) => (
                              <li key={i} className="text-white/70 text-sm hover:text-white cursor-pointer transition-colors">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Solutions Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setActiveDropdown('solutions')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
                <button className="px-4 py-2 text-white hover:text-white font-medium transition-colors flex items-center gap-1 rounded-full hover:bg-white/10">
                  Solutions <ChevronDown className={`w-4 h-4 transition-transform ${activeDropdown === 'solutions' ? 'rotate-180' : ''}`} />
                </button>
                
                {activeDropdown === 'solutions' && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 w-[280px]">
                    <div className="bg-black/50 backdrop-blur-2xl rounded-2xl border border-white/20 p-4 space-y-1 shadow-2xl">
                      {solutions.map((solution, idx) => (
                        <div key={idx} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 cursor-pointer transition-colors group">
                          <span className="text-white/70 group-hover:text-white transition-colors">{solution.icon}</span>
                          <span className="text-white/90 group-hover:text-white font-medium text-sm transition-colors">{solution.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Auth Buttons / User Menu */}
            <div className="flex items-center gap-3">
              {isLoadingAuth ? (
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                </div>
              ) : isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center border border-white/20 transition-colors">
                      <User className="w-5 h-5 text-white" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-black/90 border-white/10 text-white backdrop-blur-xl">
                    <div className="px-2 py-1.5 text-sm font-medium">{user?.email}</div>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem asChild>
                      <Link to="/Dashboard" className="cursor-pointer">
                        Go to Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/10" />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-400 hover:bg-white/10 cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <>
                  <Link to="/login">
                    <Button variant="ghost" className="text-white hover:text-white hover:bg-white/10 rounded-full">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button className="bg-white/20 hover:bg-white/30 text-white rounded-full px-6 backdrop-blur-sm border border-white/30">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white mb-8" style={{ textShadow: '0 4px 30px rgba(0,0,0,0.3)' }}>
            LYNCK <span className="text-white">SPACE</span>
          </h1>
          
          {/* Hero description card */}
          <div className="max-w-2xl mx-auto mb-12">
            <div className="bg-black/30 backdrop-blur-2xl rounded-2xl p-8 border border-white/20 shadow-2xl">
              <p className="text-white text-xl md:text-2xl font-medium leading-relaxed">
                Your limitless productivity space. Manage projects, time, and tasks in a unified, beautiful environment.
              </p>
            </div>
          </div>
          
          <Link to={isAuthenticated ? "/Dashboard" : "/signup"}>
            <Button
              size="lg"
              className="rounded-full bg-white text-slate-900 hover:bg-white/90 shadow-2xl px-10 py-7 text-xl font-semibold transition-all hover:scale-105"
            >
              {isAuthenticated ? "Go to Dashboard" : "Create My Workspace"} <ArrowRight className="ml-3 w-6 h-6" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              Everything you need to succeed
            </h2>
            <p className="text-white/90 text-lg max-w-2xl mx-auto" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.2)' }}>
              Powerful features designed to streamline your workflow and boost productivity.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Folder className="w-8 h-8" />,
                title: "Project Management",
                description: "Organize projects with boards, lists, and powerful task management tools."
              },
              {
                icon: <Clock className="w-8 h-8" />,
                title: "Time Tracking",
                description: "Track time effortlessly with built-in timers and detailed analytics."
              },
              {
                icon: <Brain className="w-8 h-8" />,
                title: "AI Assistant",
                description: "Meet Jarvis - your AI companion that understands your documents and helps you work smarter."
              },
              {
                icon: <Users className="w-8 h-8" />,
                title: "Team Collaboration",
                description: "Real-time chat, file sharing, and seamless team coordination."
              },
              {
                icon: <GraduationCap className="w-8 h-8" />,
                title: "Learning Tools",
                description: "AI-powered study assistance and course generation for continuous growth."
              },
              {
                icon: <BarChart3 className="w-8 h-8" />,
                title: "Analytics",
                description: "Gain insights with comprehensive dashboards and performance metrics."
              }
            ].map((feature, idx) => (
              <div key={idx} className="bg-black/30 backdrop-blur-2xl p-8 rounded-2xl border border-white/20 hover:bg-black/40 transition-all hover:-translate-y-1 group shadow-xl">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-white mb-6 group-hover:bg-white/30 transition-colors">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-white/80 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-black/30 backdrop-blur-2xl rounded-3xl p-12 md:p-16 border border-white/20 text-center shadow-2xl">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6" style={{ textShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
              Ready to transform your workflow?
            </h2>
            <p className="text-white/90 text-xl mb-10 max-w-2xl mx-auto">
              Join thousands of teams and individuals who have elevated their productivity with Lynck Space.
            </p>
            <Link to={isAuthenticated ? "/Dashboard" : "/signup"}>
              <Button
                size="lg"
                className="rounded-full bg-white text-slate-900 hover:bg-white/90 shadow-2xl px-10 py-7 text-xl font-semibold transition-all hover:scale-105"
              >
                {isAuthenticated ? "Go to Dashboard" : "Get Started Free"} <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <section className="py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <footer className="bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/20 py-12 px-8 shadow-2xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-8">
              <div>
                <div className="text-2xl font-black tracking-tight text-white mb-2">
                  LYNCK <span className="text-white/80">SPACE</span>
                </div>
                <p className="text-white/60 text-sm">
                  Your limitless productivity space.
                </p>
              </div>
              
              <div className="text-center md:text-right">
                <p className="text-white/70 mb-2">
                  Contact: <a href="mailto:info@lynckstudio.de" className="text-white hover:text-white/80 transition-colors">info@lynckstudio.de</a>
                </p>
                <div className="flex items-center gap-4 text-sm text-white/50">
                  <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                  <span>|</span>
                  <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                </div>
              </div>
            </div>
            
            <div className="border-t border-white/10 mt-8 pt-6 text-center text-white/50 text-sm">
              © 2024 Lynck Space. All rights reserved.
            </div>
          </footer>
        </div>
      </section>
      
      {/* Bottom spacing */}
      <div className="h-8" />
    </div>
  );
}