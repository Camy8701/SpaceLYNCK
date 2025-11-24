import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, Globe, Layout, Users } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="space-y-24 pb-20">
      
      {/* Hero Section */}
      <section className="text-center py-24 relative">
         <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent pointer-events-none" />
         <h1 className="text-7xl md:text-9xl font-black tracking-tighter text-white drop-shadow-xl mb-6">
             LYNCK <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-100 to-white" style={{textShadow: '0 0 30px rgba(255,255,255,0.5)'}}>SPACE</span>
         </h1>
         <p className="text-white/90 text-xl font-light max-w-2xl mx-auto leading-relaxed drop-shadow-md mb-8">
             Your limitless productivity space. Manage projects, time, and tasks in a unified, beautiful environment.
         </p>
         <div className="flex justify-center">
            <Button 
                size="lg"
                className="rounded-full bg-white text-blue-900 hover:bg-blue-50 shadow-xl px-8 text-lg font-semibold"
                onClick={() => navigate('/Dashboard')}
            >
                Create My Workspace <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
         </div>
      </section>

      {/* Info Cards Section */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl hover:bg-white/20 transition-all shadow-lg group">
                <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-white">
                    <Zap className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Lightning Fast</h3>
                <p className="text-white/70 leading-relaxed">
                    Experience productivity at the speed of thought. Instant updates, real-time collaboration, and seamless transitions.
                </p>
            </div>

            {/* Card 2 */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl hover:bg-white/20 transition-all shadow-lg group">
                <div className="w-14 h-14 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-white">
                    <Layout className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Unified Workspace</h3>
                <p className="text-white/70 leading-relaxed">
                    Everything you need in one place. From task management to time tracking, keep your workflow focused and clutter-free.
                </p>
            </div>

            {/* Card 3 */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl hover:bg-white/20 transition-all shadow-lg group">
                <div className="w-14 h-14 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform text-white">
                    <Shield className="w-7 h-7" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Secure & Reliable</h3>
                <p className="text-white/70 leading-relaxed">
                    Your data is safe with us. Enterprise-grade security ensures your projects and ideas remain private and protected.
                </p>
            </div>
        </div>
      </section>

      {/* Additional Info Section */}
      <section className="max-w-5xl mx-auto px-4 text-center">
          <div className="bg-black/20 backdrop-blur-lg rounded-[3rem] p-12 border border-white/10">
              <h2 className="text-4xl font-bold text-white mb-6">Ready to elevate your workflow?</h2>
              <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
                  Join thousands of creators and teams who have transformed their productivity with LYNCK SPACE.
              </p>
              <div className="flex flex-wrap justify-center gap-8 text-white/60">
                  <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5" /> <span>Global Access</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <Users className="w-5 h-5" /> <span>Team Collaboration</span>
                  </div>
                  <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5" /> <span>Secure Data</span>
                  </div>
              </div>
          </div>
      </section>

    </div>
  );
}