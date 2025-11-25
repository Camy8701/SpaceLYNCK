import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function AboutUs() {
  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(180deg, #87CEEB 0%, #FFDAB9 50%, #FFA07A 100%)'
    }}>
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
              <Link to={createPageUrl('Dashboard')}>
                <Button className="bg-white/20 hover:bg-white/30 text-white rounded-full px-6 backdrop-blur-sm border border-white/20">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-white drop-shadow-xl mb-6">
            About Lynck Space
          </h1>
          <p className="text-white/80 text-xl font-light">
            Your limitless productivity space
          </p>
        </div>
      </section>

      {/* Content Section */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto space-y-8 text-white">
          <p className="text-xl md:text-2xl leading-relaxed font-light" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
            Lynck Space is the all-in-one productivity platform designed for modern teams and individuals who demand more from their tools.
          </p>
          
          <p className="text-lg leading-relaxed text-white/90" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
            We combine project management, time tracking, AI-powered learning, and team collaboration into a single, elegant workspace. Whether you're managing complex projects, studying for exams, or coordinating with your team, Lynck Space adapts to your workflow.
          </p>
          
          <div className="bg-black/30 backdrop-blur-2xl rounded-2xl p-6 border border-white/20 shadow-xl">
            <p className="text-lg leading-relaxed text-white/90">
              Our AI assistant, <span className="font-semibold text-white">Jarvis</span>, acts as your personal productivity companion—understanding your documents, answering questions, and helping you work smarter, not harder.
            </p>
          </div>
          
          <p className="text-xl font-semibold text-white pt-4" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>
            Built for flexibility. Designed for productivity. Powered by AI.
          </p>

          <div className="mt-12 pt-8 border-t border-white/20">
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