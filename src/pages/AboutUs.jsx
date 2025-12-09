import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, User, LogOut } from "lucide-react";
import { createPageUrl } from "@/utils";
import { useAuth } from '@/lib/AuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export default function AboutUs() {
  const { isAuthenticated, user, signOut, isLoadingAuth } = useAuth();

  const handleLogout = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-black/30 backdrop-blur-2xl rounded-full px-8 py-3 flex items-center justify-between border border-white/20">
            <Link to={createPageUrl('Home')} className="text-2xl font-black tracking-tight text-white">
              LYNCK <span className="text-white/80">SPACE</span>
            </Link>
            
            <div className="flex items-center gap-3">
              <Link to={createPageUrl('Home')}>
                <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 rounded-full">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>
              </Link>
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
                <Link to="/login">
                  <Button className="bg-white/20 hover:bg-white/30 text-white rounded-full px-6 backdrop-blur-sm border border-white/20">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-black/30 backdrop-blur-2xl rounded-3xl p-10 border border-white/20 shadow-2xl text-center">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
              WHAT IS LYNCK SPACE
            </h1>
            <p className="text-white/80 text-lg font-light">
              Your limitless productivity space
            </p>
          </div>
        </div>
      </section>

      {/* Content Section */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Main description card */}
          <div className="bg-black/30 backdrop-blur-2xl rounded-2xl p-8 border border-white/20 shadow-xl">
            <p className="text-xl md:text-2xl leading-relaxed font-light text-white mb-6">
              Lynck Space is the all-in-one productivity platform designed for modern teams and individuals who demand more from their tools.
            </p>
            <p className="text-lg leading-relaxed text-white/90">
              We combine project management, time tracking, AI-powered learning, and team collaboration into a single, elegant workspace. Whether you're managing complex projects, studying for exams, or coordinating with your team, Lynck Space adapts to your workflow.
            </p>
          </div>
          
          {/* Jarvis card */}
          <div className="bg-black/30 backdrop-blur-2xl rounded-2xl p-6 border border-white/20 shadow-xl">
            <p className="text-lg leading-relaxed text-white/90">
              Our AI assistant, <span className="font-semibold text-white">Jarvis</span>, acts as your personal productivity companion—understanding your documents, answering questions, and helping you work smarter, not harder.
            </p>
          </div>
          
          {/* Tagline card */}
          <div className="bg-black/30 backdrop-blur-2xl rounded-2xl p-6 border border-white/20 shadow-xl text-center">
            <p className="text-xl font-semibold text-white">
              Built for flexibility. Designed for productivity. Powered by AI.
            </p>
            <div className="mt-6">
              <Link to={createPageUrl('Dashboard')}>
                <Button 
                  size="lg"
                  className="rounded-full bg-white/20 hover:bg-white/30 text-white shadow-xl px-8 py-6 text-lg font-semibold backdrop-blur-sm border border-white/20"
                >
                  Get Started <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black/30 backdrop-blur-2xl border-t border-white/10 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left">
              <div className="text-xl font-black tracking-tight text-white mb-1">
                LYNCK <span className="text-white/70">SPACE</span>
              </div>
              <p className="text-white/50 text-sm">
                Your limitless productivity space.
              </p>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-white/60 text-sm mb-2">
                Contact: <a href="mailto:info@lynckstudio.de" className="text-white/80 hover:text-white transition-colors">info@lynckstudio.de</a>
              </p>
              <div className="flex items-center gap-4 text-sm text-white/40">
                <a href="#" className="hover:text-white/80 transition-colors">Privacy Policy</a>
                <span>|</span>
                <a href="#" className="hover:text-white/80 transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-white/10 mt-8 pt-6 text-center text-white/40 text-sm">
            © 2024 Lynck Space. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}